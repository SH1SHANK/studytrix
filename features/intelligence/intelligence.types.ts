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

export type SearchScope =
  | { kind: "global-root" }
  | { kind: "personal-root" }
  | {
    kind: "folder";
    folderId: string;
    folderName: string;
    repoKind: "global" | "personal";
    breadcrumb: Array<{ folderId: string; folderName: string }>;
  };

export interface IndexableEntity {
  fileId: string;
  name: string;
  fullPath: string;
  ancestorIds: string[];
  depth: number;
  isFolder: boolean;
  repoKind: "global" | "personal";
  customFolderId?: string;
  mimeType?: string;
  tags?: string[];
  size?: number;
  modifiedTime?: string;
}

export type FileEntry = IndexableEntity;

export interface IntelligenceIndexedVector {
  id: string;
  fileId: string;
  mimeType?: string;
  fullPath?: string;
  ancestorIds?: string[];
  repoKind?: "global" | "personal";
  customFolderId?: string;
  isFolder?: boolean;
  depth?: number;
  text: string;
  vector: number[];
  inputHash?: string;
  indexedAt?: number;
  lastAccessedAt?: number;
}

export interface IntelligenceIndexSnapshot {
  key: string;
  modelId: string;
  signature: string;
  updatedAt: number;
  vectors: IntelligenceIndexedVector[];
  oramaVersion?: string;
}

export interface IntelligenceSearchHit {
  id: string;
  score: number;
  fileId?: string;
  name?: string;
  fullPath?: string;
  ancestorIds?: string[];
  depth?: number;
  isFolder?: boolean;
  mimeType?: string;
  repoKind?: "global" | "personal";
  customFolderId?: string;
  semanticScore?: number;
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

export interface IntelligenceWorkerRequestMap {
  INIT: {
    modelId?: string;
    snapshot?: IntelligenceIndexSnapshot | null;
  };
  SET_MODEL: {
    modelId: string;
  };
  INDEX_FILES: {
    files: IndexableEntity[];
    signature?: string;
  };
  CANCEL_INDEXING: undefined;
  QUERY: {
    query: string;
    limit: number;
    scope: SearchScope;
    repoFilter?: "global" | "personal" | "both";
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
  INDEX_FILES: IntelligenceWorkerStats;
  CANCEL_INDEXING: {
    cancelled: boolean;
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
    type: "MODEL_DOWNLOAD_PROGRESS";
    loaded: number;
    total: number;
    percent: number | null;
    loadedBytes: number | null;
    totalBytes: number | null;
  }
  | {
    type: "MODEL_READY";
    modelId: string;
  }
  | {
    type: "MODEL_ERROR";
    message: string;
    retryable?: boolean;
  }
  | {
    type: "INDEX_PROGRESS";
    processed: number;
    total: number;
    currentFileName: string;
  }
  | {
    type: "INDEX_FILE_ERROR";
    fileId: string;
    error: string;
  }
  | {
    type: "INDEX_COMPLETE";
    totalIndexed: number;
  };

export type IntelligenceModelMode = "auto" | "manual";
