"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface NestedCommandFileEntry {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  courseCode: string;
  courseName: string;
  rootFolderId: string;
  parentFolderId: string;
  parentFolderName: string;
  ancestorFolderIds: string[];
  ancestorFolderNames: string[];
  path: string;
}

export interface NestedCommandFileSnapshot {
  scopeKey: string;
  rootSignature: string;
  updatedAt: number;
  entries: NestedCommandFileEntry[];
}

interface CommandIndexDbSchema extends DBSchema {
  snapshots: {
    key: string;
    value: NestedCommandFileSnapshot;
  };
}

const DB_NAME = "studytrix_command_index";
const DB_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
const memorySnapshots = new Map<string, NestedCommandFileSnapshot>();

let dbPromise: Promise<IDBPDatabase<CommandIndexDbSchema> | null> | null = null;
let indexedDbDisabled = false;

function cloneEntry(entry: NestedCommandFileEntry): NestedCommandFileEntry {
  return { ...entry };
}

function cloneSnapshot(
  snapshot: NestedCommandFileSnapshot,
): NestedCommandFileSnapshot {
  return {
    ...snapshot,
    entries: snapshot.entries.map(cloneEntry),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSnapshot(value: unknown): NestedCommandFileSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const scopeKey = typeof value.scopeKey === "string" ? value.scopeKey.trim() : "";
  const rootSignature =
    typeof value.rootSignature === "string" ? value.rootSignature.trim() : "";
  const updatedAt = typeof value.updatedAt === "number" ? value.updatedAt : 0;
  const entriesRaw = Array.isArray(value.entries) ? value.entries : [];

  if (!scopeKey || !rootSignature || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return null;
  }

  const entries: NestedCommandFileEntry[] = [];
  for (const entry of entriesRaw) {
    if (!isRecord(entry)) {
      continue;
    }

    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const mimeType =
      typeof entry.mimeType === "string" && entry.mimeType.trim()
        ? entry.mimeType.trim()
        : "application/octet-stream";
    const size =
      typeof entry.size === "number" && Number.isFinite(entry.size) && entry.size >= 0
        ? entry.size
        : null;
    const modifiedTime =
      typeof entry.modifiedTime === "string" && entry.modifiedTime.trim()
        ? entry.modifiedTime.trim()
        : null;
    const webViewLink =
      typeof entry.webViewLink === "string" && entry.webViewLink.trim()
        ? entry.webViewLink.trim()
        : null;
    const courseCode =
      typeof entry.courseCode === "string" ? entry.courseCode.trim() : "";
    const courseName =
      typeof entry.courseName === "string" ? entry.courseName.trim() : "";
    const rootFolderId =
      typeof entry.rootFolderId === "string" ? entry.rootFolderId.trim() : "";
    const parentFolderId =
      typeof entry.parentFolderId === "string" ? entry.parentFolderId.trim() : "";
    const parentFolderName =
      typeof entry.parentFolderName === "string" ? entry.parentFolderName.trim() : "";
    const ancestorFolderIdsRaw = Array.isArray(entry.ancestorFolderIds)
      ? entry.ancestorFolderIds
      : [];
    const ancestorFolderNamesRaw = Array.isArray(entry.ancestorFolderNames)
      ? entry.ancestorFolderNames
      : [];
    const ancestorFolderIds = ancestorFolderIdsRaw
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
    const ancestorFolderNames = ancestorFolderNamesRaw
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
    const path = typeof entry.path === "string" ? entry.path.trim() : "";

    if (!id || !name || !courseCode || !parentFolderId) {
      continue;
    }

    entries.push({
      id,
      name,
      mimeType,
      size,
      modifiedTime,
      webViewLink,
      courseCode,
      courseName: courseName || courseCode,
      rootFolderId: rootFolderId || ancestorFolderIds[0] || parentFolderId,
      parentFolderId,
      parentFolderName: parentFolderName || courseName || courseCode,
      ancestorFolderIds:
        ancestorFolderIds.length > 0
          ? ancestorFolderIds
          : [rootFolderId || parentFolderId, parentFolderId].filter(Boolean),
      ancestorFolderNames:
        ancestorFolderNames.length > 0
          ? ancestorFolderNames
          : [courseName || courseCode, parentFolderName || courseName || courseCode],
      path: path || (courseName || courseCode),
    });
  }

  return {
    scopeKey,
    rootSignature,
    updatedAt,
    entries,
  };
}

async function getDb(): Promise<IDBPDatabase<CommandIndexDbSchema> | null> {
  if (indexedDbDisabled) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await openDB<CommandIndexDbSchema>(DB_NAME, DB_VERSION, {
          upgrade(database) {
            if (!database.objectStoreNames.contains(SNAPSHOTS_STORE)) {
              database.createObjectStore(SNAPSHOTS_STORE, { keyPath: "scopeKey" });
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

export function buildNestedCommandScopeKey(
  departmentId: string,
  semesterId: string,
): string {
  return `${departmentId.trim().toUpperCase()}:${semesterId.trim()}`;
}

export async function getNestedCommandSnapshot(
  scopeKey: string,
): Promise<NestedCommandFileSnapshot | null> {
  const normalizedScopeKey = scopeKey.trim();
  if (!normalizedScopeKey) {
    return null;
  }

  const inMemory = memorySnapshots.get(normalizedScopeKey);
  if (inMemory) {
    return cloneSnapshot(inMemory);
  }

  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const snapshot = await db.get(SNAPSHOTS_STORE, normalizedScopeKey);
    const parsed = parseSnapshot(snapshot);
    if (!parsed) {
      return null;
    }

    memorySnapshots.set(normalizedScopeKey, parsed);
    return cloneSnapshot(parsed);
  } catch {
    return null;
  }
}

export async function setNestedCommandSnapshot(
  snapshot: NestedCommandFileSnapshot,
): Promise<void> {
  const parsed = parseSnapshot(snapshot);
  if (!parsed) {
    return;
  }

  memorySnapshots.set(parsed.scopeKey, cloneSnapshot(parsed));

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(SNAPSHOTS_STORE, cloneSnapshot(parsed));
  } catch {
    // memory fallback already updated
  }
}

export async function getAllNestedCommandSnapshots(): Promise<NestedCommandFileSnapshot[]> {
  const fromMemory = Array.from(memorySnapshots.values()).map((snapshot) =>
    cloneSnapshot(snapshot),
  );

  const db = await getDb();
  if (!db) {
    return fromMemory.sort((left, right) => right.updatedAt - left.updatedAt);
  }

  try {
    const values = await db.getAll(SNAPSHOTS_STORE);
    const parsed = values
      .map((value) => parseSnapshot(value))
      .filter((value): value is NestedCommandFileSnapshot => value !== null)
      .map((snapshot) => cloneSnapshot(snapshot));

    for (const snapshot of parsed) {
      memorySnapshots.set(snapshot.scopeKey, cloneSnapshot(snapshot));
    }

    return parsed.sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return fromMemory.sort((left, right) => right.updatedAt - left.updatedAt);
  }
}
