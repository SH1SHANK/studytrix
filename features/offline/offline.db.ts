import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  MetadataRecord,
  OfflineFileRecord,
  SearchIndexRecord,
} from "./offline.types";
import { getActiveProvider } from "./offline.storage-location";

const DB_NAME = "studytrix_offline";
const VERSION = 2;
const FILES_STORE = "files";
const SEARCH_INDEX_STORE = "search_index";
const METADATA_STORE = "metadata";
const PENDING_SYNC_STORE = "pending_sync";
const PROVIDER_OPERATION_TIMEOUT_MS = 2000;
const INDEXED_DB_OPERATION_TIMEOUT_MS = 2000;
const INDEXED_DB_OPEN_TIMEOUT_MS = 2000;
const DOWNLOAD_META_PREFIX = "download-meta:";
const PROVIDER_FILEMAP_PREFIX = "provider-file:";
const PROVIDER_ID_DELIMITER = "__";
const MAX_PROVIDER_BASENAME_LENGTH = 80;
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

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
  [PENDING_SYNC_STORE]: {
    key: string;
    value: PendingSyncRecord;
  };
}

export type PendingSyncRecord = {
  fileId: string;
  queuedAt: number;
  size: number;
  mimeType: string;
  reason: "provider-fallback";
};

const memoryFiles = new Map<string, OfflineFileRecord>();
const memorySearchIndex = new Map<string, SearchIndexRecord>();
const memoryMetadata = new Map<string, MetadataRecord>();
const memoryPendingSync = new Map<string, PendingSyncRecord>();

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema> | null> | null = null;
let indexedDbDisabled = false;

class StorageTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "StorageTimeoutError";
  }
}

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

function normalizeFileIdList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const fileId = value.trim();
    if (!fileId || seen.has(fileId)) {
      continue;
    }

    seen.add(fileId);
    normalized.push(fileId);
  }

  return normalized;
}

function parseDownloadMetaName(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed) || typeof parsed.name !== "string") {
      return null;
    }

    const normalized = parsed.name.trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function sanitizeFileNamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function splitDisplayFileName(name: string): { base: string; ext: string } {
  const sanitized = sanitizeFileNamePart(name);
  if (!sanitized) {
    return { base: "offline-file", ext: "" };
  }

  const lastDot = sanitized.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === sanitized.length - 1) {
    return { base: sanitized.slice(0, MAX_PROVIDER_BASENAME_LENGTH), ext: "" };
  }

  const base = sanitized.slice(0, lastDot).slice(0, MAX_PROVIDER_BASENAME_LENGTH);
  const extension = sanitized.slice(lastDot).replace(/\.+/g, ".");
  return {
    base: base || "offline-file",
    ext: extension.length <= 12 ? extension : "",
  };
}

function parseFileIdFromProviderFileName(fileName: string): string | null {
  const normalized = fileName.trim();
  if (!normalized) {
    return null;
  }

  const dotIndex = normalized.lastIndexOf(".");
  const stem = dotIndex > 0 ? normalized.slice(0, dotIndex) : normalized;
  const delimiterIndex = stem.lastIndexOf(PROVIDER_ID_DELIMITER);
  if (delimiterIndex <= -1) {
    return null;
  }

  const maybeId = stem.slice(delimiterIndex + PROVIDER_ID_DELIMITER.length).trim();
  if (!FILE_ID_PATTERN.test(maybeId)) {
    return null;
  }

  return maybeId;
}

function isManagedProviderFileName(fileName: string): boolean {
  if (parseFileIdFromProviderFileName(fileName)) {
    return true;
  }

  return FILE_ID_PATTERN.test(fileName.trim());
}

function buildProviderFileName(fileId: string, displayName: string | null): string {
  const source = displayName?.trim() || "offline-file";
  const { base, ext } = splitDisplayFileName(source);
  return `${base}${PROVIDER_ID_DELIMITER}${fileId}${ext}`;
}

function providerFileMapKey(fileId: string): string {
  return `${PROVIDER_FILEMAP_PREFIX}${fileId}`;
}

async function getMappedProviderFileName(fileId: string): Promise<string | null> {
  const record = await getMetadata(providerFileMapKey(fileId));
  if (!record?.value) {
    return null;
  }

  const normalized = record.value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function setMappedProviderFileName(fileId: string, providerFileName: string): Promise<void> {
  await setMetadata({
    key: providerFileMapKey(fileId),
    value: providerFileName,
  });
}

async function getPreferredProviderDisplayName(fileId: string): Promise<string | null> {
  const record = await getMetadata(`${DOWNLOAD_META_PREFIX}${fileId}`);
  return parseDownloadMetaName(record?.value);
}

async function withStorageTimeout<T>(
  operation: string,
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  return await new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new StorageTimeoutError(operation, timeoutMs));
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
  });
}

async function resolveProviderFileNameForWrite(
  provider: ReturnType<typeof getActiveProvider>,
  fileId: string,
): Promise<string> {
  if (!provider || provider.kind !== "filesystem") {
    return fileId;
  }

  const mapped = await getMappedProviderFileName(fileId);
  if (mapped) {
    return mapped;
  }

  const preferredDisplayName = await getPreferredProviderDisplayName(fileId);
  const providerFileName = buildProviderFileName(fileId, preferredDisplayName);
  await setMappedProviderFileName(fileId, providerFileName);
  return providerFileName;
}

async function discoverProviderFileName(
  provider: ReturnType<typeof getActiveProvider>,
  fileId: string,
): Promise<string | null> {
  if (!provider || provider.kind !== "filesystem") {
    return null;
  }

  const entries = await withStorageTimeout(
    "Filesystem listFiles",
    provider.listFiles(),
    PROVIDER_OPERATION_TIMEOUT_MS,
  );

  for (const entry of entries) {
    if (!isManagedProviderFileName(entry)) {
      continue;
    }

    if (parseFileIdFromProviderFileName(entry) === fileId) {
      await setMappedProviderFileName(fileId, entry);
      return entry;
    }
  }

  return null;
}

async function readProviderFileById(
  provider: ReturnType<typeof getActiveProvider>,
  fileId: string,
): Promise<Blob | null> {
  if (!provider || provider.kind !== "filesystem") {
    return null;
  }

  const mapped = await getMappedProviderFileName(fileId);
  if (mapped) {
    const mappedBlob = await withStorageTimeout(
      "Filesystem readFile",
      provider.readFile(mapped),
      PROVIDER_OPERATION_TIMEOUT_MS,
    );
    if (mappedBlob) {
      return mappedBlob;
    }
  }

  const legacyBlob = await withStorageTimeout(
    "Filesystem readFile",
    provider.readFile(fileId),
    PROVIDER_OPERATION_TIMEOUT_MS,
  );
  if (legacyBlob) {
    await setMappedProviderFileName(fileId, fileId);
    return legacyBlob;
  }

  const discovered = await discoverProviderFileName(provider, fileId);
  if (!discovered) {
    return null;
  }

  return await withStorageTimeout(
    "Filesystem readFile",
    provider.readFile(discovered),
    PROVIDER_OPERATION_TIMEOUT_MS,
  );
}

async function readAllIndexedDbFiles(): Promise<OfflineFileRecord[]> {
  const db = await getDB();

  if (!db) {
    return Array.from(memoryFiles.values()).map(cloneFileRecord);
  }

  try {
    const records = await withStorageTimeout(
      "IndexedDB getAll(files)",
      db.getAll(FILES_STORE),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
    return records.map(cloneFileRecord);
  } catch {
    return Array.from(memoryFiles.values()).map(cloneFileRecord);
  }
}

async function readIndexedDbFile(fileId: string): Promise<OfflineFileRecord | undefined> {
  const db = await getDB();

  if (!db) {
    const cached = memoryFiles.get(fileId);
    return cached ? cloneFileRecord(cached) : undefined;
  }

  try {
    const record = await withStorageTimeout(
      "IndexedDB get(file)",
      db.get(FILES_STORE, fileId),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
    return record ? cloneFileRecord(record) : undefined;
  } catch {
    const cached = memoryFiles.get(fileId);
    return cached ? cloneFileRecord(cached) : undefined;
  }
}

async function getDB(): Promise<IDBPDatabase<OfflineDBSchema> | null> {
  if (indexedDbDisabled) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await withStorageTimeout(
          "IndexedDB open",
          openDB<OfflineDBSchema>(DB_NAME, VERSION, {
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

              if (!db.objectStoreNames.contains(PENDING_SYNC_STORE)) {
                db.createObjectStore(PENDING_SYNC_STORE, { keyPath: "fileId" });
              }
            },
          }),
          INDEXED_DB_OPEN_TIMEOUT_MS,
        );
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
      const blob = await readProviderFileById(provider, fileId);
      if (blob) {
        // Return a synthetic record with the blob from the provider.
        const fromIndexedDb = await readIndexedDbFile(fileId);
        const inMemory = fromIndexedDb ?? memoryFiles.get(fileId);
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

  return readIndexedDbFile(fileId);
}

export async function getProviderFileBlob(fileId: string): Promise<Blob | null> {
  const provider = getActiveProvider();
  if (!provider || provider.kind !== "filesystem") {
    return null;
  }

  try {
    return await readProviderFileById(provider, fileId);
  } catch {
    return null;
  }
}

async function markPendingSync(fileId: string, blob: Blob): Promise<void> {
  const record: PendingSyncRecord = {
    fileId,
    queuedAt: Date.now(),
    size: blob.size,
    mimeType: blob.type || "application/octet-stream",
    reason: "provider-fallback",
  };
  memoryPendingSync.set(fileId, record);

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await withStorageTimeout(
      "IndexedDB put(pending_sync)",
      db.put(PENDING_SYNC_STORE, record),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
  } catch {
  }
}

export async function removePendingSync(fileId: string): Promise<void> {
  memoryPendingSync.delete(fileId);

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await withStorageTimeout(
      "IndexedDB delete(pending_sync)",
      db.delete(PENDING_SYNC_STORE, fileId),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
  } catch {
  }
}

export async function listPendingSync(): Promise<PendingSyncRecord[]> {
  const db = await getDB();
  if (!db) {
    return Array.from(memoryPendingSync.values()).map((entry) => ({ ...entry }));
  }

  try {
    const records = await withStorageTimeout(
      "IndexedDB getAll(pending_sync)",
      db.getAll(PENDING_SYNC_STORE),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
    for (const record of records) {
      memoryPendingSync.set(record.fileId, record);
    }
    return records.map((entry) => ({ ...entry }));
  } catch {
    return Array.from(memoryPendingSync.values()).map((entry) => ({ ...entry }));
  }
}

export async function replayPendingSync(): Promise<{ migrated: number; failed: number }> {
  const provider = getActiveProvider();
  if (!provider || provider.kind !== "filesystem") {
    return { migrated: 0, failed: 0 };
  }

  const pending = await listPendingSync();
  if (pending.length === 0) {
    return { migrated: 0, failed: 0 };
  }

  let migrated = 0;
  let failed = 0;
  for (const entry of pending) {
    try {
      const record = await readIndexedDbFile(entry.fileId);
      if (!record) {
        await removePendingSync(entry.fileId);
        continue;
      }

      const providerFileName = await resolveProviderFileNameForWrite(
        provider,
        entry.fileId,
      );

      await withStorageTimeout(
        "Filesystem writeFile(replay)",
        provider.writeFile(providerFileName, record.blob),
        PROVIDER_OPERATION_TIMEOUT_MS,
      );
      await removePendingSync(entry.fileId);
      migrated += 1;
    } catch {
      failed += 1;
    }
  }

  return { migrated, failed };
}

export async function syncIndexedDbFilesToActiveProvider(): Promise<{
  synced: number;
  failed: number;
  alreadyPresent: number;
}> {
  const provider = getActiveProvider();
  if (!provider || provider.kind !== "filesystem") {
    return { synced: 0, failed: 0, alreadyPresent: 0 };
  }

  const records = await readAllIndexedDbFiles();
  if (records.length === 0) {
    return { synced: 0, failed: 0, alreadyPresent: 0 };
  }

  let synced = 0;
  let failed = 0;
  let alreadyPresent = 0;

  for (const record of records) {
    try {
      const existing = await readProviderFileById(provider, record.fileId);
      if (existing && existing.size === record.blob.size) {
        await removePendingSync(record.fileId);
        alreadyPresent += 1;
        continue;
      }

      const providerFileName = await resolveProviderFileNameForWrite(provider, record.fileId);
      await withStorageTimeout(
        "Filesystem writeFile(sync)",
        provider.writeFile(providerFileName, record.blob),
        PROVIDER_OPERATION_TIMEOUT_MS,
      );
      await removePendingSync(record.fileId);
      synced += 1;
    } catch {
      await markPendingSync(record.fileId, record.blob);
      failed += 1;
    }
  }

  return { synced, failed, alreadyPresent };
}

export async function writeWithFallback(fileId: string, blob: Blob): Promise<void> {
  const provider = getActiveProvider();
  if (provider?.kind === "filesystem") {
    try {
      const providerFileName = await resolveProviderFileNameForWrite(provider, fileId);
      await withStorageTimeout(
        "Filesystem writeFile",
        provider.writeFile(providerFileName, blob),
        PROVIDER_OPERATION_TIMEOUT_MS,
      );
      await removePendingSync(fileId);
      return;
    } catch (error) {
      if (isQuotaError(error)) {
        throw new Error("Storage quota exceeded");
      }

      await markPendingSync(fileId, blob);
      return;
    }
  }

  await removePendingSync(fileId);
}

export async function putFile(record: OfflineFileRecord): Promise<void> {
  const cloned = cloneFileRecord(record);
  await writeWithFallback(record.fileId, cloned.blob);

  // Also store in IndexedDB (metadata cache / fallback).
  const db = await getDB();

  if (!db) {
    memoryFiles.set(record.fileId, cloned);
    return;
  }

  try {
    await withStorageTimeout(
      "IndexedDB put(file)",
      db.put(FILES_STORE, cloned),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
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
  memoryPendingSync.delete(fileId);

  // Delete from active provider.
  const provider = getActiveProvider();
  if (provider?.kind === "filesystem") {
    try {
      const mappedName = await getMappedProviderFileName(fileId);
      const namesToDelete = normalizeFileIdList([
        mappedName ?? "",
        fileId,
      ]);

      for (const name of namesToDelete) {
        await withStorageTimeout(
          "Filesystem deleteFile",
          provider.deleteFile(name),
          PROVIDER_OPERATION_TIMEOUT_MS,
        );
      }
    } catch {
      // Best effort.
    }

    try {
      const discovered = await discoverProviderFileName(provider, fileId);
      if (discovered && discovered !== fileId) {
        await withStorageTimeout(
          "Filesystem deleteFile",
          provider.deleteFile(discovered),
          PROVIDER_OPERATION_TIMEOUT_MS,
        );
      }
    } catch {
      // Best effort.
    }

    try {
      await withStorageTimeout(
        "IndexedDB delete(metadata:filemap)",
        (async () => {
          const db = await getDB();
          if (!db) {
            memoryMetadata.delete(providerFileMapKey(fileId));
            return;
          }

          await db.delete(METADATA_STORE, providerFileMapKey(fileId));
          memoryMetadata.delete(providerFileMapKey(fileId));
        })(),
        INDEXED_DB_OPERATION_TIMEOUT_MS,
      );
    } catch {
      // Best effort.
    }
  }

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await withStorageTimeout(
      "IndexedDB delete(file)",
      db.delete(FILES_STORE, fileId),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
  } catch {
  }

  try {
    await withStorageTimeout(
      "IndexedDB delete(pending_sync)",
      db.delete(PENDING_SYNC_STORE, fileId),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
  } catch {
  }
}

export async function getAllFiles(): Promise<OfflineFileRecord[]> {
  const indexedRecords = await readAllIndexedDbFiles();
  const mergedById = new Map(indexedRecords.map((record) => [record.fileId, record]));

  const provider = getActiveProvider();
  if (provider?.kind !== "filesystem") {
    return Array.from(mergedById.values()).map(cloneFileRecord);
  }

  let providerFileNames: string[] = [];
  try {
    providerFileNames = normalizeFileIdList(
      await withStorageTimeout(
        "Filesystem listFiles",
        provider.listFiles(),
        PROVIDER_OPERATION_TIMEOUT_MS,
      ),
    ).filter(isManagedProviderFileName);
  } catch {
    providerFileNames = [];
  }

  if (providerFileNames.length === 0) {
    return Array.from(mergedById.values()).map(cloneFileRecord);
  }

  const providerRecords = await Promise.all(
    providerFileNames.map(async (providerFileName) => {
      try {
        const timedBlob = await withStorageTimeout(
          "Filesystem readFile",
          provider.readFile(providerFileName),
          PROVIDER_OPERATION_TIMEOUT_MS,
        );
        if (!timedBlob) {
          return null;
        }

        const parsedId = parseFileIdFromProviderFileName(providerFileName) ?? providerFileName;
        if (parsedId !== providerFileName) {
          void setMappedProviderFileName(parsedId, providerFileName);
        }

        const cached = mergedById.get(parsedId) ?? memoryFiles.get(parsedId);
        const now = Date.now();
        return {
          fileId: parsedId,
          blob: timedBlob,
          size: timedBlob.size,
          mimeType: cached?.mimeType ?? (timedBlob.type || "application/octet-stream"),
          modifiedTime: cached?.modifiedTime ?? null,
          checksum: cached?.checksum,
          cachedAt: cached?.cachedAt ?? now,
          lastAccessedAt: cached?.lastAccessedAt ?? now,
        } satisfies OfflineFileRecord;
      } catch {
        return null;
      }
    }),
  );

  for (const record of providerRecords) {
    if (!record) {
      continue;
    }

    mergedById.set(record.fileId, record);
  }

  return Array.from(mergedById.values()).map(cloneFileRecord);
}

export async function getAllFileIds(): Promise<string[]> {
  const db = await getDB();

  let indexedKeys: string[] = [];
  if (!db) {
    indexedKeys = Array.from(memoryFiles.keys());
  } else {
    try {
      indexedKeys = (await withStorageTimeout(
        "IndexedDB getAllKeys(files)",
        db.getAllKeys(FILES_STORE),
        INDEXED_DB_OPERATION_TIMEOUT_MS,
      ))
        .filter((key): key is string => typeof key === "string");
    } catch {
      indexedKeys = Array.from(memoryFiles.keys());
    }
  }

  const provider = getActiveProvider();
  if (provider?.kind !== "filesystem") {
    return normalizeFileIdList(indexedKeys);
  }

  let providerKeys: string[] = [];
  try {
    providerKeys = (await withStorageTimeout(
      "Filesystem listFiles",
      provider.listFiles(),
      PROVIDER_OPERATION_TIMEOUT_MS,
    )).filter(isManagedProviderFileName);
  } catch {
    providerKeys = [];
  }

  const normalizedProviderIds = providerKeys.map((key) => parseFileIdFromProviderFileName(key) ?? key);
  return normalizeFileIdList([...indexedKeys, ...normalizedProviderIds]);
}

export async function clearFiles(): Promise<void> {
  memoryFiles.clear();
  memoryPendingSync.clear();

  const provider = getActiveProvider();
  if (provider?.kind === "filesystem") {
    try {
      const fileIds = normalizeFileIdList(
        await withStorageTimeout(
          "Filesystem listFiles",
          provider.listFiles(),
          PROVIDER_OPERATION_TIMEOUT_MS,
        ),
      ).filter(isManagedProviderFileName);
      await Promise.all(fileIds.map(async (fileId) => {
        try {
          await withStorageTimeout(
            "Filesystem deleteFile",
            provider.deleteFile(fileId),
            PROVIDER_OPERATION_TIMEOUT_MS,
          );
        } catch {
        }
      }));
    } catch {
    }
  }

  const db = await getDB();
  if (!db) {
    return;
  }

  try {
    await withStorageTimeout(
      "IndexedDB clear(files)",
      db.clear(FILES_STORE),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
  } catch {
  }

  try {
    await withStorageTimeout(
      "IndexedDB clear(pending_sync)",
      db.clear(PENDING_SYNC_STORE),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
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
    const record = await withStorageTimeout(
      "IndexedDB get(metadata)",
      db.get(METADATA_STORE, key),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
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
    await withStorageTimeout(
      "IndexedDB put(metadata)",
      db.put(METADATA_STORE, cloned),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
  } catch {
  }
}

export async function getAllMetadata(): Promise<MetadataRecord[]> {
  const db = await getDB();

  if (!db) {
    return Array.from(memoryMetadata.values()).map(cloneMetadataRecord);
  }

  try {
    const records = await withStorageTimeout(
      "IndexedDB getAll(metadata)",
      db.getAll(METADATA_STORE),
      INDEXED_DB_OPERATION_TIMEOUT_MS,
    );
    return records.map(cloneMetadataRecord);
  } catch {
    return Array.from(memoryMetadata.values()).map(cloneMetadataRecord);
  }
}

export async function getMetadataByPrefix(prefix: string): Promise<MetadataRecord[]> {
  const normalizedPrefix = prefix.trim();
  if (!normalizedPrefix) {
    return [];
  }

  const db = await getDB();

  if (!db) {
    return Array.from(memoryMetadata.values())
      .filter((record) => record.key.startsWith(normalizedPrefix))
      .map(cloneMetadataRecord);
  }

  try {
    if (typeof IDBKeyRange !== "undefined") {
      const lowerBound = normalizedPrefix;
      const upperBound = `${normalizedPrefix}\uffff`;
      const range = IDBKeyRange.bound(lowerBound, upperBound);
      const records = await db.getAll(METADATA_STORE, range);
      return records.map(cloneMetadataRecord);
    }

    const records = await db.getAll(METADATA_STORE);
    return records
      .filter((record) => record.key.startsWith(normalizedPrefix))
      .map(cloneMetadataRecord);
  } catch {
    return Array.from(memoryMetadata.values())
      .filter((record) => record.key.startsWith(normalizedPrefix))
      .map(cloneMetadataRecord);
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

export {
  DB_NAME,
  VERSION,
  FILES_STORE,
  SEARCH_INDEX_STORE,
  METADATA_STORE,
  PENDING_SYNC_STORE,
};

export const getOfflineFile = getFile;
export const addOfflineFile = putFile;
export const removeOfflineFile = deleteFile;
export const getAllOfflineFiles = getAllFiles;
export const clearOfflineFiles = clearFiles;
