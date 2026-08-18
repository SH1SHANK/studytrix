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

let dbPromise: Promise<StudytrixDatabase> | null = null;
let currentDb: StudytrixDatabase | null = null;

/**
 * Initializes and returns the singleton Studytrix RxDB database instance.
 *
 * Single deterministic anonymous database: 'studytrix'
 * Backed by Dexie RxStorage (IndexedDB) in browser, and Memory storage in tests.
 */
export async function getDatabase(isTest = false): Promise<StudytrixDatabase> {
  if (currentDb && !currentDb.closed) {
    return currentDb;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    if (devModePromise) {
      await devModePromise;
    }

    const storage = getStorage(isTest);
    const dbName = isTest ? "studytrix_test_db" : "studytrix";

    const db = await createRxDatabase<StudytrixDatabase>({
      name: dbName,
      storage,
      multiInstance: !isTest,
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

    currentDb = db;
    return db;
  })();

  try {
    return await dbPromise;
  } catch (err) {
    dbPromise = null;
    currentDb = null;
    throw err;
  }
}

/**
 * Synchronous accessor for the database instance if already initialized.
 */
export function getDatabaseOrNull(): StudytrixDatabase | null {
  if (currentDb && !currentDb.closed) {
    return currentDb;
  }
  return null;
}

/**
 * Destroys the current database instance and clears singleton references.
 * Used for testing resets or application cache purges.
 */
export async function destroyDatabase(): Promise<void> {
  if (currentDb) {
    try {
      if (!currentDb.closed) {
        await currentDb.remove();
      }
    } catch {
      try {
        if (!currentDb.closed) {
          await (currentDb as any).destroy();
        }
      } catch {
        // Ignore close errors
      }
    }
  }
  dbPromise = null;
  currentDb = null;
}
