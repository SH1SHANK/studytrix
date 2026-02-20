import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  MetadataRecord,
  OfflineFileRecord,
  SearchIndexRecord,
} from "./offline.types";
import { getActiveProvider } from "./offline.storage-location";

const DB_NAME = "studytrix_offline";
const VERSION = 1;
const FILES_STORE = "files";
const SEARCH_INDEX_STORE = "search_index";
const METADATA_STORE = "metadata";

interface OfflineDBSchema extends DBSchema {
  [FILES_STORE]: {
    key: string;
    value: OfflineFileRecord;
  };
  [SEARCH_INDEX_STORE]: {
    key: string;
    value: SearchIndexRecord;
  };
  [METADATA_STORE]: {
    key: string;
    value: MetadataRecord;
  };
}

const memoryFiles = new Map<string, OfflineFileRecord>();
const memorySearchIndex = new Map<string, SearchIndexRecord>();
const memoryMetadata = new Map<string, MetadataRecord>();

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema> | null> | null = null;
let indexedDbDisabled = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "QuotaExceededError";
  }

  if (isRecord(error) && typeof error.name === "string") {
    return error.name === "QuotaExceededError";
  }

  return false;
}

function cloneFileRecord(record: OfflineFileRecord): OfflineFileRecord {
  return {
    ...record,
    blob: record.blob.slice(0, record.blob.size, record.blob.type),
  };
}

function cloneSearchRecord(record: SearchIndexRecord): SearchIndexRecord {
  return { ...record };
}

function cloneMetadataRecord(record: MetadataRecord): MetadataRecord {
  return { ...record };
}

async function getDB(): Promise<IDBPDatabase<OfflineDBSchema> | null> {
  if (indexedDbDisabled) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await openDB<OfflineDBSchema>(DB_NAME, VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(FILES_STORE)) {
              db.createObjectStore(FILES_STORE, { keyPath: "fileId" });
            }

            if (!db.objectStoreNames.contains(SEARCH_INDEX_STORE)) {
              db.createObjectStore(SEARCH_INDEX_STORE, { keyPath: "fileId" });
            }

            if (!db.objectStoreNames.contains(METADATA_STORE)) {
              db.createObjectStore(METADATA_STORE, { keyPath: "key" });
            }
          },
        });
      } catch {
        indexedDbDisabled = true;
        return null;
      }
    })();
  }

  return dbPromise;
}

export async function getFile(fileId: string): Promise<OfflineFileRecord | undefined> {
  // Try the active storage provider first (single source of truth for blobs).
  const provider = getActiveProvider();
  if (provider?.kind === "filesystem") {
    try {
      const blob = await provider.readFile(fileId);
      if (blob) {
        // Return a synthetic record with the blob from the provider.
        const inMemory = memoryFiles.get(fileId);
        return {
          fileId,
          blob,
          size: blob.size,
          mimeType: inMemory?.mimeType ?? (blob.type || "application/octet-stream"),
          modifiedTime: inMemory?.modifiedTime ?? null,
          checksum: inMemory?.checksum,
          cachedAt: inMemory?.cachedAt ?? Date.now(),
          lastAccessedAt: inMemory?.lastAccessedAt ?? Date.now(),
        };
      }
    } catch {
      // Fall through to IndexedDB.
    }
  }

  const db = await getDB();

  if (!db) {
    const cached = memoryFiles.get(fileId);
    return cached ? cloneFileRecord(cached) : undefined;
  }

  try {
    const record = await db.get(FILES_STORE, fileId);
    return record ? cloneFileRecord(record) : undefined;
  } catch {
    const cached = memoryFiles.get(fileId);
    return cached ? cloneFileRecord(cached) : undefined;
  }
}

export async function putFile(record: OfflineFileRecord): Promise<void> {
  const cloned = cloneFileRecord(record);

  // Write blob to the active provider (single source of truth).
  const provider = getActiveProvider();
  if (provider?.kind === "filesystem") {
    try {
      await provider.writeFile(record.fileId, cloned.blob);
    } catch (error) {
      if (isQuotaError(error)) {
        throw new Error("Storage quota exceeded");
      }
      // If provider write fails, fall through to IndexedDB.
    }
  }

  // Also store in IndexedDB (metadata cache / fallback).
  const db = await getDB();

  if (!db) {
    memoryFiles.set(record.fileId, cloned);
    return;
  }

  try {
    await db.put(FILES_STORE, cloned);
    memoryFiles.set(record.fileId, cloned);
  } catch (error) {
    if (isQuotaError(error)) {
      throw new Error("Storage quota exceeded");
    }

    memoryFiles.set(record.fileId, cloned);
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  memoryFiles.delete(fileId);

  // Delete from active provider.
  const provider = getActiveProvider();
  if (provider?.kind === "filesystem") {
    try {
      await provider.deleteFile(fileId);
    } catch {
      // Best effort.
    }
  }

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.delete(FILES_STORE, fileId);
  } catch {
  }
}

export async function getAllFiles(): Promise<OfflineFileRecord[]> {
  const db = await getDB();

  if (!db) {
    return Array.from(memoryFiles.values()).map(cloneFileRecord);
  }

  try {
    const records = await db.getAll(FILES_STORE);
    return records.map(cloneFileRecord);
  } catch {
    return Array.from(memoryFiles.values()).map(cloneFileRecord);
  }
}

export async function clearFiles(): Promise<void> {
  memoryFiles.clear();

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.clear(FILES_STORE);
  } catch {
  }
}

export async function updateLastAccess(fileId: string): Promise<void> {
  const now = Date.now();

  const inMemory = memoryFiles.get(fileId);
  if (inMemory) {
    memoryFiles.set(fileId, {
      ...inMemory,
      lastAccessedAt: now,
    });
  }

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const current = await tx.store.get(fileId);

    if (current) {
      current.lastAccessedAt = now;
      await tx.store.put(current);
    }

    await tx.done;
  } catch {
  }
}

export async function getSearchIndex(fileId: string): Promise<SearchIndexRecord | undefined> {
  const db = await getDB();

  if (!db) {
    const record = memorySearchIndex.get(fileId);
    return record ? cloneSearchRecord(record) : undefined;
  }

  try {
    const record = await db.get(SEARCH_INDEX_STORE, fileId);
    return record ? cloneSearchRecord(record) : undefined;
  } catch {
    const record = memorySearchIndex.get(fileId);
    return record ? cloneSearchRecord(record) : undefined;
  }
}

export async function putSearchIndex(record: SearchIndexRecord): Promise<void> {
  const cloned = cloneSearchRecord(record);
  memorySearchIndex.set(record.fileId, cloned);

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.put(SEARCH_INDEX_STORE, cloned);
  } catch {
  }
}

export async function deleteSearchIndex(fileId: string): Promise<void> {
  memorySearchIndex.delete(fileId);

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.delete(SEARCH_INDEX_STORE, fileId);
  } catch {
  }
}

export async function getAllSearchIndex(): Promise<SearchIndexRecord[]> {
  const db = await getDB();

  if (!db) {
    return Array.from(memorySearchIndex.values()).map(cloneSearchRecord);
  }

  try {
    const records = await db.getAll(SEARCH_INDEX_STORE);
    return records.map(cloneSearchRecord);
  } catch {
    return Array.from(memorySearchIndex.values()).map(cloneSearchRecord);
  }
}

export async function clearSearchIndex(): Promise<void> {
  memorySearchIndex.clear();

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.clear(SEARCH_INDEX_STORE);
  } catch {
  }
}

export async function getMetadata(key: string): Promise<MetadataRecord | undefined> {
  const db = await getDB();

  if (!db) {
    const record = memoryMetadata.get(key);
    return record ? cloneMetadataRecord(record) : undefined;
  }

  try {
    const record = await db.get(METADATA_STORE, key);
    return record ? cloneMetadataRecord(record) : undefined;
  } catch {
    const record = memoryMetadata.get(key);
    return record ? cloneMetadataRecord(record) : undefined;
  }
}

export async function setMetadata(record: MetadataRecord): Promise<void> {
  const cloned = cloneMetadataRecord(record);
  memoryMetadata.set(record.key, cloned);

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.put(METADATA_STORE, cloned);
  } catch {
  }
}

export async function getAllMetadata(): Promise<MetadataRecord[]> {
  const db = await getDB();

  if (!db) {
    return Array.from(memoryMetadata.values()).map(cloneMetadataRecord);
  }

  try {
    const records = await db.getAll(METADATA_STORE);
    return records.map(cloneMetadataRecord);
  } catch {
    return Array.from(memoryMetadata.values()).map(cloneMetadataRecord);
  }
}

export async function clearMetadata(): Promise<void> {
  memoryMetadata.clear();

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await db.clear(METADATA_STORE);
  } catch {
  }
}

export { DB_NAME, VERSION, FILES_STORE, SEARCH_INDEX_STORE, METADATA_STORE };

export const getOfflineFile = getFile;
export const addOfflineFile = putFile;
export const removeOfflineFile = deleteFile;
export const getAllOfflineFiles = getAllFiles;
export const clearOfflineFiles = clearFiles;
