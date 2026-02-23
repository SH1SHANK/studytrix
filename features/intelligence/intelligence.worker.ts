/// <reference lib="webworker" />

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  ExtractionResult,
} from "./extractors/extractor.router";
import { extractTextContent } from "./extractors/extractor.router";
import { ocrImagePDF, ocrManager, shouldRunOCR } from "./extractors/extractor.ocr";
import { DUPLICATE_THRESHOLD, findDuplicates } from "./duplicate.detector";
import type {
  IntelligenceCleanTextResult,
  IntelligenceDocument,
  IntelligenceDuplicatePair,
  IntelligenceIndexSnapshot,
  IntelligenceIndexedVector,
  IntelligenceModelPipeline,
  IntelligenceWorkerAnyRequestEnvelope,
  IntelligenceWorkerAnyResponseEnvelope,
  IntelligenceWorkerEventMessage,
  IntelligenceWorkerRequestMap,
  IntelligenceWorkerStats,
} from "./intelligence.types";
import {
  INTELLIGENCE_BALANCED_MODEL_ID,
  INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID,
  INTELLIGENCE_FALLBACK_MODEL_ID,
  INTELLIGENCE_INDEX_PRUNE_BATCH,
  INTELLIGENCE_INDEX_PRUNE_TARGET,
  INTELLIGENCE_INDEX_SIZE_LIMIT,
  INTELLIGENCE_MAX_QUERY_CACHE_ENTRIES,
} from "./intelligence.constants";

type Embedder = (text: string) => Promise<number[]>;

type MaybeFeatureExtractionResult = {
  data?: ArrayLike<number>;
};

type MaybeGeneratedText = {
  generated_text?: string;
  summary_text?: string;
  text?: string;
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
    customFetch?: (url: string | URL, init?: RequestInit) => Promise<Response>;
  };
  pipeline?: TransformerPipelineFactory;
};

type CleanupPipelineTask = "text2text-generation" | "summarization";

interface CleanupRuntime {
  modelId: string;
  device: "webgpu" | "wasm" | "unknown";
  task: CleanupPipelineTask;
  pipeline: {
    dispose?: () => Promise<void> | void;
    (input: string, options?: Record<string, unknown>): Promise<unknown>;
  };
}

interface OfflineDbSchema extends DBSchema {
  files: {
    key: string;
    value: {
      fileId: string;
      blob: Blob;
      mimeType: string;
      size: number;
      modifiedTime: string | null;
      cachedAt: number;
      lastAccessedAt: number;
    };
  };
}

const OFFLINE_DB_NAME = "studytrix_offline";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_FILES_STORE = "files";

const workerScope = self as DedicatedWorkerGlobalScope;

let activeModelId: string | null = null;
let activeSignature: string | null = null;
let activeUpdatedAt: number | null = null;
let dimension = 0;
let embedder: Embedder | null = null;
let usingHashedFallback = false;
let cleanupModelId = INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;
let cleanupRuntime: CleanupRuntime | null = null;
let cleanupRuntimeLoadPromise: Promise<CleanupRuntime> | null = null;
let transformersModulePromise: Promise<TransformersModule> | null = null;

/** Processing lock — prevents concurrent INDEX_DOCS / OCR_QUEUE batches. */
let isProcessingBatch = false;
const deferredMessages: IntelligenceWorkerAnyRequestEnvelope[] = [];

/** Inference lock — set while the embedder is running so QUERY can defer. */
let isInferenceActive = false;

const indexedVectors = new Map<string, IntelligenceIndexedVector>();
const queryVectorCache = new Map<string, number[]>();
let offlineDbPromise: Promise<IDBPDatabase<OfflineDbSchema> | null> | null = null;
let offlineDbDisabled = false;

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

/**
 * SHA-1 based input hash via `crypto.subtle` — available in Web Worker contexts.
 * Provides sufficient collision resistance for library sizes > 5,000 files.
 * Falls back to FNV-1a if `crypto.subtle` is unavailable.
 */
async function computeInputHash(text: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoded = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest("SHA-1", encoded);
      const bytes = new Uint8Array(digest);
      let hex = "";
      for (const byte of bytes) {
        hex += byte.toString(16).padStart(2, "0");
      }
      return hex;
    }
  } catch {
    // Fall through to FNV fallback.
  }

  return hashString(text);
}

function resolveVectorDimension(modelId: string): number {
  const normalized = modelId.toLowerCase();

  if (normalized.includes("minilm")) {
    return 384;
  }

  if (normalized.includes("bge")) {
    return 384;
  }

  return 384;
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

async function createTransformerEmbedder(modelId: string): Promise<Embedder> {
  const transformers = await getTransformersModule();

  if (!transformers.pipeline) {
    throw new Error("Transformers pipeline factory not available");
  }

  const featureExtractionPipeline = await transformers.pipeline("feature-extraction", modelId, {
    quantized: true,
    progress_callback: createProgressCallback("embedding", modelId),
  }) as (input: string, options?: Record<string, unknown>) => Promise<MaybeFeatureExtractionResult>;

  return async (input: string): Promise<number[]> => {
    const formattedInput = modelId.toLowerCase().includes("bge")
      ? `Represent this sentence for searching relevant passages: ${input}`
      : input;

    const output = await featureExtractionPipeline(formattedInput, {
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

  postWorkerEvent({
    type: "MODEL_PIPELINE_STATUS",
    pipeline: "embedding",
    modelId,
    status: "loading",
  });

  activeModelId = modelId;
  usingHashedFallback = false;

  try {
    embedder = await createTransformerEmbedder(modelId);
  } catch {
    usingHashedFallback = true;
    embedder = createHashedEmbedder(modelId);
    postWorkerEvent({
      type: "MODEL_PIPELINE_STATUS",
      pipeline: "embedding",
      modelId,
      status: "error",
      message: "Using hashed fallback embeddings",
    });
  }

  dimension = resolveVectorDimension(modelId);
  queryVectorCache.clear();

  postWorkerEvent({
    type: "MODEL_PIPELINE_STATUS",
    pipeline: "embedding",
    modelId,
    status: "ready",
  });
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
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

function createProgressCallback(
  pipeline: IntelligenceModelPipeline,
  modelId: string,
): (payload: TransformerProgress) => void {
  return (payload: TransformerProgress) => {
    const loadedBytes = toFiniteNumber(payload.loaded);
    const totalBytes = toFiniteNumber(payload.total);
    const percent = getProgressPercent(payload);

    postWorkerEvent({
      type: "MODEL_DOWNLOAD_PROGRESS",
      pipeline,
      modelId,
      percent,
      loadedBytes,
      totalBytes,
    });
  };
}

async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  retries = 5,
  baseDelayMs = 500,
): Promise<Response> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url, init);

      // Successfully fetched, or it's a client error (except 408/429) that shouldn't be retried.
      if (
        response.ok
        || (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429)
      ) {
        return response;
      }

      // If it's a 5xx error or 408/429, we throw to trigger the retry logic.
      throw new Error(`HTTP ${response.status} - Transient error`);
    } catch (error) {
      attempt += 1;

      if (attempt >= retries) {
        throw error;
      }

      // Exponential backoff with a bit of jitter to prevent thundering herds
      const jitter = Math.random() * 200;
      const delay = baseDelayMs * 2 ** (attempt - 1) + jitter;

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  throw new Error("Maximum retries reached");
}

async function getTransformersModule(): Promise<TransformersModule> {
  if (!transformersModulePromise) {
    transformersModulePromise = (async () => {
      const moduleId = "@huggingface/transformers";
      const transformers = await import(moduleId) as TransformersModule;

      if (transformers.env) {
        transformers.env.allowRemoteModels = true;
        transformers.env.allowLocalModels = true;
        transformers.env.useBrowserCache = true;
        transformers.env.customFetch = fetchWithRetry;
      }

      return transformers;
    })();
  }

  return transformersModulePromise;
}

function cleanupTaskForModel(modelId: string): CleanupPipelineTask {
  return modelId.toLowerCase().includes("bart")
    ? "summarization"
    : "text2text-generation";
}

function parseGeneratedText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const first = value[0] as MaybeGeneratedText | undefined;
    if (first) {
      return (
        first.generated_text
        ?? first.summary_text
        ?? first.text
        ?? ""
      ).trim();
    }
  }

  if (isRecord(value)) {
    const generated = value.generated_text;
    if (typeof generated === "string") {
      return generated.trim();
    }
    const summary = value.summary_text;
    if (typeof summary === "string") {
      return summary.trim();
    }
    const text = value.text;
    if (typeof text === "string") {
      return text.trim();
    }
  }

  return "";
}

function estimatedTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function buildCleanupPrompt(modelId: string, input: string): string {
  if (modelId.toLowerCase().includes("t5")) {
    return `fix errors: ${input}`;
  }

  return input;
}

function cleanupGenerationOptions(modelId: string, input: string): Record<string, unknown> {
  const estimatedTokens = estimatedTokenCount(input);
  const maxNewTokens = Math.max(32, Math.min(512, Math.round(estimatedTokens * 1.15)));

  if (modelId.toLowerCase().includes("bart")) {
    return {
      do_sample: false,
      temperature: 0,
      repetition_penalty: 1.2,
      max_new_tokens: maxNewTokens,
      min_length: Math.max(24, Math.round(estimatedTokens * 0.4)),
    };
  }

  return {
    do_sample: false,
    temperature: 0,
    repetition_penalty: 1.2,
    max_new_tokens: maxNewTokens,
  };
}

async function disposeCleanupRuntime(): Promise<void> {
  if (!cleanupRuntime) {
    return;
  }

  const runtime = cleanupRuntime;
  cleanupRuntime = null;

  try {
    await runtime.pipeline.dispose?.();
  } catch {
    // Ignore disposal failures.
  }
}

async function createCleanupRuntime(modelId: string): Promise<CleanupRuntime> {
  const transformers = await getTransformersModule();
  if (!transformers.pipeline) {
    throw new Error("Transformers pipeline factory not available");
  }

  const task = cleanupTaskForModel(modelId);
  const pipelineFactory = transformers.pipeline;

  const prefersWebGpu =
    typeof navigator !== "undefined"
    && "gpu" in navigator
    && (navigator as Navigator & { gpu?: unknown }).gpu !== undefined;

  const candidates: Array<{ device: "webgpu" | "wasm" | "unknown"; option?: "webgpu" | "wasm" }> = prefersWebGpu
    ? [
      { device: "webgpu", option: "webgpu" },
      { device: "wasm", option: "wasm" },
    ]
    : [{ device: "wasm", option: "wasm" }];

  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      const pipeline = await pipelineFactory(task, modelId, {
        quantized: true,
        device: candidate.option,
        progress_callback: createProgressCallback("cleanup", modelId),
      }) as CleanupRuntime["pipeline"];

      return {
        modelId,
        task,
        device: candidate.device,
        pipeline,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Cleanup pipeline load failed");
    }
  }

  throw lastError ?? new Error("Cleanup pipeline unavailable");
}

async function ensureCleanupRuntime(modelId: string): Promise<CleanupRuntime> {
  if (cleanupRuntime && cleanupRuntime.modelId === modelId) {
    return cleanupRuntime;
  }

  if (cleanupRuntimeLoadPromise && cleanupModelId === modelId) {
    return cleanupRuntimeLoadPromise;
  }

  cleanupModelId = modelId;

  postWorkerEvent({
    type: "MODEL_PIPELINE_STATUS",
    pipeline: "cleanup",
    modelId,
    status: "loading",
  });

  cleanupRuntimeLoadPromise = (async () => {
    await disposeCleanupRuntime();
    const runtime = await createCleanupRuntime(modelId);
    cleanupRuntime = runtime;
    return runtime;
  })();

  try {
    const runtime = await cleanupRuntimeLoadPromise;
    postWorkerEvent({
      type: "MODEL_PIPELINE_STATUS",
      pipeline: "cleanup",
      modelId,
      status: "ready",
    });
    return runtime;
  } catch (error) {
    cleanupRuntime = null;
    postWorkerEvent({
      type: "MODEL_PIPELINE_STATUS",
      pipeline: "cleanup",
      modelId,
      status: "error",
      message: error instanceof Error ? error.message : "Cleanup model load failed",
    });
    throw error;
  } finally {
    cleanupRuntimeLoadPromise = null;
  }
}

async function cleanText(input: string, modelId: string): Promise<IntelligenceCleanTextResult> {
  const source = input.trim();
  if (!source) {
    return {
      text: "",
      modelId,
      cleaned: false,
      usedFallback: true,
      reason: "empty_input",
    };
  }

  try {
    const runtime = await ensureCleanupRuntime(modelId);
    const prompt = buildCleanupPrompt(runtime.modelId, source);
    const output = await runtime.pipeline(prompt, cleanupGenerationOptions(runtime.modelId, source));
    const cleaned = parseGeneratedText(output);

    if (!cleaned) {
      return {
        text: source,
        modelId: runtime.modelId,
        cleaned: false,
        usedFallback: true,
        reason: "empty_output",
      };
    }

    return {
      text: cleaned,
      modelId: runtime.modelId,
      cleaned: true,
      usedFallback: false,
    };
  } catch (error) {
    return {
      text: source,
      modelId,
      cleaned: false,
      usedFallback: true,
      reason: error instanceof Error ? error.message : "cleanup_failed",
    };
  }
}

function composeText(doc: IntelligenceDocument): string {
  const parts = [
    doc.title,
    doc.subtitle ?? "",
    ...(doc.keywords ?? []),
    ...(doc.tags ?? []),
    doc.group ?? "",
    doc.text ?? "",
  ];

  return parts
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ");
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

async function getOfflineDb(): Promise<IDBPDatabase<OfflineDbSchema> | null> {
  if (offlineDbDisabled) {
    return null;
  }

  if (!offlineDbPromise) {
    offlineDbPromise = (async () => {
      try {
        return await openDB<OfflineDbSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      } catch {
        offlineDbDisabled = true;
        return null;
      }
    })();
  }

  return offlineDbPromise;
}

async function getOfflineBlob(fileId: string): Promise<Blob | null> {
  if (!fileId.trim()) {
    return null;
  }

  const db = await getOfflineDb();
  if (!db) {
    return null;
  }

  try {
    const record = await db.get(OFFLINE_FILES_STORE, fileId.trim());
    return record?.blob ?? null;
  } catch {
    return null;
  }
}

function buildEmbeddingInput(params: {
  fullPath: string;
  extractedText: string | null;
  tagsText: string;
}): string {
  const parts = [
    "Represent this sentence for searching relevant passages:",
    params.fullPath,
    params.extractedText ?? "",
    params.tagsText,
  ];

  return parts
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ")
    .trim();
}

async function extractForDocument(doc: IntelligenceDocument): Promise<ExtractionResult> {
  const fileId = (doc.fileId ?? doc.entityId ?? "").trim();
  const mimeType = (doc.mimeType ?? "").trim();

  if (!fileId || !mimeType) {
    return {
      text: null,
      isImageBased: false,
    };
  }

  const cachedBlob = await getOfflineBlob(fileId);
  if (!cachedBlob) {
    return {
      text: null,
      isImageBased: false,
    };
  }

  try {
    const arrayBuffer = await cachedBlob.arrayBuffer();

    // Guard against detached ArrayBuffers (e.g. if transferred via Transferable).
    if (arrayBuffer.byteLength === 0) {
      return {
        text: null,
        isImageBased: false,
      };
    }

    return await extractTextContent(arrayBuffer, mimeType);
  } catch {
    return {
      text: null,
      isImageBased: false,
    };
  }
}

function pruneIndexIfNeeded(): void {
  if (indexedVectors.size < INTELLIGENCE_INDEX_SIZE_LIMIT) {
    return;
  }

  const sorted = [...indexedVectors.entries()]
    .sort((left, right) => (left[1].indexedAt ?? 0) - (right[1].indexedAt ?? 0));

  // Prune down to target (9,000) rather than removing a fixed batch,
  // providing headroom for burst indexing.
  const excess = indexedVectors.size - INTELLIGENCE_INDEX_PRUNE_TARGET;
  const removeCount = Math.max(INTELLIGENCE_INDEX_PRUNE_BATCH, excess);
  const removable = sorted.slice(0, removeCount);
  for (const [id] of removable) {
    indexedVectors.delete(id);
  }
}

function getVectorsByFileId(fileId: string): IntelligenceIndexedVector[] {
  const matches: IntelligenceIndexedVector[] = [];

  for (const entry of indexedVectors.values()) {
    if (entry.fileId === fileId || entry.entityId === fileId) {
      matches.push(entry);
    }
  }

  return matches;
}

async function getQueryVector(query: string): Promise<number[]> {
  const modelId = activeModelId ?? INTELLIGENCE_FALLBACK_MODEL_ID;
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
    indexSize: indexedVectors.size,
    signature: activeSignature,
    updatedAt: activeUpdatedAt,
    dimension,
    usingHashedFallback,
  };
}

function resetIndex(signature: string): void {
  indexedVectors.clear();
  queryVectorCache.clear();
  activeSignature = signature;
  activeUpdatedAt = nowMs();
}

function restoreFromSnapshot(snapshot: IntelligenceIndexSnapshot): void {
  indexedVectors.clear();

  for (const entry of snapshot.vectors) {
    indexedVectors.set(entry.id, {
      ...entry,
      vector: [...entry.vector],
    });
  }

  activeSignature = snapshot.signature;
  activeUpdatedAt = snapshot.updatedAt;
  dimension = snapshot.vectors[0]?.vector.length ?? dimension;
}

function postWorkerEvent(message: IntelligenceWorkerEventMessage): void {
  workerScope.postMessage(message);
}

async function handleOcrQueue(fileIds: string[]): Promise<{
  processed: number;
  enriched: number;
  lowConfidence: number;
  skipped: boolean;
}> {
  if (!shouldRunOCR()) {
    postWorkerEvent({ type: "OCR_SKIPPED" });
    return {
      processed: 0,
      enriched: 0,
      lowConfidence: 0,
      skipped: true,
    };
  }

  const activeEmbedder = embedder;
  if (!activeEmbedder) {
    return {
      processed: 0,
      enriched: 0,
      lowConfidence: 0,
      skipped: false,
    };
  }

  let processed = 0;
  let enriched = 0;
  let lowConfidence = 0;

  const uniqueIds = [...new Set(fileIds.map((value) => value.trim()).filter(Boolean))];

  for (const fileId of uniqueIds) {
    const matchingVectors = getVectorsByFileId(fileId)
      .filter((entry) => entry.isImageBased === true && entry.hasExtractedText !== true);
    if (matchingVectors.length === 0) {
      continue;
    }

    const blob = await getOfflineBlob(fileId);
    if (!blob) {
      continue;
    }

    const mimeType = (matchingVectors[0].mimeType ?? blob.type ?? "").toLowerCase();
    let ocrText: string | null = null;

    if (mimeType === "application/pdf") {
      const arrayBuffer = await blob.arrayBuffer();
      ocrText = await ocrImagePDF(arrayBuffer);
    } else if (mimeType.startsWith("image/")) {
      ocrText = await ocrManager.processImage(blob);
    } else {
      continue;
    }

    processed += 1;

    if (!ocrText) {
      lowConfidence += 1;
      for (const entry of matchingVectors) {
        entry.lowConfidence = true;
      }
      continue;
    }

    enriched += 1;
    const normalizedOcrText = ocrText.replace(/\s+/g, " ").trim();

    for (const entry of matchingVectors) {
      const embeddingInput = buildEmbeddingInput({
        fullPath: entry.fullPath ?? entry.text,
        extractedText: normalizedOcrText,
        tagsText: entry.tagsText ?? "",
      });

      const nextVector = await activeEmbedder(embeddingInput);
      const inputHash = await computeInputHash(embeddingInput);

      indexedVectors.set(entry.id, {
        ...entry,
        text: embeddingInput,
        vector: nextVector,
        inputHash,
        indexedAt: nowMs(),
        isImageBased: true,
        hasExtractedText: true,
        lowConfidence: false,
      });
    }
  }

  await ocrManager.terminateWorker();
  activeUpdatedAt = nowMs();

  return {
    processed,
    enriched,
    lowConfidence,
    skipped: false,
  };
}

async function detectDuplicatePairs(threshold: number): Promise<IntelligenceDuplicatePair[]> {
  const vectorsByFileId = new Map<string, { vector: Float32Array }>();

  for (const entry of indexedVectors.values()) {
    const fileId = (entry.fileId ?? entry.entityId ?? "").trim();
    if (!fileId) {
      continue;
    }

    if (!vectorsByFileId.has(fileId)) {
      vectorsByFileId.set(fileId, {
        vector: new Float32Array(entry.vector),
      });
    }
  }

  const allPairs = await findDuplicates(vectorsByFileId);
  return allPairs.filter((pair) => pair.similarity >= threshold);
}

async function handleRequest(message: IntelligenceWorkerAnyRequestEnvelope): Promise<unknown> {
  const { type, payload } = message;

  if (type === "INIT") {
    const initPayload = payload as IntelligenceWorkerRequestMap["INIT"];
    const modelId = isRecord(initPayload) && typeof initPayload.modelId === "string"
      ? initPayload.modelId
      : INTELLIGENCE_FALLBACK_MODEL_ID;
    const previousModelId = activeModelId;

    await ensureEmbedder(modelId || INTELLIGENCE_BALANCED_MODEL_ID);

    const snapshot = isRecord(initPayload) && isRecord(initPayload.snapshot)
      ? initPayload.snapshot as IntelligenceIndexSnapshot
      : null;

    if (snapshot && snapshot.modelId === modelId) {
      restoreFromSnapshot(snapshot);
    } else if (previousModelId && previousModelId !== modelId) {
      indexedVectors.clear();
      activeSignature = null;
      activeUpdatedAt = nowMs();
    }

    return toStats();
  }

  if (type === "SET_MODEL") {
    const setModelPayload = payload as IntelligenceWorkerRequestMap["SET_MODEL"];
    const modelId = isRecord(setModelPayload) && typeof setModelPayload.modelId === "string"
      ? setModelPayload.modelId
      : "";

    if (!modelId) {
      throw new Error("Model id is required");
    }

    const previousModelId = activeModelId;
    await ensureEmbedder(modelId);

    if (previousModelId !== modelId) {
      indexedVectors.clear();
      activeSignature = null;
      activeUpdatedAt = nowMs();
    }

    return toStats();
  }

  if (type === "INDEX_DOCS") {
    const indexPayload = payload as IntelligenceWorkerRequestMap["INDEX_DOCS"];
    if (!isRecord(indexPayload)) {
      throw new Error("Invalid INDEX_DOCS payload");
    }

    const docs = Array.isArray(indexPayload.docs)
      ? indexPayload.docs.filter((doc: unknown): doc is IntelligenceDocument => isRecord(doc) && typeof doc.id === "string")
      : [];
    const signature = typeof indexPayload.signature === "string" ? indexPayload.signature : "";
    const replace = indexPayload.replace === true;

    if (!signature) {
      throw new Error("Index signature is required");
    }

    if (replace || activeSignature !== signature) {
      resetIndex(signature);
    }

    pruneIndexIfNeeded();

    const activeEmbedder = embedder;
    if (!activeEmbedder) {
      throw new Error("Embedder unavailable");
    }

    isInferenceActive = true;
    try {
      for (const doc of docs) {
        const fileId = (doc.fileId ?? doc.entityId ?? "").trim();
        const fullPath = (doc.fullPath ?? `${doc.title} ${doc.subtitle ?? ""}`).replace(/\s+/g, " ").trim();
        const tagsText = [...(doc.tags ?? []), ...(doc.keywords ?? [])].join(" ").replace(/\s+/g, " ").trim();

        let extractionResult: ExtractionResult = {
          text: null,
          isImageBased: false,
        };

        try {
          extractionResult = await extractForDocument(doc);
        } catch {
          // Extraction failures should never block indexing.
          extractionResult = {
            text: null,
            isImageBased: false,
          };
        }

        const embeddingInput = buildEmbeddingInput({
          fullPath: fullPath || composeText(doc),
          extractedText: extractionResult.text,
          tagsText,
        });

        if (!embeddingInput) {
          continue;
        }

        const inputHash = await computeInputHash(embeddingInput);
        const existingEntry = indexedVectors.get(doc.id);

        if (existingEntry?.inputHash === inputHash) {
          indexedVectors.set(doc.id, {
            ...existingEntry,
            fileId,
            mimeType: doc.mimeType ?? existingEntry.mimeType,
            fullPath: fullPath || existingEntry.fullPath,
            tagsText,
            isImageBased: extractionResult.isImageBased,
            hasExtractedText: Boolean(extractionResult.text),
          });
          continue;
        }

        const vector = await activeEmbedder(embeddingInput);
        indexedVectors.set(doc.id, {
          id: doc.id,
          entityId: doc.entityId,
          fileId,
          mimeType: doc.mimeType,
          text: embeddingInput,
          vector,
          inputHash,
          indexedAt: nowMs(),
          lastAccessedAt: nowMs(),
          isImageBased: extractionResult.isImageBased,
          hasExtractedText: Boolean(extractionResult.text),
          lowConfidence: false,
          fullPath,
          tagsText,
        });
      }
    } finally {
      isInferenceActive = false;
    }

    activeUpdatedAt = nowMs();
    return toStats();
  }

  if (type === "OCR_QUEUE") {
    const ocrPayload = payload as IntelligenceWorkerRequestMap["OCR_QUEUE"];
    const fileIds = Array.isArray(ocrPayload?.fileIds)
      ? ocrPayload.fileIds.filter((value): value is string => typeof value === "string")
      : [];

    isInferenceActive = true;
    try {
      return await handleOcrQueue(fileIds);
    } finally {
      isInferenceActive = false;
    }
  }

  if (type === "SWITCH_MODEL") {
    const switchPayload = payload as IntelligenceWorkerRequestMap["SWITCH_MODEL"];
    const requestedModelId = typeof switchPayload?.modelId === "string"
      ? switchPayload.modelId.trim()
      : "";
    const modelId = requestedModelId || INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;

    try {
      const runtime = await ensureCleanupRuntime(modelId);
      return {
        modelId: runtime.modelId,
        ready: true,
        device: runtime.device,
      };
    } catch {
      return {
        modelId,
        ready: false,
        device: "unknown" as const,
      };
    }
  }

  if (type === "CLEAN_TEXT") {
    const cleanPayload = payload as IntelligenceWorkerRequestMap["CLEAN_TEXT"];
    const text = typeof cleanPayload?.text === "string" ? cleanPayload.text : "";
    const requestedModelId = typeof cleanPayload?.modelId === "string"
      ? cleanPayload.modelId.trim()
      : "";
    const modelId = requestedModelId || cleanupModelId || INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;

    return cleanText(text, modelId);
  }

  if (type === "DETECT_DUPLICATES") {
    const detectPayload = payload as IntelligenceWorkerRequestMap["DETECT_DUPLICATES"];
    const threshold = typeof detectPayload?.threshold === "number"
      ? Math.max(0, Math.min(1, detectPayload.threshold))
      : DUPLICATE_THRESHOLD;

    const pairs = await detectDuplicatePairs(threshold);
    postWorkerEvent({
      type: "DUPLICATES_FOUND",
      pairs,
    });

    return {
      pairs,
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

    if (!query) {
      return {
        hits: [],
        tookMs: 0,
      };
    }

    // If the embedder is mid-inference (INDEX_DOCS / OCR_QUEUE), wait up to
    // 1500 ms for it to finish. If it doesn't yield, return empty rather than
    // blocking the user's search.
    if (isInferenceActive) {
      const waited = await new Promise<boolean>((resolve) => {
        const start = nowMs();
        const check = () => {
          if (!isInferenceActive) {
            resolve(true);
            return;
          }
          if (nowMs() - start >= 1500) {
            resolve(false);
            return;
          }
          setTimeout(check, 50);
        };
        check();
      });

      if (!waited) {
        return {
          hits: [],
          tookMs: 0,
        };
      }
    }

    const startedAt = nowMs();
    const queryVector = await getQueryVector(query);
    const hits: Array<{ id: string; score: number }> = [];

    for (const item of indexedVectors.values()) {
      const score = cosineSimilarity(queryVector, item.vector);
      if (score <= 0) {
        continue;
      }

      item.lastAccessedAt = nowMs();
      hits.push({
        id: item.id,
        score,
      });
    }

    hits.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.id.localeCompare(right.id);
    });

    return {
      hits: hits.slice(0, limit),
      tookMs: Math.max(0, nowMs() - startedAt),
    };
  }

  if (type === "PERSIST") {
    const persistPayload = payload as IntelligenceWorkerRequestMap["PERSIST"];
    if (!isRecord(persistPayload) || typeof persistPayload.key !== "string" || persistPayload.key.trim().length === 0) {
      throw new Error("Persist key is required");
    }

    await ocrManager.terminateWorker();
    await disposeCleanupRuntime();

    const baseSnapshot = {
      key: persistPayload.key.trim(),
      modelId: activeModelId ?? INTELLIGENCE_FALLBACK_MODEL_ID,
      signature: activeSignature ?? "",
      updatedAt: activeUpdatedAt ?? nowMs(),
    };

    // Attempt full serialisation; if it fails (e.g. out-of-memory on large
    // indices), fall back to saving only the most recent 1,000 entries.
    try {
      const allVectors = Array.from(indexedVectors.values()).map((item) => ({
        ...item,
        vector: [...item.vector],
      }));

      return {
        snapshot: {
          ...baseSnapshot,
          vectors: allVectors,
        },
      };
    } catch {
      const recent = Array.from(indexedVectors.values())
        .sort((a, b) => (b.indexedAt ?? 0) - (a.indexedAt ?? 0))
        .slice(0, 1000)
        .map((item) => ({
          ...item,
          vector: [...item.vector],
        }));

      return {
        snapshot: {
          ...baseSnapshot,
          vectors: recent,
        },
      };
    }
  }

  if (type === "CLEAR_INDEX") {
    indexedVectors.clear();
    queryVectorCache.clear();
    activeSignature = null;
    activeUpdatedAt = nowMs();
    await ocrManager.terminateWorker();
    await disposeCleanupRuntime();
    return toStats();
  }

  if (type === "GET_STATS") {
    return toStats();
  }

  throw new Error(`Unsupported worker message type: ${String(type)}`);
}

/** Drain any messages that were queued while a batch was processing. */
async function drainDeferredMessages(): Promise<void> {
  while (deferredMessages.length > 0) {
    const next = deferredMessages.shift();
    if (!next) {
      break;
    }

    try {
      const payload = await handleRequest(next);
      const response: IntelligenceWorkerAnyResponseEnvelope = {
        requestId: next.requestId,
        type: next.type as never,
        ok: true,
        payload: payload as never,
      };
      workerScope.postMessage(response);
    } catch (error) {
      const response: IntelligenceWorkerAnyResponseEnvelope = {
        requestId: next.requestId,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown worker error",
      };
      workerScope.postMessage(response);
    }
  }
}

workerScope.addEventListener("message", (event: MessageEvent<IntelligenceWorkerAnyRequestEnvelope>) => {
  const message = event.data;

  if (!message || typeof message.requestId !== "string" || typeof message.type !== "string") {
    return;
  }

  // If a batch (INDEX_DOCS / OCR_QUEUE) is processing, queue subsequent
  // batch messages to prevent interleaving. Queries are still handled
  // immediately (the QUERY handler has its own deferral logic).
  const isBatchType = message.type === "INDEX_DOCS" || message.type === "OCR_QUEUE";
  if (isBatchType && isProcessingBatch) {
    deferredMessages.push(message);
    return;
  }

  void (async () => {
    if (isBatchType) {
      isProcessingBatch = true;
    }

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
    } finally {
      if (isBatchType) {
        isProcessingBatch = false;
        await drainDeferredMessages();
      }
    }
  })();
});

// Prevent silent crashes from unhandled promise rejections inside the worker.
workerScope.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  event.preventDefault();
});
