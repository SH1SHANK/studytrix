import { openDB, type DBSchema, type IDBPDatabase } from "idb";

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
