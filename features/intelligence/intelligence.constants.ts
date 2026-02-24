export const INTELLIGENCE_DB_NAME = "studytrix_intelligence";
export const INTELLIGENCE_DB_VERSION = 1;
export const INTELLIGENCE_INDEX_STORE = "semantic_index";

export const INTELLIGENCE_SETTINGS_IDS = {
  smartSearchEnabled: "semantic_search_enabled",
  showInCommandCenter: "semantic_search_show_in_commandcenter",
  noticeDismissed: "semantic_search_notice_dismissed",
} as const;

export const INTELLIGENCE_LEARN_MORE_PATH = "/blog/how-semantic-search-works";

export const INTELLIGENCE_QUERY_DEBOUNCE_MS = 300;
export const INTELLIGENCE_QUERY_TIMEOUT_MS = 2000;
export const INTELLIGENCE_INDEX_CHUNK_SIZE = 64;
export const INTELLIGENCE_MAX_QUERY_CACHE_ENTRIES = 150;

export const DEFAULT_MODEL_ID = "Xenova/bge-small-en-v1.5";
export const INTELLIGENCE_FALLBACK_MODEL_ID = DEFAULT_MODEL_ID;
export const INTELLIGENCE_BALANCED_MODEL_ID = "Xenova/bge-small-en-v1.5";

export const INTELLIGENCE_KEYWORD_SCORE_CAP = 180;
export const INTELLIGENCE_INDEX_SIZE_LIMIT = 9_500;
export const INTELLIGENCE_INDEX_PRUNE_BATCH = 500;
export const INTELLIGENCE_INDEX_PRUNE_TARGET = 9_000;

export const INTELLIGENCE_QUEUE_MAX_DEPTH = 500;

export const INTELLIGENCE_MODEL_CATALOG_ENDPOINT = "/api/intelligence/models";
