export type IntelligenceModelTier = "small" | "balanced" | "quality";

export type IntelligenceModelRecommendation = "low_end" | "balanced" | "high_end";

export type IntelligenceModelStatus = "active" | "deprecated";

export interface IntelligenceModelConfig {
  id: string;
  label: string;
  sizeMb: number;
  embeddingDim: number;
  tier: IntelligenceModelTier;
  recommendedFor: IntelligenceModelRecommendation;
  status: IntelligenceModelStatus;
}

export interface IntelligenceModelCatalog {
  version: string;
  models: IntelligenceModelConfig[];
  defaults: {
    autoLowEnd: string;
    autoBalanced: string;
  };
  fetchedAt: number;
}

export interface IntelligenceDocument {
  id: string;
  entityId?: string;
  fileId?: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  tags?: string[];
  group?: string;
  text?: string;
  mimeType?: string;
  fullPath?: string;
}

export interface IntelligenceIndexedVector {
  id: string;
  entityId?: string;
  fileId?: string;
  mimeType?: string;
  fullPath?: string;
  tagsText?: string;
  text: string;
  vector: number[];
  inputHash?: string;
  indexedAt?: number;
  lastAccessedAt?: number;
  isImageBased?: boolean;
  hasExtractedText?: boolean;
  lowConfidence?: boolean;
}

export interface IntelligenceIndexSnapshot {
  key: string;
  modelId: string;
  signature: string;
  updatedAt: number;
  vectors: IntelligenceIndexedVector[];
  /** Library version at serialisation time — used to discard incompatible stored indices. */
  oramaVersion?: string;
}

export interface IntelligenceSearchHit {
  id: string;
  score: number;
}

export interface IntelligenceWorkerStats {
  ready: boolean;
  modelId: string | null;
  indexSize: number;
  signature: string | null;
  updatedAt: number | null;
  dimension: number;
  usingHashedFallback: boolean;
}

export interface IntelligenceCleanTextResult {
  text: string;
  modelId: string;
  cleaned: boolean;
  usedFallback: boolean;
  reason?: string;
}

export type IntelligenceModelPipeline = "embedding" | "cleanup";

export interface IntelligenceDuplicatePair {
  fileIdA: string;
  fileIdB: string;
  similarity: number;
}

export interface IntelligenceWorkerRequestMap {
  INIT: {
    modelId: string;
    snapshot?: IntelligenceIndexSnapshot | null;
  };
  SET_MODEL: {
    modelId: string;
  };
  INDEX_DOCS: {
    docs: IntelligenceDocument[];
    signature: string;
    replace?: boolean;
  };
  OCR_QUEUE: {
    fileIds: string[];
  };
  SWITCH_MODEL: {
    modelId: string;
  };
  CLEAN_TEXT: {
    text: string;
    modelId?: string;
  };
  DETECT_DUPLICATES: {
    threshold?: number;
  };
  QUERY: {
    query: string;
    limit: number;
    scopeSignature?: string;
  };
  PERSIST: {
    key: string;
  };
  CLEAR_INDEX: {
    key?: string;
  };
  GET_STATS: undefined;
}

export interface IntelligenceWorkerResponseMap {
  INIT: IntelligenceWorkerStats;
  SET_MODEL: IntelligenceWorkerStats;
  INDEX_DOCS: IntelligenceWorkerStats;
  OCR_QUEUE: {
    processed: number;
    enriched: number;
    lowConfidence: number;
    skipped: boolean;
  };
  SWITCH_MODEL: {
    modelId: string;
    ready: boolean;
    device: "webgpu" | "wasm" | "unknown";
  };
  CLEAN_TEXT: IntelligenceCleanTextResult;
  DETECT_DUPLICATES: {
    pairs: IntelligenceDuplicatePair[];
  };
  QUERY: {
    hits: IntelligenceSearchHit[];
    tookMs: number;
  };
  PERSIST: {
    snapshot: IntelligenceIndexSnapshot;
  };
  CLEAR_INDEX: IntelligenceWorkerStats;
  GET_STATS: IntelligenceWorkerStats;
}

export interface IntelligenceWorkerRequestEnvelope<T extends keyof IntelligenceWorkerRequestMap> {
  requestId: string;
  type: T;
  payload: IntelligenceWorkerRequestMap[T];
}

export interface IntelligenceWorkerSuccessEnvelope<T extends keyof IntelligenceWorkerResponseMap> {
  requestId: string;
  type: T;
  ok: true;
  payload: IntelligenceWorkerResponseMap[T];
}

export interface IntelligenceWorkerErrorEnvelope {
  requestId: string;
  ok: false;
  error: string;
}

export type IntelligenceWorkerResponseEnvelope<T extends keyof IntelligenceWorkerResponseMap> =
  | IntelligenceWorkerSuccessEnvelope<T>
  | IntelligenceWorkerErrorEnvelope;

export type IntelligenceWorkerAnyRequestEnvelope = {
  requestId: string;
  type: keyof IntelligenceWorkerRequestMap;
  payload: IntelligenceWorkerRequestMap[keyof IntelligenceWorkerRequestMap];
};

export type IntelligenceWorkerAnyResponseEnvelope =
  | IntelligenceWorkerSuccessEnvelope<keyof IntelligenceWorkerResponseMap>
  | IntelligenceWorkerErrorEnvelope;

export type IntelligenceWorkerEventMessage =
  | {
    type: "DUPLICATES_FOUND";
    pairs: IntelligenceDuplicatePair[];
  }
  | {
    type: "OCR_SKIPPED";
  }
  | {
    type: "MODEL_DOWNLOAD_PROGRESS";
    pipeline: IntelligenceModelPipeline;
    modelId: string;
    percent: number | null;
    loadedBytes: number | null;
    totalBytes: number | null;
  }
  | {
    type: "MODEL_PIPELINE_STATUS";
    pipeline: IntelligenceModelPipeline;
    modelId: string;
    status: "idle" | "loading" | "ready" | "error";
    message?: string;
  };

export type IntelligenceModelMode = "auto" | "manual";
