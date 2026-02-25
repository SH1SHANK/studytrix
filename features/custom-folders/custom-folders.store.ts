"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";

import {
  PERSONAL_REPOSITORY_STORAGE_KEY,
  PERSONAL_REPOSITORY_SWATCHES,
  getPersonalRepositoryErrorMessage,
} from "./custom-folders.constants";
import type { CustomFolder, CustomFolderVerifyResponse } from "./custom-folders.types";
import {
  deleteDirectoryHandle,
  loadDirectoryHandle,
  requestHandlePermission,
  verifyHandlePermission,
} from "./local-handle.db";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { collectLocalFolder } from "@/features/intelligence/intelligence.collector";

type CustomFolderPatch = Partial<Pick<CustomFolder, "label" | "colour" | "pinnedToTop">>;

type SyncStatusPatch = Partial<NonNullable<CustomFolder["syncStatus"]>>;
type RecentlySharedItem = { folderId: string; label: string; sharedAt: number };

type CustomFoldersStore = {
  folders: CustomFolder[];
  pinnedFileIds: string[];
  recentlyShared: RecentlySharedItem[];
  shareLinkCopiedCount: Record<string, number>;
  needsReconnect: Set<string>;
  hasHydrated: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  addFolder: (folder: CustomFolder) => void;
  removeFolder: (id: string) => void;
  clearAllFolders: () => void;
  renameFolder: (id: string, label: string) => void;
  updateFolder: (id: string, patch: CustomFolderPatch) => void;
  updateSyncStatus: (id: string, patch: SyncStatusPatch) => void;
  markNeedsReconnect: (id: string) => void;
  clearNeedsReconnect: (id: string) => void;
  refreshFolder: (id: string) => Promise<void>;
  refreshLocalFolder: (id: string) => Promise<void>;
  reconnectLocalFolder: (id: string) => Promise<boolean>;
  reorderFolders: (ids: string[]) => void;
  recordFolderShared: (folderId: string, label: string) => void;
  recordShareLinkCopy: (folderId: string) => void;
  pinFile: (fileId: string) => void;
  unpinFile: (fileId: string) => void;
  reorderPinnedFiles: (ids: string[]) => void;
};

const localScanInFlight = new Set<string>();

function normalizeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "Untitled folder";
  }
  return trimmed.slice(0, 40);
}

function defaultSwatchValue(): string {
  return PERSONAL_REPOSITORY_SWATCHES[0]?.value ?? "hsl(var(--primary))";
}

function withFolderDefaults(folder: CustomFolder): CustomFolder {
  return {
    ...folder,
    sourceKind: folder.sourceKind ?? "drive",
    syncStatus: folder.syncStatus
      ? {
        lastScannedAt: Number.isFinite(folder.syncStatus.lastScannedAt)
          ? folder.syncStatus.lastScannedAt
          : 0,
        fileCount: Number.isFinite(folder.syncStatus.fileCount)
          ? folder.syncStatus.fileCount
          : 0,
        lastSyncError: folder.syncStatus.lastSyncError ?? null,
      }
      : undefined,
  };
}

function sanitizeFolder(folder: CustomFolder): CustomFolder {
  const withDefaults = withFolderDefaults(folder);
  return {
    ...withDefaults,
    label: normalizeLabel(withDefaults.label),
    colour: withDefaults.colour || defaultSwatchValue(),
  };
}

function sortFolders(folders: readonly CustomFolder[]): CustomFolder[] {
  return [...folders].sort((left, right) => {
    if (left.pinnedToTop !== right.pinnedToTop) {
      return left.pinnedToTop ? -1 : 1;
    }

    if (left.addedAt !== right.addedAt) {
      return right.addedAt - left.addedAt;
    }

    return left.label.localeCompare(right.label);
  });
}

function mergeFolder(existing: CustomFolder | undefined, incoming: CustomFolder): CustomFolder {
  if (!existing) {
    return sanitizeFolder(incoming);
  }

  return sanitizeFolder({
    ...existing,
    ...incoming,
    id: existing.id,
    addedAt: existing.addedAt,
  });
}

async function triggerSmartCollectionsRegeneration(): Promise<void> {
  try {
    const { useSmartCollectionsStore } = await import("./smart-collections.store");
    await useSmartCollectionsStore.getState().generateCollections();
  } catch {
  }
}

function makeSyncStatus(current: CustomFolder | undefined): NonNullable<CustomFolder["syncStatus"]> {
  return {
    lastScannedAt: current?.syncStatus?.lastScannedAt ?? 0,
    fileCount: current?.syncStatus?.fileCount ?? 0,
    lastSyncError: current?.syncStatus?.lastSyncError ?? null,
  };
}

function sanitizeRecentlyShared(items: unknown): RecentlySharedItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const deduped = new Map<string, RecentlySharedItem>();
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const candidate = item as Partial<RecentlySharedItem>;
    if (typeof candidate.folderId !== "string" || !candidate.folderId.trim()) {
      continue;
    }

    const folderId = candidate.folderId.trim();
    const label = typeof candidate.label === "string" && candidate.label.trim()
      ? candidate.label.trim().slice(0, 40)
      : folderId;
    const sharedAt = Number.isFinite(candidate.sharedAt) ? Number(candidate.sharedAt) : 0;
    const previous = deduped.get(folderId);
    if (!previous || previous.sharedAt < sharedAt) {
      deduped.set(folderId, {
        folderId,
        label,
        sharedAt,
      });
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => right.sharedAt - left.sharedAt)
    .slice(0, 5);
}

function sanitizeShareCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, number> = {};
  for (const [key, count] of Object.entries(record)) {
    if (!key.trim()) {
      continue;
    }
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      next[key] = Math.floor(count);
    }
  }
  return next;
}

async function indexDriveFolder(folder: CustomFolder): Promise<void> {
  await useIntelligenceStore.getState().indexFolderSubtree(folder.id, {
    repoKind: "personal",
    folderName: folder.label,
    customFolderId: folder.id,
  });
}

async function indexLocalFolder(folder: CustomFolder, handle: FileSystemDirectoryHandle): Promise<{
  fileCount: number;
  folderCount: number;
}> {
  const entities = await collectLocalFolder(handle, folder.label, folder.id);
  const root = {
    fileId: folder.id,
    name: folder.label,
    fullPath: folder.label,
    ancestorIds: [],
    depth: 0,
    isFolder: true,
    repoKind: "personal" as const,
    customFolderId: folder.id,
    mimeType: "application/vnd.google-apps.folder",
  };

  const deduped = new Map<string, (typeof entities)[number] | typeof root>();
  deduped.set(root.fileId, root);
  for (const entity of entities) {
    if (!deduped.has(entity.fileId)) {
      deduped.set(entity.fileId, entity);
    }
  }

  await useIntelligenceStore.getState().indexIncrementalFiles(Array.from(deduped.values()));

  const fileCount = entities.filter((entity) => !entity.isFolder).length;
  const folderCount = entities.filter((entity) => entity.isFolder).length;

  return { fileCount, folderCount };
}

export const useCustomFoldersStore = create<CustomFoldersStore>()(persist(
  (set, get) => {
    const runLocalFolderScan = async (
      folder: CustomFolder,
      handle: FileSystemDirectoryHandle,
      skipPermissionProbe = false,
    ): Promise<void> => {
      if (localScanInFlight.has(folder.id)) {
        return;
      }

      localScanInFlight.add(folder.id);
      try {
        if (!skipPermissionProbe) {
          const permission = await verifyHandlePermission(handle);
          if (permission === "requires-gesture") {
            get().markNeedsReconnect(folder.id);
            return;
          }

          if (permission !== "granted") {
            get().updateSyncStatus(folder.id, { lastSyncError: "PERMISSION_LOST" });
            return;
          }
        }

        const counts = await indexLocalFolder(folder, handle);
        const now = Date.now();

        set((state) => ({
          folders: state.folders.map((entry) => {
            if (entry.id !== folder.id) {
              return entry;
            }

            const baseSync = makeSyncStatus(entry);
            return {
              ...entry,
              lastRefreshedAt: now,
              accessVerifiedAt: now,
              fileCount: counts.fileCount,
              folderCount: counts.folderCount,
              syncStatus: {
                ...baseSync,
                lastScannedAt: now,
                fileCount: counts.fileCount,
                lastSyncError: null,
              },
            };
          }),
        }));

        get().clearNeedsReconnect(folder.id);
        await triggerSmartCollectionsRegeneration();
      } catch {
        get().updateSyncStatus(folder.id, { lastSyncError: "SCAN_FAILED" });
      } finally {
        localScanInFlight.delete(folder.id);
      }
    };

    return {
      folders: [],
      pinnedFileIds: [],
      recentlyShared: [],
      shareLinkCopiedCount: {},
      needsReconnect: new Set<string>(),
      hasHydrated: false,
      initialized: false,

      initialize: async () => {
        if (!get().hasHydrated || get().initialized) {
          return;
        }

        set({ initialized: true });

        const localFolders = get().folders.filter((folder) => folder.sourceKind === "local");
        for (const folder of localFolders) {
          const handleKey = folder.localHandleKey?.trim();
          if (!handleKey) {
            get().updateSyncStatus(folder.id, { lastSyncError: "PERMISSION_LOST" });
            continue;
          }

          const handle = await loadDirectoryHandle(handleKey);
          if (!handle) {
            get().updateSyncStatus(folder.id, { lastSyncError: "PERMISSION_LOST" });
            continue;
          }

          const permission = await verifyHandlePermission(handle);
          if (permission === "granted") {
            void runLocalFolderScan(folder, handle, true);
            continue;
          }

          if (permission === "requires-gesture") {
            get().markNeedsReconnect(folder.id);
            continue;
          }

          get().updateSyncStatus(folder.id, { lastSyncError: "PERMISSION_LOST" });
        }
      },

      addFolder: (folder) => {
        const normalizedIncoming = sanitizeFolder(folder);

        set((state) => {
          const existing = state.folders.find((entry) => entry.id === folder.id);
          const nextFolder = mergeFolder(existing, normalizedIncoming);
          const nextFolders = existing
            ? state.folders.map((entry) => (entry.id === folder.id ? nextFolder : entry))
            : [nextFolder, ...state.folders];
          return {
            folders: sortFolders(nextFolders),
          };
        });

        if (normalizedIncoming.sourceKind === "local") {
          if (normalizedIncoming.localHandleKey) {
            void get().refreshLocalFolder(normalizedIncoming.id);
          }
        } else if ((normalizedIncoming.sourceKind ?? "drive") === "drive") {
          void indexDriveFolder(normalizedIncoming);
        }

        void triggerSmartCollectionsRegeneration();
      },

      removeFolder: (id) => {
        const folderToRemove = get().folders.find((folder) => folder.id === id);
        set((state) => {
          const nextReconnect = new Set(state.needsReconnect);
          nextReconnect.delete(id);
          const nextShareCounts = { ...state.shareLinkCopiedCount };
          delete nextShareCounts[id];
          return {
            folders: state.folders.filter((folder) => folder.id !== id),
            recentlyShared: state.recentlyShared.filter((entry) => entry.folderId !== id),
            shareLinkCopiedCount: nextShareCounts,
            needsReconnect: nextReconnect,
          };
        });

        if (folderToRemove?.sourceKind === "local" && folderToRemove.localHandleKey) {
          void deleteDirectoryHandle(folderToRemove.localHandleKey);
        }
      },

      clearAllFolders: () => {
        const localHandleKeys = get().folders
          .filter((folder) => folder.sourceKind === "local")
          .map((folder) => folder.localHandleKey)
          .filter((key): key is string => typeof key === "string" && key.trim().length > 0);

        set({
          folders: [],
          recentlyShared: [],
          shareLinkCopiedCount: {},
          needsReconnect: new Set<string>(),
        });

        localHandleKeys.forEach((key) => {
          void deleteDirectoryHandle(key);
        });
      },

      renameFolder: (id, label) => {
        const nextLabel = normalizeLabel(label);
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, label: nextLabel } : folder),
        }));
      },

      updateFolder: (id, patch) => {
        set((state) => ({
          folders: sortFolders(
            state.folders.map((folder) => {
              if (folder.id !== id) {
                return folder;
              }

              return {
                ...folder,
                ...patch,
                label: patch.label !== undefined ? normalizeLabel(patch.label) : folder.label,
                colour: patch.colour !== undefined ? patch.colour : folder.colour,
                pinnedToTop: patch.pinnedToTop ?? folder.pinnedToTop,
              };
            }),
          ),
        }));
      },

      updateSyncStatus: (id, patch) => {
        set((state) => ({
          folders: state.folders.map((folder) => {
            if (folder.id !== id) {
              return folder;
            }

            const baseSync = makeSyncStatus(folder);
            return {
              ...folder,
              syncStatus: {
                ...baseSync,
                ...patch,
              },
            };
          }),
        }));
      },

      markNeedsReconnect: (id) => {
        if (!id.trim()) {
          return;
        }

        set((state) => {
          const next = new Set(state.needsReconnect);
          next.add(id);
          return { needsReconnect: next };
        });
      },

      clearNeedsReconnect: (id) => {
        set((state) => {
          if (!state.needsReconnect.has(id)) {
            return state;
          }

          const next = new Set(state.needsReconnect);
          next.delete(id);
          return { needsReconnect: next };
        });
      },

      refreshFolder: async (id) => {
        const folder = get().folders.find((entry) => entry.id === id);
        if (!folder) {
          return;
        }

        const sourceKind = folder.sourceKind ?? "drive";
        if (sourceKind === "local") {
          await get().refreshLocalFolder(id);
          return;
        }

        if (sourceKind === "local-virtual") {
          return;
        }

        const response = await fetch("/api/custom-folders/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderId: id }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            errorCode?: string;
          };
          throw new Error(getPersonalRepositoryErrorMessage(body.errorCode ?? "DRIVE_ERROR"));
        }

        const payload = (await response.json()) as CustomFolderVerifyResponse;
        const now = Date.now();

        set((state) => ({
          folders: state.folders.map((entry) => {
            if (entry.id !== id) {
              return entry;
            }

            return {
              ...entry,
              lastRefreshedAt: now,
              accessVerifiedAt: now,
              fileCount: payload.fileCount,
              folderCount: payload.folderCount,
            };
          }),
        }));

        await indexDriveFolder(folder);
        await triggerSmartCollectionsRegeneration();
      },

      refreshLocalFolder: async (id) => {
        const folder = get().folders.find((entry) => entry.id === id);
        if (!folder || folder.sourceKind !== "local") {
          return;
        }

        const handleKey = folder.localHandleKey?.trim();
        if (!handleKey) {
          get().updateSyncStatus(id, { lastSyncError: "PERMISSION_LOST" });
          return;
        }

        const handle = await loadDirectoryHandle(handleKey);
        if (!handle) {
          get().updateSyncStatus(id, { lastSyncError: "PERMISSION_LOST" });
          return;
        }

        const permission = await verifyHandlePermission(handle);
        if (permission === "requires-gesture") {
          get().markNeedsReconnect(id);
          return;
        }

        if (permission !== "granted") {
          get().updateSyncStatus(id, { lastSyncError: "PERMISSION_LOST" });
          return;
        }

        await runLocalFolderScan(folder, handle, true);
      },

      reconnectLocalFolder: async (id) => {
        const folder = get().folders.find((entry) => entry.id === id);
        if (!folder || folder.sourceKind !== "local") {
          return false;
        }

        const handleKey = folder.localHandleKey?.trim();
        if (!handleKey) {
          get().updateSyncStatus(id, { lastSyncError: "PERMISSION_LOST" });
          return false;
        }

        const handle = await loadDirectoryHandle(handleKey);
        if (!handle) {
          get().updateSyncStatus(id, { lastSyncError: "PERMISSION_LOST" });
          return false;
        }

        const granted = await requestHandlePermission(handle);
        if (!granted) {
          get().updateSyncStatus(id, { lastSyncError: "PERMISSION_LOST" });
          return false;
        }

        get().clearNeedsReconnect(id);
        await runLocalFolderScan(folder, handle, true);
        return true;
      },

      reorderFolders: (ids) => {
        set((state) => {
          const order = new Map<string, number>();
          ids.forEach((id, index) => {
            order.set(id, index);
          });

          const next = [...state.folders].sort((left, right) => {
            if (left.pinnedToTop !== right.pinnedToTop) {
              return left.pinnedToTop ? -1 : 1;
            }

            const leftOrder = order.get(left.id);
            const rightOrder = order.get(right.id);
            if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
              return leftOrder - rightOrder;
            }
            if (leftOrder !== undefined && rightOrder === undefined) {
              return -1;
            }
            if (leftOrder === undefined && rightOrder !== undefined) {
              return 1;
            }

            return right.addedAt - left.addedAt;
          });

          return { folders: next };
        });
      },

      recordFolderShared: (folderId, label) => {
        const normalizedFolderId = folderId.trim();
        if (!normalizedFolderId) {
          return;
        }

        const nextLabel = normalizeLabel(label);
        const now = Date.now();
        set((state) => {
          const merged = [
            {
              folderId: normalizedFolderId,
              label: nextLabel,
              sharedAt: now,
            },
            ...state.recentlyShared.filter((entry) => entry.folderId !== normalizedFolderId),
          ].slice(0, 5);

          return { recentlyShared: merged };
        });
      },

      recordShareLinkCopy: (folderId) => {
        const normalizedFolderId = folderId.trim();
        if (!normalizedFolderId) {
          return;
        }

        set((state) => ({
          shareLinkCopiedCount: {
            ...state.shareLinkCopiedCount,
            [normalizedFolderId]: (state.shareLinkCopiedCount[normalizedFolderId] ?? 0) + 1,
          },
        }));
      },

      pinFile: (fileId) => {
        const normalizedId = fileId.trim();
        if (!normalizedId) {
          return;
        }

        set((state) => {
          if (state.pinnedFileIds.includes(normalizedId)) {
            return state;
          }

          if (state.pinnedFileIds.length >= 10) {
            toast.error("Unpin a file to add another. Maximum 10 pinned files.");
            return state;
          }

          return {
            pinnedFileIds: [normalizedId, ...state.pinnedFileIds],
          };
        });
      },

      unpinFile: (fileId) => {
        set((state) => ({
          pinnedFileIds: state.pinnedFileIds.filter((id) => id !== fileId),
        }));
      },

      reorderPinnedFiles: (ids) => {
        set((state) => {
          const existingSet = new Set(state.pinnedFileIds);
          const nextOrdered = ids.filter((id, index) => existingSet.has(id) && ids.indexOf(id) === index);
          for (const id of state.pinnedFileIds) {
            if (!nextOrdered.includes(id)) {
              nextOrdered.push(id);
            }
          }

          return { pinnedFileIds: nextOrdered };
        });
      },
    };
  },
  {
    name: PERSONAL_REPOSITORY_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      folders: state.folders,
      pinnedFileIds: state.pinnedFileIds,
      recentlyShared: state.recentlyShared,
      shareLinkCopiedCount: state.shareLinkCopiedCount,
    }),
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        useCustomFoldersStore.setState({ hasHydrated: true });
        return;
      }

      useCustomFoldersStore.setState((current) => ({
        hasHydrated: true,
        folders: sortFolders((current.folders ?? []).map((folder) => sanitizeFolder({
          ...folder,
          sourceKind: folder.sourceKind ?? "drive",
        }))),
        pinnedFileIds: Array.isArray(current.pinnedFileIds)
          ? current.pinnedFileIds.filter((id): id is string => typeof id === "string")
          : [],
        recentlyShared: sanitizeRecentlyShared(current.recentlyShared),
        shareLinkCopiedCount: sanitizeShareCountMap(current.shareLinkCopiedCount),
      }));
    },
  },
));

export function getSortedPersonalFolders(folders: readonly CustomFolder[]): CustomFolder[] {
  return sortFolders(folders.map((folder) => sanitizeFolder(folder)));
}
