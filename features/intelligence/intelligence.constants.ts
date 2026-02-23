export const INTELLIGENCE_DB_NAME = "studytrix_intelligence";
export const INTELLIGENCE_DB_VERSION = 1;
export const INTELLIGENCE_INDEX_STORE = "semantic_index";

export const INTELLIGENCE_SETTINGS_IDS = {
  smartSearchEnabled: "intelligence_smart_search_enabled",
  ocrEnabled: "intelligence_ocr_enabled",
  duplicateDetectionEnabled: "intelligence_duplicate_detection_enabled",
  modelMode: "intelligence_model_mode",
  modelId: "intelligence_model_id",
  cleanupModelId: "intelligence_cleanup_model_id",
  clearIndex: "intelligence_clear_index",
  semanticWeight: "intelligence_semantic_weight",
} as const;

export const INTELLIGENCE_QUERY_DEBOUNCE_MS = 300;
export const INTELLIGENCE_QUERY_TIMEOUT_MS = 2000;
export const INTELLIGENCE_INDEX_CHUNK_SIZE = 64;
export const INTELLIGENCE_MAX_QUERY_CACHE_ENTRIES = 150;

export const INTELLIGENCE_FALLBACK_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const INTELLIGENCE_BALANCED_MODEL_ID = "Xenova/bge-small-en-v1.5";

export const INTELLIGENCE_KEYWORD_SCORE_CAP = 180;
export const INTELLIGENCE_INDEX_SIZE_LIMIT = 9_500;
export const INTELLIGENCE_INDEX_PRUNE_BATCH = 500;
export const INTELLIGENCE_INDEX_PRUNE_TARGET = 9_000;

export const INTELLIGENCE_QUEUE_MAX_DEPTH = 500;
export const INTELLIGENCE_OCR_STARVATION_MS = 60_000;

export const INTELLIGENCE_MODEL_CATALOG_ENDPOINT = "/api/intelligence/models";

export type IntelligenceCleanupModelTier = "lite" | "balanced" | "pro";

export interface IntelligenceCleanupModel {
  id: string;
  label: string;
  sizeMb: number;
  quantization: "q4";
  tier: IntelligenceCleanupModelTier;
}

export const INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID = "Xenova/t5-tiny";
export const INTELLIGENCE_CLEANUP_MODEL_STORAGE_KEY = "studytrix.intelligence.cleanup_model.v1";

export const INTELLIGENCE_CLEANUP_MODELS: readonly IntelligenceCleanupModel[] = [
  {
    id: "Xenova/t5-tiny",
    label: "Lite (T5 Tiny)",
    sizeMb: 15,
    quantization: "q4",
    tier: "lite",
  },
  {
    id: "Xenova/t5-small",
    label: "Balanced (T5 Small)",
    sizeMb: 40,
    quantization: "q4",
    tier: "balanced",
  },
  {
    id: "Xenova/bart-base-cnn",
    label: "Pro (BART Base)",
    sizeMb: 100,
    quantization: "q4",
    tier: "pro",
  },
] as const;
