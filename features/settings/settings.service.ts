import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { parseSettingsJson } from "./settings.schema";
import { getSettingDefinition } from "./settings.registry";
import { validateSetting } from "./settings.validation";

const DB_NAME = "app-settings";
const DB_VERSION = 1;
const STORE_NAME = "settings";

interface SettingRecord {
  id: string;
  value: unknown;
  updatedAt: number;
}

interface SettingsDbSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: SettingRecord;
  };
}

const memorySettings = new Map<string, unknown>();

let dbPromise: Promise<IDBPDatabase<SettingsDbSchema> | null> | null = null;
let indexedDbDisabled = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getDb(): Promise<IDBPDatabase<SettingsDbSchema> | null> {
  if (indexedDbDisabled) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (typeof indexedDB === "undefined") {
          indexedDbDisabled = true;
          return null;
        }

        return await openDB<SettingsDbSchema>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
          },
          blocked() {
            console.error("Settings DB upgrade blocked by another tab");
          },
          blocking() {
            console.error("Settings DB is blocking a newer version upgrade");
          },
          terminated() {
            dbPromise = null;
          },
        });
      } catch (error) {
        indexedDbDisabled = true;
        console.error("Settings DB unavailable, using memory fallback", error);
        return null;
      }
    })();
  }

  return dbPromise;
}

function readMemoryValues(): Record<string, unknown> {
  return Object.fromEntries(memorySettings.entries());
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneUnknown);
  }

  if (isRecord(value)) {
    const cloned: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      cloned[key] = cloneUnknown(nestedValue);
    }

    return cloned;
  }

  return value;
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const db = await getDb();

  if (!db) {
    return readMemoryValues();
  }

  try {
    const records = await db.getAll(STORE_NAME);
    const values: Record<string, unknown> = {};

    for (const record of records) {
      values[record.id] = cloneUnknown(record.value);
      memorySettings.set(record.id, cloneUnknown(record.value));
    }

    return values;
  } catch (error) {
    console.error("Failed to read settings from IndexedDB, using memory fallback", error);
    return readMemoryValues();
  }
}

export async function setSetting(id: string, value: unknown): Promise<void> {
  const key = id.trim();
  if (!key) {
    return;
  }

  const clonedValue = cloneUnknown(value);
  memorySettings.set(key, clonedValue);

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(STORE_NAME, {
      id: key,
      value: clonedValue,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to persist setting to IndexedDB, value kept in memory", error);
  }
}

export async function resetSettings(): Promise<void> {
  memorySettings.clear();

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error("Failed to clear IndexedDB settings", error);
  }
}

export async function exportSettings(): Promise<string> {
  const values = await getAllSettings();
  return JSON.stringify(values, null, 2);
}

function parseAndValidateImport(json: string): Record<string, unknown> {
  const parsed = parseSettingsJson(json);
  const validated: Record<string, unknown> = {};

  for (const [id, value] of Object.entries(parsed)) {
    const definition = getSettingDefinition(id);

    if (!definition) {
      continue;
    }

    if (!validateSetting(definition, value)) {
      throw new Error(`Invalid value for setting '${id}'`);
    }

    validated[id] = cloneUnknown(value);
  }

  return validated;
}

export async function importSettings(json: string): Promise<void> {
  const validated = parseAndValidateImport(json);

  memorySettings.clear();
  for (const [id, value] of Object.entries(validated)) {
    memorySettings.set(id, value);
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    await tx.store.clear();

    for (const [id, value] of Object.entries(validated)) {
      await tx.store.put({
        id,
        value: cloneUnknown(value),
        updatedAt: Date.now(),
      });
    }

    await tx.done;
  } catch (error) {
    console.error("Failed to import settings into IndexedDB", error);
  }
}
