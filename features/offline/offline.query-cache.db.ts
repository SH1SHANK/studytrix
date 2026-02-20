"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { isOfflineV3Enabled } from "./offline.flags";
import {
  getQueryCacheLiveness,
  resolveQueryCacheWindow,
  type QueryCacheLiveness,
} from "./offline.query-cache.policy";

const DB_NAME = "studytrix_offline_query_v1";
const DB_VERSION = 1;
const QUERIES_STORE = "queries";
const DEFAULT_SCHEMA_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 600;
const DEFAULT_PRUNE_TARGET = 450;

export type QueryCacheRecord<T = unknown> = {
  key: string;
  payload: T;
  updatedAt: number;
  expiresAt: number;
  maxStaleAt: number;
  schemaVersion: number;
  bytesEstimate: number;
};

type QueryCacheReadResult<T> = {
  status: "miss" | QueryCacheLiveness;
  entry: QueryCacheRecord<T> | null;
};

interface QueryCacheDbSchema extends DBSchema {
  [QUERIES_STORE]: {
    key: string;
    value: QueryCacheRecord<unknown>;
  };
}

const memoryCache = new Map<string, QueryCacheRecord<unknown>>();

let dbPromise: Promise<IDBPDatabase<QueryCacheDbSchema> | null> | null = null;
let indexedDbDisabled = false;

function cloneRecord<T>(record: QueryCacheRecord<T>): QueryCacheRecord<T> {
  let payload: T;
  if (typeof structuredClone === "function") {
    payload = structuredClone(record.payload);
  } else {
    const serialized = JSON.stringify(record.payload);
    payload = (
      typeof serialized === "string"
        ? JSON.parse(serialized)
        : record.payload
    ) as T;
  }

  return {
    ...record,
    payload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidEntry(value: unknown): value is QueryCacheRecord<unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.key === "string"
    && value.key.length > 0
    && Number.isFinite(value.updatedAt)
    && Number.isFinite(value.expiresAt)
    && Number.isFinite(value.maxStaleAt)
    && Number.isFinite(value.schemaVersion)
    && Number.isFinite(value.bytesEstimate)
    && Object.prototype.hasOwnProperty.call(value, "payload")
  );
}

function estimateBytes(payload: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch {
    return 0;
  }
}

async function getDb(): Promise<IDBPDatabase<QueryCacheDbSchema> | null> {
  if (indexedDbDisabled || !isOfflineV3Enabled()) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await openDB<QueryCacheDbSchema>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(QUERIES_STORE)) {
              db.createObjectStore(QUERIES_STORE, { keyPath: "key" });
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

async function writeEntry<T>(entry: QueryCacheRecord<T>): Promise<void> {
  const cloned = cloneRecord(entry);
  memoryCache.set(entry.key, cloned as QueryCacheRecord<unknown>);

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(QUERIES_STORE, cloned as QueryCacheRecord<unknown>);
  } catch {
  }
}

async function deleteEntry(key: string): Promise<void> {
  memoryCache.delete(key);

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.delete(QUERIES_STORE, key);
  } catch {
  }
}

async function listEntries(): Promise<QueryCacheRecord<unknown>[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(memoryCache.values()).map((entry) => cloneRecord(entry));
  }

  try {
    const records = await db.getAll(QUERIES_STORE);
    const valid = records.filter(isValidEntry).map((entry) => cloneRecord(entry));
    for (const record of valid) {
      memoryCache.set(record.key, record);
    }
    return valid;
  } catch {
    return Array.from(memoryCache.values()).map((entry) => cloneRecord(entry));
  }
}

export async function getQueryCacheRecord<T>(
  key: string,
): Promise<QueryCacheRecord<T> | null> {
  if (!isOfflineV3Enabled()) {
    return null;
  }

  const inMemory = memoryCache.get(key);
  if (inMemory && isValidEntry(inMemory)) {
    return cloneRecord(inMemory as QueryCacheRecord<T>);
  }

  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const record = await db.get(QUERIES_STORE, key);
    if (!isValidEntry(record)) {
      if (record) {
        await deleteEntry(key);
      }
      return null;
    }
    memoryCache.set(key, cloneRecord(record));
    return cloneRecord(record as QueryCacheRecord<T>);
  } catch {
    return null;
  }
}

export async function getFreshOrStale<T>(
  key: string,
  now = Date.now(),
): Promise<QueryCacheReadResult<T>> {
  const entry = await getQueryCacheRecord<T>(key);
  if (!entry) {
    return {
      status: "miss",
      entry: null,
    };
  }

  const status = getQueryCacheLiveness(now, entry.expiresAt, entry.maxStaleAt);
  if (status === "expired") {
    await deleteEntry(key);
    return {
      status,
      entry: null,
    };
  }

  return {
    status,
    entry,
  };
}

export async function putWithPolicy<T>(
  key: string,
  payload: T,
  schemaVersion = DEFAULT_SCHEMA_VERSION,
): Promise<QueryCacheRecord<T> | null> {
  if (!isOfflineV3Enabled()) {
    return null;
  }

  const now = Date.now();
  const window = resolveQueryCacheWindow(key, now);
  const entry: QueryCacheRecord<T> = {
    key,
    payload,
    updatedAt: now,
    expiresAt: window.expiresAt,
    maxStaleAt: window.maxStaleAt,
    schemaVersion,
    bytesEstimate: estimateBytes(payload),
  };

  await writeEntry(entry);
  return entry;
}

export async function invalidateKey(key: string): Promise<void> {
  if (!isOfflineV3Enabled()) {
    return;
  }

  await deleteEntry(key);
}

export async function invalidatePrefix(prefix: string): Promise<number> {
  if (!isOfflineV3Enabled()) {
    return 0;
  }

  const entries = await listEntries();
  const candidates = entries.filter((entry) => entry.key.startsWith(prefix));

  for (const entry of candidates) {
    await deleteEntry(entry.key);
  }

  return candidates.length;
}

export async function prune(options?: {
  maxEntries?: number;
  targetEntries?: number;
  now?: number;
}): Promise<number> {
  if (!isOfflineV3Enabled()) {
    return 0;
  }

  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const targetEntries = options?.targetEntries ?? DEFAULT_PRUNE_TARGET;
  const now = options?.now ?? Date.now();

  const entries = await listEntries();
  let deleted = 0;

  for (const entry of entries) {
    if (entry.maxStaleAt < now) {
      await deleteEntry(entry.key);
      deleted += 1;
    }
  }

  const liveEntries = (await listEntries())
    .sort((left, right) => left.updatedAt - right.updatedAt);

  if (liveEntries.length <= maxEntries) {
    return deleted;
  }

  const removeCount = Math.max(0, liveEntries.length - targetEntries);
  for (let i = 0; i < removeCount; i += 1) {
    await deleteEntry(liveEntries[i].key);
    deleted += 1;
  }

  return deleted;
}

export async function clearQueryCache(): Promise<void> {
  memoryCache.clear();

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.clear(QUERIES_STORE);
  } catch {
  }
}

export { DB_NAME as QUERY_CACHE_DB_NAME, QUERIES_STORE as QUERY_CACHE_STORE };
