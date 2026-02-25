"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const HANDLE_DB_NAME = "studytrix_local_folder_handles";
const HANDLE_DB_VERSION = 1;
const HANDLE_STORE = "local_folder_handles";

interface LocalHandleSchema extends DBSchema {
  [HANDLE_STORE]: {
    key: string;
    value: FileSystemDirectoryHandle;
  };
}

type PermissionHandle = {
  queryPermission: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

type DirectoryEntryLike = {
  kind: "file" | "directory";
  name: string;
};

type DirectoryEntriesHandle = {
  entries: () => AsyncIterable<[string, DirectoryEntryLike]>;
};

let dbPromise: Promise<IDBPDatabase<LocalHandleSchema> | null> | null = null;

async function getDb(): Promise<IDBPDatabase<LocalHandleSchema> | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await openDB<LocalHandleSchema>(HANDLE_DB_NAME, HANDLE_DB_VERSION, {
          upgrade(database) {
            if (!database.objectStoreNames.contains(HANDLE_STORE)) {
              database.createObjectStore(HANDLE_STORE);
            }
          },
        });
      } catch {
        return null;
      }
    })();
  }

  return dbPromise;
}

export async function saveDirectoryHandle(
  key: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(HANDLE_STORE, handle, normalizedKey);
  } catch {
  }
}

export async function loadDirectoryHandle(
  key: string,
): Promise<FileSystemDirectoryHandle | null> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return null;
  }

  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const handle = await db.get(HANDLE_STORE, normalizedKey);
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function deleteDirectoryHandle(key: string): Promise<void> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.delete(HANDLE_STORE, normalizedKey);
  } catch {
  }
}

export async function verifyHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<"granted" | "requires-gesture" | "lost"> {
  try {
    const permission = await (handle as unknown as PermissionHandle).queryPermission({ mode: "read" });
    if (permission === "granted") {
      return "granted";
    }
    if (permission === "prompt") {
      return "requires-gesture";
    }
    return "lost";
  } catch {
    return "lost";
  }
}

export async function requestHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const result = await (handle as unknown as PermissionHandle).requestPermission({ mode: "read" });
    return result === "granted";
  } catch {
    return false;
  }
}

export async function scanHandleShallow(
  handle: FileSystemDirectoryHandle,
): Promise<{ fileCount: number; folderCount: number }> {
  let fileCount = 0;
  let folderCount = 0;

  for await (const [, entry] of (handle as unknown as DirectoryEntriesHandle).entries()) {
    if (entry.kind === "file") {
      fileCount += 1;
      continue;
    }

    folderCount += 1;
  }

  return { fileCount, folderCount };
}
