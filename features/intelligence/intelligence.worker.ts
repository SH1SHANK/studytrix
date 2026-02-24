/// <reference lib="webworker" />

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  IndexableEntity,
  SearchScope,
  IntelligenceIndexSnapshot,
  IntelligenceIndexedVector,
  IntelligenceWorkerAnyRequestEnvelope,
  IntelligenceWorkerAnyResponseEnvelope,
  IntelligenceWorkerEventMessage,
  IntelligenceWorkerRequestMap,
  IntelligenceWorkerStats,
} from "./intelligence.types";
import {
  DEFAULT_MODEL_ID,
  INTELLIGENCE_FALLBACK_MODEL_ID,
  INTELLIGENCE_MAX_QUERY_CACHE_ENTRIES,
} from "./intelligence.constants";

type MaybeFeatureExtractionResult = {
  data?: ArrayLike<number>;
};

type TransformerProgress = {
  status?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

type TransformerPipelineFactory = (
  task: string,
  model: string,
  options?: Record<string, unknown>,
) => Promise<unknown>;

type TransformersModule = {
  env?: {
    allowRemoteModels?: boolean;
    allowLocalModels?: boolean;
    useBrowserCache?: boolean;
  };
  pipeline?: TransformerPipelineFactory;
};

type Embedder = (text: string) => Promise<number[]>;

type IndexedEntry = {
  vector: number[];
  inputHash: string;
  fileId: string;
  name: string;
  fullPath: string;
  ancestorIds: string[];
  repoKind: "global" | "personal";
  customFolderId?: string;
  isFolder: boolean;
  mimeType?: string;
  depth: number;
  indexedAt: number;
};

interface EmbeddingDbSchema extends DBSchema {
  embeddings: {
    key: string;
    value: {
      fileId: string;
      vector: number[];
      inputHash: string;
      updatedAt: number;
    };
  };
}

const EMBEDDINGS_DB_NAME = "studytrix_intelligence_embeddings";
const EMBEDDINGS_DB_VERSION = 1;
const EMBEDDINGS_STORE = "embeddings";

const FOLDER_MIME = "application/vnd.google-apps.folder";

const workerScope = self as DedicatedWorkerGlobalScope;

let embeddingDbPromise: Promise<IDBPDatabase<EmbeddingDbSchema> | null> | null = null;
let embeddingDbDisabled = false;

let activeModelId: string | null = null;
let activeSignature: string | null = null;
let activeUpdatedAt: number | null = null;
let dimension = 384;
let usingHashedFallback = false;

let embedder: Embedder | null = null;
let transformersModulePromise: Promise<TransformersModule> | null = null;

const embeddingIndex = new Map<string, IndexedEntry>();
const queryVectorCache = new Map<string, number[]>();

let isIndexing = false;
const indexingQueue: IndexableEntity[][] = [];
let cancelled = false;

function nowMs(): number {
  return Date.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
}

function hashString(value: string): string {
  return stableHash(value).toString(36);
}

function normalizeL2(values: number[]): number[] {
  let mag = 0;
  for (const value of values) {
    mag += value * value;
  }

  if (mag <= 0) {
    return values;
  }

  const inv = 1 / Math.sqrt(mag);
  return values.map((value) => value * inv);
}

function resolveVectorDimension(modelId: string): number {
  const normalized = modelId.toLowerCase();

  if (normalized.includes("bge") || normalized.includes("minilm")) {
    return 384;
  }

  return 384;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function mimeToLabel(mime: string): string {
  const map: Record<string, string> = {
    [FOLDER_MIME]: "Folder",
    "application/pdf": "PDF document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint presentation",
    "image/jpeg": "Image photo scan",
    "image/png": "Image photo scan",
    "video/mp4": "Video recording",
    "audio/mpeg": "Audio recording",
    "text/plain": "Text notes",
  };

  return map[mime] ?? "";
}

function fileSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildEmbeddingInput(entity: IndexableEntity): string {
  const typeSignal = entity.isFolder
    ? "folder directory"
    : mimeToLabel(entity.mimeType ?? "");

  return [
    "Represent this sentence for searching relevant passages:",
    entity.fullPath,
    entity.name,
    typeSignal,
    entity.tags?.join(" ") ?? "",
    entity.mimeType ? mimeToLabel(entity.mimeType) : "",
    typeof entity.size === "number" ? fileSizeLabel(entity.size) : "",
    entity.modifiedTime ? new Date(entity.modifiedTime).getFullYear().toString() : "",
  ]
    .filter((value) => value.trim().length > 0)
    .join(" ")
    .trim();
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;

  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    dot += l * r;
    leftMag += l * l;
    rightMag += r * r;
  }

  if (leftMag <= 0 || rightMag <= 0) {
    return 0;
  }

  const score = dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag));
  return Math.max(0, Math.min(1, score));
}

function postWorkerEvent(message: IntelligenceWorkerEventMessage): void {
  workerScope.postMessage(message);
}

async function getEmbeddingDb(): Promise<IDBPDatabase<EmbeddingDbSchema> | null> {
  if (embeddingDbDisabled) {
    return null;
  }

  if (!embeddingDbPromise) {
    embeddingDbPromise = (async () => {
      try {
        return await openDB<EmbeddingDbSchema>(
          EMBEDDINGS_DB_NAME,
          EMBEDDINGS_DB_VERSION,
          {
            upgrade(database) {
              if (!database.objectStoreNames.contains(EMBEDDINGS_STORE)) {
                database.createObjectStore(EMBEDDINGS_STORE, { keyPath: "fileId" });
              }
            },
          },
        );
      } catch {
        embeddingDbDisabled = true;
        return null;
      }
    })();
  }

  return embeddingDbPromise;
}

async function saveEmbedding(fileId: string, vector: number[], inputHash: string): Promise<void> {
  const db = await getEmbeddingDb();
  if (!db) {
    return;
  }

  await db.put(EMBEDDINGS_STORE, {
    fileId,
    vector,
    inputHash,
    updatedAt: nowMs(),
  });
}

async function clearEmbeddingsDb(): Promise<void> {
  const db = await getEmbeddingDb();
  if (!db) {
    return;
  }

  await db.clear(EMBEDDINGS_STORE);
}

function createHashedEmbedder(modelId: string): Embedder {
  const vectorSize = resolveVectorDimension(modelId);

  return async (input: string): Promise<number[]> => {
    const normalized = input.toLowerCase();
    const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
    const values = new Array<number>(vectorSize).fill(0);

    for (const token of tokens) {
      const h = stableHash(token);
      const index = h % vectorSize;
      const sign = (h & 1) === 0 ? 1 : -1;
      values[index] += sign;
    }

    return normalizeL2(values);
  };
}

function getProgressPercent(payload: TransformerProgress): number | null {
  const explicitProgress = toFiniteNumber(payload.progress);
  if (explicitProgress !== null) {
    return explicitProgress <= 1
      ? Math.max(0, Math.min(100, explicitProgress * 100))
      : Math.max(0, Math.min(100, explicitProgress));
  }

  const loaded = toFiniteNumber(payload.loaded);
  const total = toFiniteNumber(payload.total);
  if (loaded !== null && total !== null && total > 0) {
    return Math.max(0, Math.min(100, (loaded / total) * 100));
  }

  return null;
}

async function getTransformersModule(): Promise<TransformersModule> {
  if (!transformersModulePromise) {
    transformersModulePromise = (async () => {
      const transformers = await import("@huggingface/transformers") as TransformersModule;

      if (transformers.env) {
        transformers.env.allowRemoteModels = true;
        transformers.env.allowLocalModels = true;
        transformers.env.useBrowserCache = true;
      }

      return transformers;
    })();
  }

  return transformersModulePromise;
}

async function createTransformerEmbedder(modelId: string): Promise<Embedder> {
  const transformers = await getTransformersModule();
  if (!transformers.pipeline) {
    throw new Error("Transformers pipeline factory not available");
  }

  let sawDownload = false;
  let loggedDownload = false;

  const featureExtractionPipeline = await transformers.pipeline("feature-extraction", modelId, {
    quantized: true,
    progress_callback: (progress: TransformerProgress) => {
      if (progress.status === "downloading") {
        sawDownload = true;
        if (!loggedDownload) {
          loggedDownload = true;
          console.info("[Intelligence] Downloading model");
        }
      }

      const loaded = progress.loaded ?? 0;
      const total = progress.total ?? 0;

      postWorkerEvent({
        type: "MODEL_DOWNLOAD_PROGRESS",
        loaded,
        total,
        percent: getProgressPercent(progress),
        loadedBytes: toFiniteNumber(progress.loaded),
        totalBytes: toFiniteNumber(progress.total),
      });
    },
  }) as (input: string, options?: Record<string, unknown>) => Promise<MaybeFeatureExtractionResult>;

  if (!sawDownload) {
    console.info("[Intelligence] Model loaded from cache");
  }

  return async (input: string): Promise<number[]> => {
    const output = await featureExtractionPipeline(input, {
      pooling: "mean",
      normalize: true,
      truncation: true,
      max_length: 512,
    });

    const data = output?.data ? Array.from(output.data) : [];
    if (data.length === 0) {
      return createHashedEmbedder(modelId)(input);
    }

    return normalizeL2(data.map((value) => Number(value) || 0));
  };
}

async function ensureEmbedder(modelId: string): Promise<void> {
  if (embedder && activeModelId === modelId) {
    return;
  }

  activeModelId = modelId;
  usingHashedFallback = false;

  try {
    embedder = await createTransformerEmbedder(modelId);
  } catch (error) {
    embedder = null;
    postWorkerEvent({
      type: "MODEL_ERROR",
      message: error instanceof Error ? error.message : "Failed to initialize semantic model",
      retryable: true,
    });
    throw error;
  }

  dimension = resolveVectorDimension(modelId);
  queryVectorCache.clear();
  postWorkerEvent({ type: "MODEL_READY", modelId });
}

async function getQueryVector(query: string): Promise<number[]> {
  const modelId = activeModelId ?? DEFAULT_MODEL_ID;
  const cacheKey = `${modelId}::${query.toLowerCase().trim()}`;
  const cached = queryVectorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  await ensureEmbedder(modelId);
  const activeEmbedder = embedder;

  if (!activeEmbedder) {
    throw new Error("Embedder unavailable");
  }

  const vector = await activeEmbedder(query);

  queryVectorCache.set(cacheKey, vector);
  if (queryVectorCache.size > INTELLIGENCE_MAX_QUERY_CACHE_ENTRIES) {
    const firstKey = queryVectorCache.keys().next().value as string | undefined;
    if (firstKey) {
      queryVectorCache.delete(firstKey);
    }
  }

  return vector;
}

function toStats(): IntelligenceWorkerStats {
  return {
    ready: embedder !== null,
    modelId: activeModelId,
    indexSize: embeddingIndex.size,
    signature: activeSignature,
    updatedAt: activeUpdatedAt,
    dimension,
    usingHashedFallback,
  };
}

function restoreFromSnapshot(snapshot: IntelligenceIndexSnapshot): void {
  embeddingIndex.clear();

  for (const entry of snapshot.vectors) {
    if (!entry.fileId) {
      continue;
    }

    embeddingIndex.set(entry.fileId, {
      vector: [...entry.vector],
      inputHash: entry.inputHash ?? "",
      fileId: entry.fileId,
      name: entry.fullPath?.split(" > ").at(-1) ?? entry.fileId,
      fullPath: entry.fullPath ?? entry.fileId,
      ancestorIds: Array.isArray(entry.ancestorIds) ? [...entry.ancestorIds] : [],
      repoKind: entry.repoKind === "personal" ? "personal" : "global",
      customFolderId: typeof entry.customFolderId === "string" ? entry.customFolderId : undefined,
      isFolder: entry.isFolder === true,
      mimeType: entry.mimeType,
      depth: typeof entry.depth === "number" ? entry.depth : 0,
      indexedAt: entry.indexedAt ?? nowMs(),
    });
  }

  activeSignature = snapshot.signature;
  activeUpdatedAt = snapshot.updatedAt;
}

function toSnapshotVector(fileId: string, entry: IndexedEntry): IntelligenceIndexedVector {
  return {
    id: fileId,
    fileId,
    mimeType: entry.mimeType,
    fullPath: entry.fullPath,
    ancestorIds: [...entry.ancestorIds],
    repoKind: entry.repoKind,
    customFolderId: entry.customFolderId,
    isFolder: entry.isFolder,
    depth: entry.depth,
    text: entry.fullPath,
    vector: [...entry.vector],
    inputHash: entry.inputHash,
    indexedAt: entry.indexedAt,
    lastAccessedAt: nowMs(),
  };
}

async function processIndexBatch(files: IndexableEntity[]): Promise<void> {
  if (isIndexing) {
    indexingQueue.push(files);
    return;
  }

  const activeEmbedder = embedder;
  if (!activeEmbedder) {
    throw new Error("Embedder unavailable");
  }

  isIndexing = true;
  cancelled = false;

  let processed = 0;
  const total = files.length;

  for (const file of files) {
    if (cancelled) {
      break;
    }

    try {
      const embeddingInput = buildEmbeddingInput(file);
      if (!embeddingInput) {
        processed += 1;
        continue;
      }

      const metadataHash = hashString(embeddingInput);
      const existing = embeddingIndex.get(file.fileId);
      if (existing?.inputHash === metadataHash) {
        processed += 1;
        postWorkerEvent({
          type: "INDEX_PROGRESS",
          processed,
          total,
          currentFileName: file.name,
        });
        continue;
      }

      const vector = await activeEmbedder(embeddingInput);

      embeddingIndex.set(file.fileId, {
        vector,
        inputHash: metadataHash,
        fileId: file.fileId,
        name: file.name,
        fullPath: file.fullPath,
        ancestorIds: Array.isArray(file.ancestorIds) ? [...file.ancestorIds] : [],
        repoKind: file.repoKind,
        customFolderId: file.customFolderId,
        isFolder: file.isFolder,
        mimeType: file.mimeType,
        depth: file.depth,
        indexedAt: nowMs(),
      });

      await saveEmbedding(file.fileId, vector, metadataHash).catch(() => {
        // IndexedDB write failure is non-fatal.
      });

      processed += 1;
      activeUpdatedAt = nowMs();

      postWorkerEvent({
        type: "INDEX_PROGRESS",
        processed,
        total,
        currentFileName: file.name,
      });
    } catch (error) {
      processed += 1;
      postWorkerEvent({
        type: "INDEX_FILE_ERROR",
        fileId: file.fileId,
        error: String(error),
      });
    }
  }

  isIndexing = false;
  cancelled = false;

  postWorkerEvent({
    type: "INDEX_COMPLETE",
    totalIndexed: embeddingIndex.size,
  });

  if (indexingQueue.length > 0) {
    const next = indexingQueue.shift();
    if (next) {
      await processIndexBatch(next);
    }
  }
}

function isSearchScope(value: unknown): value is SearchScope {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }

  if (value.kind === "global-root" || value.kind === "personal-root") {
    return true;
  }

  if (value.kind !== "folder") {
    return false;
  }

  return typeof value.folderId === "string"
    && value.folderId.trim().length > 0
    && typeof value.folderName === "string"
    && value.folderName.trim().length > 0
    && (value.repoKind === "global" || value.repoKind === "personal")
    && Array.isArray(value.breadcrumb);
}

function applyScope(
  hits: Array<{ id: string; score: number; document: IndexedEntry }>,
  scope: SearchScope,
): Array<{ id: string; score: number; document: IndexedEntry }> {
  switch (scope.kind) {
    case "global-root":
      return hits.filter((hit) => hit.document.repoKind === "global");

    case "personal-root":
      return hits.filter((hit) => hit.document.repoKind === "personal");

    case "folder":
      return hits.filter((hit) =>
        hit.document.ancestorIds.includes(scope.folderId)
        || hit.document.fileId === scope.folderId);
  }
}

async function handleRequest(message: IntelligenceWorkerAnyRequestEnvelope): Promise<unknown> {
  const { type, payload } = message;

  if (type === "INIT") {
    const initPayload = payload as IntelligenceWorkerRequestMap["INIT"];
    const requestedModelId =
      isRecord(initPayload) && typeof initPayload.modelId === "string"
        ? initPayload.modelId.trim()
        : "";

    const modelId = requestedModelId || activeModelId || DEFAULT_MODEL_ID || INTELLIGENCE_FALLBACK_MODEL_ID;
    const previousModelId = activeModelId;

    await ensureEmbedder(modelId);

    if (previousModelId && previousModelId !== modelId) {
      embeddingIndex.clear();
      queryVectorCache.clear();
      activeSignature = null;
      activeUpdatedAt = nowMs();
      await clearEmbeddingsDb().catch(() => undefined);
    }

    const snapshot = isRecord(initPayload) && isRecord(initPayload.snapshot)
      ? initPayload.snapshot as IntelligenceIndexSnapshot
      : null;

    if (snapshot && snapshot.modelId === modelId && embeddingIndex.size === 0) {
      restoreFromSnapshot(snapshot);
    }

    return toStats();
  }

  if (type === "SET_MODEL") {
    const setModelPayload = payload as IntelligenceWorkerRequestMap["SET_MODEL"];
    const modelId = isRecord(setModelPayload) && typeof setModelPayload.modelId === "string"
      ? setModelPayload.modelId.trim()
      : "";

    if (!modelId) {
      throw new Error("Model id is required");
    }

    const previousModelId = activeModelId;
    await ensureEmbedder(modelId);

    if (previousModelId !== modelId) {
      embeddingIndex.clear();
      queryVectorCache.clear();
      activeSignature = null;
      activeUpdatedAt = nowMs();
      await clearEmbeddingsDb().catch(() => undefined);
    }

    return toStats();
  }

  if (type === "INDEX_FILES") {
    const indexPayload = payload as IntelligenceWorkerRequestMap["INDEX_FILES"];
    const files = Array.isArray(indexPayload?.files)
      ? indexPayload.files.filter((file): file is IndexableEntity => {
        return isRecord(file)
          && typeof file.fileId === "string"
          && file.fileId.trim().length > 0
          && typeof file.name === "string"
          && file.name.trim().length > 0
          && typeof file.fullPath === "string"
          && file.fullPath.trim().length > 0
          && Array.isArray(file.ancestorIds)
          && typeof file.depth === "number"
          && Number.isFinite(file.depth)
          && typeof file.isFolder === "boolean"
          && (file.repoKind === "global" || file.repoKind === "personal");
      })
      : [];
    const incomingSignature =
      typeof indexPayload?.signature === "string" && indexPayload.signature.trim().length > 0
        ? indexPayload.signature.trim()
        : null;

    if (files.length === 0) {
      postWorkerEvent({ type: "INDEX_COMPLETE", totalIndexed: embeddingIndex.size });
      return toStats();
    }

    if (incomingSignature && activeSignature === incomingSignature && embeddingIndex.size > 0) {
      postWorkerEvent({ type: "INDEX_COMPLETE", totalIndexed: embeddingIndex.size });
      return toStats();
    }

    activeSignature = incomingSignature ?? "metadata-v2";
    await processIndexBatch(files);
    activeUpdatedAt = nowMs();
    return toStats();
  }

  if (type === "CANCEL_INDEXING") {
    cancelled = true;
    indexingQueue.length = 0;
    return {
      cancelled: true,
    };
  }

  if (type === "QUERY") {
    const queryPayload = payload as IntelligenceWorkerRequestMap["QUERY"];
    if (!isRecord(queryPayload)) {
      throw new Error("Invalid QUERY payload");
    }

    const query = typeof queryPayload.query === "string" ? queryPayload.query.trim() : "";
    const limit = typeof queryPayload.limit === "number" && Number.isFinite(queryPayload.limit)
      ? Math.max(1, Math.floor(queryPayload.limit))
      : 20;
    const scope = isSearchScope(queryPayload.scope)
      ? queryPayload.scope
      : ({ kind: "global-root" } as SearchScope);
    const repoFilter = queryPayload.repoFilter === "global" || queryPayload.repoFilter === "personal"
      ? queryPayload.repoFilter
      : "both";

    if (!query) {
      return {
        hits: [],
        tookMs: 0,
      };
    }

    const startedAt = nowMs();
    const queryVector = await getQueryVector(query);
    let hits: Array<{ id: string; score: number; document: IndexedEntry }> = [];

    for (const [fileId, item] of embeddingIndex.entries()) {
      const score = cosineSimilarity(queryVector, item.vector);
      if (score <= 0) {
        continue;
      }

      hits.push({
        id: fileId,
        score,
        document: item,
      });
    }

    if (repoFilter !== "both") {
      hits = hits.filter((hit) => hit.document.repoKind === repoFilter);
    }

    hits = applyScope(hits, scope);

    hits.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.id.localeCompare(right.id);
    });

    return {
      hits: hits.slice(0, limit).map((hit) => ({
        id: hit.id,
        score: hit.score,
        fileId: hit.document.fileId,
        name: hit.document.name,
        fullPath: hit.document.fullPath,
        ancestorIds: [...hit.document.ancestorIds],
        depth: hit.document.depth,
        isFolder: hit.document.isFolder,
        mimeType: hit.document.mimeType,
        repoKind: hit.document.repoKind,
        customFolderId: hit.document.customFolderId,
        semanticScore: hit.score,
      })),
      tookMs: Math.max(0, nowMs() - startedAt),
    };
  }

  if (type === "PERSIST") {
    const persistPayload = payload as IntelligenceWorkerRequestMap["PERSIST"];
    if (!isRecord(persistPayload) || typeof persistPayload.key !== "string" || persistPayload.key.trim().length === 0) {
      throw new Error("Persist key is required");
    }

    const key = persistPayload.key.trim();
    const vectors = Array.from(embeddingIndex.entries()).map(([fileId, entry]) => toSnapshotVector(fileId, entry));

    return {
      snapshot: {
        key,
        modelId: activeModelId ?? DEFAULT_MODEL_ID,
        signature: activeSignature ?? "metadata-v2",
        updatedAt: activeUpdatedAt ?? nowMs(),
        vectors,
      },
    };
  }

  if (type === "CLEAR_INDEX") {
    embeddingIndex.clear();
    queryVectorCache.clear();
    activeSignature = null;
    activeUpdatedAt = nowMs();
    await clearEmbeddingsDb().catch(() => undefined);
    return toStats();
  }

  if (type === "GET_STATS") {
    return toStats();
  }

  throw new Error(`Unsupported worker message type: ${String(type)}`);
}

workerScope.addEventListener("message", (event: MessageEvent<IntelligenceWorkerAnyRequestEnvelope>) => {
  const message = event.data;

  if (!message || typeof message.requestId !== "string" || typeof message.type !== "string") {
    return;
  }

  void (async () => {
    try {
      const payload = await handleRequest(message);
      const response: IntelligenceWorkerAnyResponseEnvelope = {
        requestId: message.requestId,
        type: message.type as never,
        ok: true,
        payload: payload as never,
      };
      workerScope.postMessage(response);
    } catch (error) {
      const response: IntelligenceWorkerAnyResponseEnvelope = {
        requestId: message.requestId,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown worker error",
      };
      workerScope.postMessage(response);
    }
  })();
});

workerScope.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  event.preventDefault();
});
