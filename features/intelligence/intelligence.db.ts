import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  QUERY_CACHE_DB_NAME,
  QUERY_CACHE_STORE,
} from "@/features/offline/offline.query-cache.db";

import {
  INTELLIGENCE_DB_NAME,
  INTELLIGENCE_DB_VERSION,
  INTELLIGENCE_INDEX_STORE,
} from "./intelligence.constants";
import type { IntelligenceIndexSnapshot } from "./intelligence.types";

interface IntelligenceDbSchema extends DBSchema {
  [INTELLIGENCE_INDEX_STORE]: {
    key: string;
    value: IntelligenceIndexSnapshot;
  };
}

interface QueryCacheDbSchema extends DBSchema {
  [QUERY_CACHE_STORE]: {
    key: string;
    value: {
      key: string;
      payload: unknown;
      updatedAt: number;
      expiresAt: number;
      maxStaleAt: number;
      schemaVersion: number;
      bytesEstimate: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<IntelligenceDbSchema> | null> | null = null;
let indexedDbDisabled = false;
const memorySnapshots = new Map<string, IntelligenceIndexSnapshot>();

function cloneSnapshot(snapshot: IntelligenceIndexSnapshot): IntelligenceIndexSnapshot {
  return {
    ...snapshot,
    vectors: snapshot.vectors.map((entry) => ({
      ...entry,
      vector: [...entry.vector],
    })),
  };
}

async function getDb(): Promise<IDBPDatabase<IntelligenceDbSchema> | null> {
  if (indexedDbDisabled) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await openDB<IntelligenceDbSchema>(
          INTELLIGENCE_DB_NAME,
          INTELLIGENCE_DB_VERSION,
          {
            upgrade(database) {
              if (!database.objectStoreNames.contains(INTELLIGENCE_INDEX_STORE)) {
                database.createObjectStore(INTELLIGENCE_INDEX_STORE, { keyPath: "key" });
              }
            },
          },
        );
      } catch {
        indexedDbDisabled = true;
        return null;
      }
    })();
  }

  return dbPromise;
}

export async function getIntelligenceSnapshot(
  key: string,
): Promise<IntelligenceIndexSnapshot | null> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return null;
  }

  const inMemory = memorySnapshots.get(normalizedKey);
  if (inMemory) {
    return cloneAndValidateSnapshot(inMemory);
  }

  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const value = await db.get(INTELLIGENCE_INDEX_STORE, normalizedKey);
    if (!value) {
      return null;
    }

    const validated = cloneAndValidateSnapshot(value);
    if (validated) {
      memorySnapshots.set(normalizedKey, cloneSnapshot(value));
    }
    return validated;
  } catch {
    return null;
  }
}

export async function getIntelligenceSnapshotSizeBytes(key: string): Promise<number> {
  const snapshot = await getIntelligenceSnapshot(key);
  if (!snapshot) {
    return 0;
  }

  try {
    return new Blob([JSON.stringify(snapshot)]).size;
  } catch {
    return 0;
  }
}

/** Default expected vector dimension — must match the configured model output. */
const EXPECTED_VECTOR_DIMENSION = 384;

/**
 * Clone and validate a snapshot: filter out vectors with wrong dimensions
 * (data corruption or model dimension change) and check oramaVersion.
 */
function cloneAndValidateSnapshot(
  snapshot: IntelligenceIndexSnapshot,
): IntelligenceIndexSnapshot | null {
  const cloned = cloneSnapshot(snapshot);

  // Filter out corrupted vectors with wrong dimension.
  cloned.vectors = cloned.vectors.filter((entry) => {
    if (entry.vector.length !== EXPECTED_VECTOR_DIMENSION) {
      return false;
    }
    return true;
  });

  return cloned;
}

export async function setIntelligenceSnapshot(snapshot: IntelligenceIndexSnapshot): Promise<void> {
  const cloned = cloneSnapshot(snapshot);
  memorySnapshots.set(cloned.key, cloneSnapshot(cloned));

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(INTELLIGENCE_INDEX_STORE, cloned);
  } catch {
  }
}

export async function clearIntelligenceSnapshots(): Promise<void> {
  memorySnapshots.clear();

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.clear(INTELLIGENCE_INDEX_STORE);
  } catch {
  }
}

export async function clearAllEmbeddings(): Promise<void> {
  await clearIntelligenceSnapshots();
}

export async function getAllQueryCacheKeysForFolder(folderId: string): Promise<string[]> {
  const normalizedFolderId = folderId.trim();
  if (!normalizedFolderId) {
    return [];
  }

  const prefix = `drive:folder:${normalizedFolderId}:`;
  const lower = prefix;
  const upper = `${prefix}\uffff`;

  try {
    const queryDb = await openDB<QueryCacheDbSchema>(QUERY_CACHE_DB_NAME, 1);
    const transaction = queryDb.transaction(QUERY_CACHE_STORE, "readonly");
    const store = transaction.objectStore(QUERY_CACHE_STORE);
    const range = IDBKeyRange.bound(lower, upper);
    const keys: string[] = [];

    let cursor = await store.openKeyCursor(range);
    while (cursor) {
      if (typeof cursor.key === "string") {
        keys.push(cursor.key);
      }
      cursor = await cursor.continue();
    }

    await transaction.done;
    queryDb.close();
    return keys.sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}
