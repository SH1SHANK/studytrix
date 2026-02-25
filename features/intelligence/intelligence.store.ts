"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";

import {
  buildIntelligenceSnapshotKey,
  getIntelligenceClient,
} from "./intelligence.client";
import { collectAllEntities, collectFolderRecursive } from "./intelligence.collector";
import {
  clearAllEmbeddings,
  clearIntelligenceSnapshots,
  getIntelligenceSnapshotSizeBytes,
} from "./intelligence.db";
import {
  INTELLIGENCE_SETTINGS_IDS,
  DEFAULT_MODEL_ID,
} from "./intelligence.constants";
import type {
  IndexableEntity,
  IntelligenceSearchHit,
  IntelligenceWorkerEventMessage,
  SearchScope,
} from "./intelligence.types";
import type { CustomFolder } from "@/features/custom-folders/custom-folders.types";
import type { CachedIndexableFileMessage, SwFilesCachedMessage } from "./intelligence.sw.types";
import { useSettingsStore } from "@/features/settings/settings.store";

export type IntelligenceRuntimeStatus = "idle" | "loading" | "indexing" | "ready" | "error";
export type IntelligenceTransientStatus = "cancelled" | "complete" | null;

interface IndexProgressState {
  processed: number;
  total: number;
  currentFileName: string;
}

interface RepoCounts {
  globalCount: number;
  personalCount: number;
  folderCount: number;
}

interface IntelligenceState {
  enabled: boolean;
  runtimeStatus: IntelligenceRuntimeStatus;
  indexing: boolean;
  indexProgress: IndexProgressState | null;
  retryCount: number;
  indexedDocs: number;
  indexSize: number;
  lastIndexedAt: number | null;
  indexLastCompletedAt: number | null;
  indexGlobalCount: number;
  indexPersonalCount: number;
  indexFolderCount: number;
  activeModelId: string | null;
  modelDownloaded: boolean;
  downloadProgress: { loaded: number; total: number } | null;
  lastError: string | null;
  transientStatus: IntelligenceTransientStatus;
  transientStatusCount: number;
  showExperimentalNoticeSession: boolean;
  activeSnapshotKey: string | null;
  indexedEntries: IndexableEntity[];
  setEnabled: (enabled: boolean) => void;
  setRuntimeStatus: (status: IntelligenceRuntimeStatus, error?: string | null) => void;
  setModelDownloaded: (downloaded: boolean) => void;
  dismissExperimentalNoticeSession: () => void;
  deactivateRuntime: () => Promise<void>;
  initialize: (params: {
    modelId?: string;
    snapshotKey: string;
    files?: IndexableEntity[];
    customFolders?: CustomFolder[];
    signature?: string;
  }) => Promise<void>;
  queryScopedSemantic: (params: {
    query: string;
    limit: number;
    scope: SearchScope;
  }) => Promise<{
    primary: IntelligenceSearchHit[];
    crossRepo: IntelligenceSearchHit[];
    crossRepoAbovePrimary: boolean;
  }>;
  indexIncrementalFiles: (files: IndexableEntity[]) => Promise<void>;
  indexFolderSubtree: (
    folderId: string,
    options: {
      repoKind: "global" | "personal";
      folderName?: string;
      customFolderId?: string;
      snapshotKey?: string;
    },
  ) => Promise<void>;
  cancelDownload: () => void;
  cancelIndexing: () => Promise<void>;
  getIndexSizeBytes: () => Promise<number>;
  clearIntelligenceCache: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  enabled: false,
  runtimeStatus: "idle" as IntelligenceRuntimeStatus,
  indexing: false,
  indexProgress: null,
  retryCount: 0,
  indexedDocs: 0,
  indexSize: 0,
  lastIndexedAt: null,
  indexLastCompletedAt: null,
  indexGlobalCount: 0,
  indexPersonalCount: 0,
  indexFolderCount: 0,
  activeModelId: null,
  modelDownloaded: false,
  downloadProgress: null,
  lastError: null,
  transientStatus: null as IntelligenceTransientStatus,
  transientStatusCount: 0,
  showExperimentalNoticeSession: false,
  activeSnapshotKey: null,
  indexedEntries: [] as IndexableEntity[],
};

const INDEX_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const CROSS_REPO_MIN_SCORE = 0.72;
const CROSS_REPO_MAX_RESULTS = 3;
const CROSS_REPO_NAME_SIMILARITY_THRESHOLD = 0.75;
const TRANSIENT_CANCELLED_MS = 3000;
const TRANSIENT_COMPLETE_MS = 4000;

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildCorpusSignature(files: IndexableEntity[]): string {
  const normalized = [...files]
    .filter((file) => file.fileId.trim().length > 0)
    .sort((left, right) => left.fileId.localeCompare(right.fileId))
    .map((file) => [
      file.fileId.trim(),
      file.name.trim(),
      file.fullPath.trim(),
      file.mimeType?.trim() ?? "",
      file.repoKind,
      file.isFolder ? "folder" : "file",
      file.ancestorIds.join(">"),
      file.customFolderId?.trim() ?? "",
      typeof file.size === "number" && Number.isFinite(file.size) ? String(file.size) : "",
      file.modifiedTime?.trim() ?? "",
    ].join("|"));

  return `corpus-v1:${fnv1aHash(normalized.join("||"))}`;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function diceCoefficient(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const gram = left.slice(index, index + 2);
    leftBigrams.set(gram, (leftBigrams.get(gram) ?? 0) + 1);
  }

  let matches = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const gram = right.slice(index, index + 2);
    const count = leftBigrams.get(gram) ?? 0;
    if (count <= 0) {
      continue;
    }
    leftBigrams.set(gram, count - 1);
    matches += 1;
  }

  return (2 * matches) / ((left.length - 1) + (right.length - 1));
}

function isNameDuplicate(left: string, right: string): boolean {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight
    || diceCoefficient(normalizedLeft, normalizedRight) >= CROSS_REPO_NAME_SIMILARITY_THRESHOLD;
}

function toIndexableEntityFromCachedFile(file: CachedIndexableFileMessage): IndexableEntity {
  return {
    fileId: file.fileId,
    name: file.name,
    fullPath: file.fullPath,
    ancestorIds: [...file.ancestorIds],
    depth: file.depth,
    repoKind: file.repoKind,
    isFolder: false,
    mimeType: file.mimeType,
    size: file.size,
    modifiedTime: file.modifiedTime,
    customFolderId: file.customFolderId,
  };
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function resolveRepoCounts(files: IndexableEntity[]): RepoCounts {
  let globalCount = 0;
  let personalCount = 0;
  let folderCount = 0;

  for (const file of files) {
    if (file.repoKind === "global") {
      globalCount += 1;
    } else if (file.repoKind === "personal") {
      personalCount += 1;
    }

    if (file.isFolder) {
      folderCount += 1;
    }
  }

  return {
    globalCount,
    personalCount,
    folderCount,
  };
}

function mergeIndexedEntries(
  current: IndexableEntity[],
  incoming: IndexableEntity[],
): IndexableEntity[] {
  const merged = new Map<string, IndexableEntity>();
  for (const entry of current) {
    merged.set(entry.fileId, entry);
  }
  for (const entry of incoming) {
    merged.set(entry.fileId, entry);
  }
  return Array.from(merged.values());
}

let workerBridgeBound = false;
let serviceWorkerBridgeBound = false;
let settingsBridgeBound = false;
let beforeUnloadBound = false;
let initializePromise: Promise<void> | null = null;
let settingsUnsubscribe: (() => void) | null = null;
let transientTimerId: number | null = null;

function clearTransientTimer(): void {
  if (transientTimerId !== null) {
    window.clearTimeout(transientTimerId);
    transientTimerId = null;
  }
}

function scheduleTransientStatus(status: IntelligenceTransientStatus, total: number): void {
  if (typeof window === "undefined") {
    return;
  }

  clearTransientTimer();

  useIntelligenceStore.setState({
    transientStatus: status,
    transientStatusCount: total,
  });

  if (status === "cancelled") {
    transientTimerId = window.setTimeout(() => {
      useIntelligenceStore.setState((state) => state.transientStatus === "cancelled"
        ? { transientStatus: null, transientStatusCount: 0 }
        : {});
      transientTimerId = null;
    }, TRANSIENT_CANCELLED_MS);
    return;
  }

  if (status === "complete") {
    transientTimerId = window.setTimeout(() => {
      useIntelligenceStore.setState((state) => state.transientStatus === "complete"
        ? { transientStatus: null, transientStatusCount: 0 }
        : {});
      transientTimerId = null;
    }, TRANSIENT_COMPLETE_MS);
  }
}

function bindWorkerBridge(): void {
  if (workerBridgeBound) {
    return;
  }

  workerBridgeBound = true;

  const client = getIntelligenceClient();
  client.subscribeEvents((message: IntelligenceWorkerEventMessage) => {
    if (message.type === "MODEL_DOWNLOAD_PROGRESS") {
      useIntelligenceStore.setState((state) => ({
        downloadProgress: {
          loaded: message.loaded,
          total: message.total,
        },
        runtimeStatus: state.runtimeStatus === "idle" ? "loading" : state.runtimeStatus,
      }));
      return;
    }

    if (message.type === "MODEL_READY") {
      useIntelligenceStore.setState((state) => {
        const firstDownloadThisDevice = !state.modelDownloaded;

        if (firstDownloadThisDevice) {
          useSettingsStore.getState().setValue(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled, true);
        }

        return {
          activeModelId: message.modelId,
          modelDownloaded: true,
          showExperimentalNoticeSession: firstDownloadThisDevice ? true : state.showExperimentalNoticeSession,
          downloadProgress: null,
          runtimeStatus:
            state.runtimeStatus === "loading" && state.indexSize > 0
              ? "ready"
              : state.runtimeStatus,
        };
      });
      return;
    }

    if (message.type === "MODEL_ERROR") {
      useIntelligenceStore.setState({
        runtimeStatus: "error",
        indexing: false,
        lastError: message.message || "Model setup failed",
      });
      return;
    }

    if (message.type === "INDEX_PROGRESS") {
      const nextProgress: IndexProgressState = {
        processed: message.processed,
        total: message.total,
        currentFileName: message.currentFileName,
      };

      useIntelligenceStore.setState({
        runtimeStatus: "indexing",
        indexing: true,
        indexProgress: nextProgress,
      });
      return;
    }

    if (message.type === "INDEX_COMPLETE") {
      const now = Date.now();

      useIntelligenceStore.setState({
        runtimeStatus: "ready",
        indexing: false,
        indexProgress: null,
        indexedDocs: message.totalIndexed,
        indexSize: message.totalIndexed,
        lastIndexedAt: now,
        indexLastCompletedAt: now,
      });

      scheduleTransientStatus("complete", message.totalIndexed);
    }
  });
}

function bindServiceWorkerBridge(): void {
  if (serviceWorkerBridgeBound || typeof window === "undefined") {
    return;
  }

  serviceWorkerBridgeBound = true;
  navigator.serviceWorker?.addEventListener("message", (event: MessageEvent<unknown>) => {
    const payload = event.data as Partial<SwFilesCachedMessage> | undefined;
    if (!payload || payload.type !== "SW_FILES_CACHED" || !Array.isArray(payload.files)) {
      return;
    }

    const files = payload.files
      .filter((item): item is CachedIndexableFileMessage => {
        return Boolean(
          item
          && typeof item.fileId === "string"
          && typeof item.name === "string"
          && typeof item.fullPath === "string"
          && Array.isArray(item.ancestorIds)
          && typeof item.depth === "number"
          && (item.repoKind === "global" || item.repoKind === "personal"),
        );
      })
      .map((item) => toIndexableEntityFromCachedFile(item));

    if (files.length === 0) {
      return;
    }

    void useIntelligenceStore.getState().indexIncrementalFiles(files);
  });
}

function bindSettingsBridge(): void {
  if (settingsBridgeBound) {
    return;
  }

  settingsBridgeBound = true;

  settingsUnsubscribe = useSettingsStore.subscribe((state, previousState) => {
    const nextEnabled = state.values[INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled] === true;
    const prevEnabled = previousState.values[INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled] === true;
    useIntelligenceStore.setState({ enabled: nextEnabled });

    if (prevEnabled && !nextEnabled) {
      void useIntelligenceStore.getState().deactivateRuntime();
      return;
    }

    if (!prevEnabled && nextEnabled) {
      const currentState = useIntelligenceStore.getState();
      const snapshotKey = currentState.activeSnapshotKey
        ?? buildIntelligenceSnapshotKey("library", DEFAULT_MODEL_ID);

      void import("@/features/custom-folders/custom-folders.store")
        .then((module) => {
          const customFolders = module.useCustomFoldersStore.getState().folders;
          return useIntelligenceStore.getState().initialize({
            modelId: DEFAULT_MODEL_ID,
            snapshotKey,
            customFolders,
          });
        })
        .catch(() => {
          void useIntelligenceStore.getState().initialize({
            modelId: DEFAULT_MODEL_ID,
            snapshotKey,
          });
        });
    }
  });
}

function bindBeforeUnloadBridge(): void {
  if (beforeUnloadBound || typeof window === "undefined") {
    return;
  }

  beforeUnloadBound = true;

  window.addEventListener("beforeunload", () => {
    const state = useIntelligenceStore.getState();
    const snapshotKey = state.activeSnapshotKey;

    if (snapshotKey) {
      void getIntelligenceClient().persist(snapshotKey).catch(() => undefined);
    }

    (window as Window & { ocrManager?: { terminateWorker?: () => void } }).ocrManager?.terminateWorker?.();
    getIntelligenceClient().dispose();
  });
}

export const useIntelligenceStore = create<IntelligenceState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setEnabled: (enabled) => {
        set({ enabled });
      },

      setRuntimeStatus: (runtimeStatus, error = null) => {
        set({
          runtimeStatus,
          indexing: runtimeStatus === "indexing",
          lastError: runtimeStatus === "error" ? (error ?? "Unknown intelligence runtime error") : null,
        });
      },

      setModelDownloaded: (downloaded) => {
        set({ modelDownloaded: downloaded });
      },

      dismissExperimentalNoticeSession: () => {
        set({ showExperimentalNoticeSession: false });
      },

      deactivateRuntime: async () => {
        getIntelligenceClient().dispose();

        set({
          enabled: false,
          runtimeStatus: "idle",
          indexing: false,
          indexProgress: null,
          downloadProgress: null,
          lastError: null,
          transientStatus: null,
          transientStatusCount: 0,
          indexedEntries: [],
        });
      },

      initialize: async ({ modelId, snapshotKey, files, customFolders, signature }) => {
        if (initializePromise) {
          return initializePromise;
        }

        bindWorkerBridge();
        bindServiceWorkerBridge();
        bindSettingsBridge();
        bindBeforeUnloadBridge();

        initializePromise = (async () => {
          const client = getIntelligenceClient();
          const resolvedModelId = typeof modelId === "string" && modelId.trim().length > 0
            ? modelId
            : DEFAULT_MODEL_ID;

          set({
            runtimeStatus: "loading",
            indexing: false,
            indexProgress: null,
            retryCount: 0,
            lastError: null,
            downloadProgress: null,
            activeSnapshotKey: snapshotKey,
          });

          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              await client.init({ modelId: resolvedModelId, snapshotKey });
              break;
            } catch (error) {
              if (attempt >= 2) {
                set({
                  runtimeStatus: "error",
                  indexing: false,
                  lastError: error instanceof Error ? error.message : "Failed to initialize semantic runtime",
                });
                return;
              }

              set({ retryCount: attempt + 1 });
              await waitMs(3000);
            }
          }

          const postInitStats = await client.getStats().catch(() => null);
          if (postInitStats) {
            set({
              activeModelId: postInitStats.modelId,
              modelDownloaded: postInitStats.ready ? true : get().modelDownloaded,
              indexedDocs: postInitStats.indexSize,
              indexSize: postInitStats.indexSize,
              lastIndexedAt: postInitStats.updatedAt,
              indexLastCompletedAt: postInitStats.updatedAt,
              runtimeStatus: postInitStats.indexSize > 0 ? "ready" : "loading",
            });
          }

          const providedFiles = Array.isArray(files)
            ? files.filter((file) => file.fileId.trim().length > 0)
            : null;
          const providedSignature =
            typeof signature === "string" && signature.trim().length > 0
              ? signature.trim()
              : null;

          const filesToIndex = providedFiles
            ?? (await collectAllEntities(customFolders ?? []).catch(() => []))
              .filter((file) => file.fileId.trim().length > 0);

          const repoCounts = resolveRepoCounts(filesToIndex);
          set({
            indexGlobalCount: repoCounts.globalCount,
            indexPersonalCount: repoCounts.personalCount,
            indexFolderCount: repoCounts.folderCount,
            indexedEntries: filesToIndex,
          });

          const corpusSignature = providedSignature ?? buildCorpusSignature(filesToIndex);

          if (
            postInitStats
            && postInitStats.indexSize > 0
            && postInitStats.signature
            && postInitStats.signature === corpusSignature
          ) {
            set({
              runtimeStatus: "ready",
              indexing: false,
              indexProgress: null,
              retryCount: 0,
              downloadProgress: null,
            });
            return;
          }

          const now = Date.now();
          if (postInitStats && postInitStats.indexSize > 0 && !providedFiles && !providedSignature) {
            const indexedAgeMs = typeof postInitStats.updatedAt === "number"
              ? Math.max(0, now - postInitStats.updatedAt)
              : Number.POSITIVE_INFINITY;

            if (indexedAgeMs < INDEX_REFRESH_INTERVAL_MS) {
              set({
                runtimeStatus: "ready",
                indexing: false,
                indexProgress: null,
                retryCount: 0,
                downloadProgress: null,
              });
              return;
            }
          }

          if (filesToIndex.length === 0) {
            set({
              runtimeStatus: "ready",
              indexing: false,
              indexProgress: null,
              retryCount: 0,
              downloadProgress: null,
            });
            return;
          }

          const nextProgress: IndexProgressState = {
            processed: 0,
            total: filesToIndex.length,
            currentFileName: "",
          };

          set({
            runtimeStatus: "indexing",
            indexing: true,
            indexProgress: nextProgress,
          });

          await client.indexFiles({
            files: filesToIndex,
            snapshotKey,
            signature: corpusSignature,
          }).catch((error) => {
            set({
              runtimeStatus: "error",
              lastError: error instanceof Error ? error.message : "Semantic indexing failed",
              indexing: false,
            });
          });

          const finalStats = await client.getStats().catch(() => null);
          if (finalStats) {
            set({
              activeModelId: finalStats.modelId,
              indexedDocs: finalStats.indexSize,
              indexSize: finalStats.indexSize,
              lastIndexedAt: finalStats.updatedAt,
              indexLastCompletedAt: finalStats.updatedAt,
            });
          }

          if (get().runtimeStatus !== "error") {
            set({
              runtimeStatus: "ready",
              indexing: false,
              indexProgress: null,
              retryCount: 0,
              downloadProgress: null,
            });
          }
        })().finally(() => {
          initializePromise = null;
        });

        return initializePromise;
      },

      queryScopedSemantic: async ({ query, limit, scope }) => {
        const client = getIntelligenceClient();
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
          return {
            primary: [],
            crossRepo: [],
            crossRepoAbovePrimary: false,
          };
        }

        if (scope.kind === "global-root") {
          const [globalResult, personalResult] = await Promise.all([
            client.query({
              query: normalizedQuery,
              limit: Math.max(1, limit),
              scope: { kind: "global-root" },
              repoFilter: "global",
            }),
            client.query({
              query: normalizedQuery,
              limit: Math.max(20, limit),
              scope: { kind: "personal-root" },
              repoFilter: "personal",
            }),
          ]);

          const globalNames = globalResult.hits.map((hit) => hit.name ?? "");
          const qualifiedPersonal = personalResult.hits
            .filter((hit) => (hit.semanticScore ?? hit.score) >= CROSS_REPO_MIN_SCORE)
            .filter((hit) => !globalNames.some((name) => isNameDuplicate(name, hit.name ?? "")))
            .sort((left, right) => (right.semanticScore ?? right.score) - (left.semanticScore ?? left.score))
            .slice(0, CROSS_REPO_MAX_RESULTS);

          const topGlobal = globalResult.hits[0] ? (globalResult.hits[0].semanticScore ?? globalResult.hits[0].score) : 0;
          const topPersonal = qualifiedPersonal[0] ? (qualifiedPersonal[0].semanticScore ?? qualifiedPersonal[0].score) : 0;

          return {
            primary: globalResult.hits,
            crossRepo: qualifiedPersonal,
            crossRepoAbovePrimary: topPersonal > topGlobal + 0.15,
          };
        }

        const repoFilter = scope.kind === "personal-root"
          ? "personal"
          : scope.kind === "folder"
            ? scope.repoKind
            : "both";

        const result = await client.query({
          query: normalizedQuery,
          limit: Math.max(1, limit),
          scope,
          repoFilter,
        });

        return {
          primary: result.hits,
          crossRepo: [],
          crossRepoAbovePrimary: false,
        };
      },

      indexIncrementalFiles: async (files) => {
        const validFiles = files.filter((file) => file.fileId.trim().length > 0);
        if (validFiles.length === 0) {
          return;
        }

        await getIntelligenceClient().indexFiles({
          files: validFiles,
          snapshotKey: get().activeSnapshotKey ?? undefined,
        }).catch(() => undefined);

        const stats = await getIntelligenceClient().getStats().catch(() => null);
        if (stats) {
          set({
            activeModelId: stats.modelId,
            indexedDocs: stats.indexSize,
            indexSize: stats.indexSize,
            lastIndexedAt: stats.updatedAt,
            indexLastCompletedAt: stats.updatedAt,
            indexedEntries: mergeIndexedEntries(get().indexedEntries, validFiles),
          });
        }
      },

      indexFolderSubtree: async (folderId, options) => {
        const normalizedFolderId = folderId.trim();
        if (!normalizedFolderId) {
          return;
        }

        const rootLabel = options.folderName?.trim() || normalizedFolderId;
        const entities = await collectFolderRecursive(
          normalizedFolderId,
          [rootLabel],
          [],
          0,
          options.repoKind,
          options.customFolderId,
        );

        const rootEntity: IndexableEntity = {
          fileId: normalizedFolderId,
          name: rootLabel,
          fullPath: rootLabel,
          ancestorIds: [],
          depth: 0,
          mimeType: "application/vnd.google-apps.folder",
          isFolder: true,
          repoKind: options.repoKind,
          customFolderId: options.customFolderId,
        };

        const deduped = new Map<string, IndexableEntity>();
        deduped.set(rootEntity.fileId, rootEntity);
        for (const entity of entities) {
          if (!deduped.has(entity.fileId)) {
            deduped.set(entity.fileId, entity);
          }
        }

        const filesToIndex = Array.from(deduped.values());

        await getIntelligenceClient().indexFiles({
          files: filesToIndex,
          snapshotKey: options.snapshotKey ?? get().activeSnapshotKey ?? undefined,
        }).catch(() => undefined);

        const repoCounts = resolveRepoCounts(filesToIndex);
        set((state) => ({
          indexGlobalCount: Math.max(state.indexGlobalCount, repoCounts.globalCount),
          indexPersonalCount: Math.max(state.indexPersonalCount, repoCounts.personalCount),
          indexFolderCount: Math.max(state.indexFolderCount, repoCounts.folderCount),
          indexedEntries: mergeIndexedEntries(state.indexedEntries, filesToIndex),
        }));

        const stats = await getIntelligenceClient().getStats().catch(() => null);
        if (stats) {
          set({
            activeModelId: stats.modelId,
            indexedDocs: stats.indexSize,
            indexSize: stats.indexSize,
            lastIndexedAt: stats.updatedAt,
            indexLastCompletedAt: stats.updatedAt,
            indexedEntries: mergeIndexedEntries(get().indexedEntries, filesToIndex),
          });
        }
      },

      cancelDownload: () => {
        clearTransientTimer();
        getIntelligenceClient().dispose();

        set({
          runtimeStatus: "idle",
          indexing: false,
          indexProgress: null,
          downloadProgress: null,
          lastError: null,
          transientStatus: null,
          transientStatusCount: 0,
          indexedEntries: [],
        });
      },

      cancelIndexing: async () => {
        try {
          await getIntelligenceClient().cancelIndexing();
          const stats = await getIntelligenceClient().getStats().catch(() => null);
          const totalIndexed = stats?.indexSize ?? get().indexSize;

          set({
            indexing: false,
            indexProgress: null,
            runtimeStatus: "ready",
            indexSize: totalIndexed,
            indexedDocs: totalIndexed,
            lastIndexedAt: stats?.updatedAt ?? Date.now(),
            indexLastCompletedAt: stats?.updatedAt ?? Date.now(),
          });

          scheduleTransientStatus("cancelled", totalIndexed);
          toast.success("Smart search paused. Partial index remains available.");
        } catch {
          set({
            indexing: false,
            indexProgress: null,
            runtimeStatus: "ready",
          });
        }
      },

      getIndexSizeBytes: async () => {
        const key = get().activeSnapshotKey
          ?? buildIntelligenceSnapshotKey("library", DEFAULT_MODEL_ID);

        return getIntelligenceSnapshotSizeBytes(key);
      },

      clearIntelligenceCache: async () => {
        const client = getIntelligenceClient();

        await client.clearIndex().catch(() => undefined);
        await clearAllEmbeddings().catch(() => undefined);

        set({
          indexSize: 0,
          indexedDocs: 0,
          runtimeStatus: "idle",
          indexing: false,
          indexProgress: null,
          indexLastCompletedAt: null,
          indexGlobalCount: 0,
          indexPersonalCount: 0,
          indexFolderCount: 0,
          lastIndexedAt: null,
          lastError: null,
          downloadProgress: null,
          transientStatus: null,
          transientStatusCount: 0,
          indexedEntries: [],
        });

        await clearIntelligenceSnapshots().catch(() => undefined);
      },

      reset: () => {
        clearTransientTimer();
        settingsUnsubscribe?.();
        settingsUnsubscribe = null;
        settingsBridgeBound = false;

        set({ ...initialState });
      },
    }),
    {
      name: "studytrix_intelligence_meta",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        modelDownloaded: state.modelDownloaded,
      }),
    },
  ),
);
