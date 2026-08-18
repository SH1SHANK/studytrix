import { createRxDatabase, addRxPlugin } from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";

import { workspaceSchema } from "./schemas/workspace";
import { folderSchema } from "./schemas/folder";
import { tagSchema } from "./schemas/tag";
import { tagAssignmentSchema } from "./schemas/tag-assignment";
import { settingsSchema } from "./schemas/settings";
import { driveSourceSchema } from "./schemas/drive-source";
import { driveFileSchema, driveFileMigrationStrategies } from "./schemas/drive-file";
import { getStorage } from "./storage";
import type { StudytrixDatabase } from "./types";

addRxPlugin(RxDBMigrationSchemaPlugin);

let devModePromise: Promise<void> | null = null;
if (process.env.NODE_ENV === "development") {
  devModePromise = import("rxdb/plugins/dev-mode")
    .then((mod) => {
      addRxPlugin(mod.RxDBDevModePlugin);
    })
    .catch(() => {});
}

/**
 * Use globalThis to persist the database singleton across Next.js HMR reloads.
 * Module-level `let` variables are discarded when webpack re-evaluates the module.
 */
const GLOBAL_KEY = "__studytrix_db" as const;
const GLOBAL_PROMISE_KEY = "__studytrix_db_promise" as const;

interface StudytrixGlobal {
  [GLOBAL_KEY]?: StudytrixDatabase | null;
  [GLOBAL_PROMISE_KEY]?: Promise<StudytrixDatabase> | null;
}

const g = globalThis as unknown as StudytrixGlobal;

/**
 * Initializes and returns the singleton Studytrix RxDB database instance.
 *
 * Single deterministic anonymous database: 'studytrix'
 * Backed by Dexie RxStorage (IndexedDB) in browser, and Memory storage in tests.
 */
export async function getDatabase(isTest = false): Promise<StudytrixDatabase> {
  // Fast path: return the existing live database (works for both test and prod)
  const existingDb = g[GLOBAL_KEY];
  if (existingDb && !existingDb.closed) {
    return existingDb;
  }

  // If the existing DB was closed, clear stale references so we recreate
  if (existingDb && existingDb.closed) {
    g[GLOBAL_KEY] = null;
    g[GLOBAL_PROMISE_KEY] = null;
  }

  // Coalesce concurrent callers onto a single in-flight promise
  const existingPromise = g[GLOBAL_PROMISE_KEY];
  if (existingPromise) {
    return existingPromise;
  }

  const promise = isTest ? createTestDatabase() : initDatabase();
  g[GLOBAL_PROMISE_KEY] = promise;

  try {
    const db = await promise;
    g[GLOBAL_KEY] = db;
    g[GLOBAL_PROMISE_KEY] = null;
    return db;
  } catch (err) {
    g[GLOBAL_PROMISE_KEY] = null;
    g[GLOBAL_KEY] = null;
    throw err;
  }
}

const DB_NAME = "studytrix";

async function initDatabase(): Promise<StudytrixDatabase> {
  if (devModePromise) {
    await devModePromise;
  }

  const storage = getStorage(false);
  const isDev = process.env.NODE_ENV === "development";

  const db = await createRxDatabase<StudytrixDatabase>({
    name: DB_NAME,
    storage,
    multiInstance: true,
    // Note: RxDB strictly forbids `ignoreDuplicate: true` in production builds and throws DB9.
    // We only pass `ignoreDuplicate: true` in development mode where dev-mode plugin is active.
    ...(isDev ? { ignoreDuplicate: true } : {}),
  });

  // addCollections is idempotent when called with the same schemas on an
  // already-initialised database (RxDB returns the existing collection).
  // Wrap in try-catch as a safeguard against edge-case schema drift during
  // development HMR reloads.
  try {
    await db.addCollections({
      workspaces: {
        schema: workspaceSchema,
      },
      folders: {
        schema: folderSchema,
      },
      tags: {
        schema: tagSchema,
      },
      tag_assignments: {
        schema: tagAssignmentSchema,
      },
      settings: {
        schema: settingsSchema,
      },
      drive_sources: {
        schema: driveSourceSchema,
      },
      drive_files: {
        schema: driveFileSchema,
        migrationStrategies: driveFileMigrationStrategies,
      },
    });
  } catch (collectionErr: unknown) {
    const hasCollections =
      db.collections &&
      "drive_sources" in db.collections &&
      "workspaces" in db.collections;

    if (!hasCollections) {
      throw collectionErr;
    }
    console.warn("[RxDB] addCollections skipped (already initialized):", collectionErr);
  }

  return db;
}

async function createTestDatabase(): Promise<StudytrixDatabase> {
  if (devModePromise) {
    await devModePromise;
  }

  const storage = getStorage(true);

  const testDbCounter = (globalThis as any).__studytrix_test_counter ?? 0;
  (globalThis as any).__studytrix_test_counter = testDbCounter + 1;
  const dbName = `studytrix_test_db_${testDbCounter}`;

  const db = await createRxDatabase<StudytrixDatabase>({
    name: dbName,
    storage,
    multiInstance: false,
    ignoreDuplicate: true,
  });

  await db.addCollections({
    workspaces: {
      schema: workspaceSchema,
    },
    folders: {
      schema: folderSchema,
    },
    tags: {
      schema: tagSchema,
    },
    tag_assignments: {
      schema: tagAssignmentSchema,
    },
    settings: {
      schema: settingsSchema,
    },
    drive_sources: {
      schema: driveSourceSchema,
    },
    drive_files: {
      schema: driveFileSchema,
      migrationStrategies: driveFileMigrationStrategies,
    },
  });

  return db;
}

/**
 * Synchronous accessor for the database instance if already initialized.
 */
export function getDatabaseOrNull(): StudytrixDatabase | null {
  const db = g[GLOBAL_KEY];
  if (db && !db.closed) {
    return db;
  }
  return null;
}

/**
 * Destroys the current database instance and clears singleton references.
 * Used for testing resets or application cache purges.
 */
export async function destroyDatabase(): Promise<void> {
  const db = g[GLOBAL_KEY];
  if (db) {
    try {
      if (!db.closed) {
        await db.remove();
      }
    } catch {
      try {
        if (!db.closed) {
          await (db as any).destroy();
        }
      } catch {
        // Ignore close errors
      }
    }
  }
  g[GLOBAL_KEY] = null;
  g[GLOBAL_PROMISE_KEY] = null;
}
