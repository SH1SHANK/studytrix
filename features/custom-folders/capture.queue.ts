"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type PendingCapture = {
  id: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  blobKey: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status?: "pending" | "failed";
};

export type PendingMove = {
  id: string;
  fileId: string;
  sourceFolderId: string;
  targetFolderId: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status?: "pending" | "failed";
};

interface CaptureQueueDbSchema extends DBSchema {
  pending_captures: {
    key: string;
    value: PendingCapture;
  };
  pending_moves: {
    key: string;
    value: PendingMove;
  };
}

const DB_NAME = "studytrix_capture_queue";
const DB_VERSION = 1;
const CAPTURE_STORE = "pending_captures";
const MOVE_STORE = "pending_moves";
const MAX_ATTEMPTS = 3;
const CAPTURE_SYNC_ENABLED = false;

let dbPromise: Promise<IDBPDatabase<CaptureQueueDbSchema> | null> | null = null;

async function getDb(): Promise<IDBPDatabase<CaptureQueueDbSchema> | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await openDB<CaptureQueueDbSchema>(DB_NAME, DB_VERSION, {
          upgrade(database) {
            if (!database.objectStoreNames.contains(CAPTURE_STORE)) {
              database.createObjectStore(CAPTURE_STORE, { keyPath: "id" });
            }
            if (!database.objectStoreNames.contains(MOVE_STORE)) {
              database.createObjectStore(MOVE_STORE, { keyPath: "id" });
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

function normalizePendingCapture(capture: PendingCapture): PendingCapture {
  return {
    ...capture,
    id: capture.id.trim(),
    folderId: capture.folderId.trim(),
    fileName: capture.fileName.trim() || "capture.bin",
    mimeType: capture.mimeType.trim() || "application/octet-stream",
    blobKey: capture.blobKey.trim(),
    attempts: Math.max(0, Math.floor(capture.attempts)),
    status: capture.status ?? "pending",
  };
}

function normalizePendingMove(move: PendingMove): PendingMove {
  return {
    ...move,
    id: move.id.trim(),
    fileId: move.fileId.trim(),
    sourceFolderId: move.sourceFolderId.trim(),
    targetFolderId: move.targetFolderId.trim(),
    attempts: Math.max(0, Math.floor(move.attempts)),
    status: move.status ?? "pending",
  };
}

export async function enqueuePendingCapture(capture: PendingCapture): Promise<void> {
  const normalized = normalizePendingCapture(capture);
  if (!normalized.id || !normalized.folderId || !normalized.blobKey) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(CAPTURE_STORE, normalized);
  } catch {
  }
}

export async function enqueuePendingMove(move: PendingMove): Promise<void> {
  const normalized = normalizePendingMove(move);
  if (!normalized.id || !normalized.fileId || !normalized.sourceFolderId || !normalized.targetFolderId) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.put(MOVE_STORE, normalized);
  } catch {
  }
}

async function markCaptureFailed(db: IDBPDatabase<CaptureQueueDbSchema>, item: PendingCapture): Promise<void> {
  try {
    await db.put(CAPTURE_STORE, {
      ...item,
      status: "failed",
      attempts: Math.max(item.attempts, MAX_ATTEMPTS),
      lastAttemptAt: Date.now(),
    });
  } catch {
  }
}

export async function drainPendingCaptures(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  let captures: PendingCapture[] = [];
  try {
    captures = await db.getAll(CAPTURE_STORE);
  } catch {
    return;
  }

  if (captures.length === 0) {
    return;
  }

  if (!CAPTURE_SYNC_ENABLED) {
    // Drive write APIs are intentionally disabled in this mode.
    return;
  }

  for (const capture of captures) {
    const attempts = Math.max(0, capture.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      await markCaptureFailed(db, capture);
      continue;
    }

    const now = Date.now();
    try {
      await db.put(CAPTURE_STORE, {
        ...capture,
        attempts: attempts + 1,
        lastAttemptAt: now,
        status: "pending",
      });
    } catch {
    }
  }
}

export async function getPendingCaptureCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 0;
  }

  try {
    const entries = await db.getAll(CAPTURE_STORE);
    return entries.length;
  } catch {
    return 0;
  }
}

export async function getFailedCaptureCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 0;
  }

  try {
    const entries = await db.getAll(CAPTURE_STORE);
    return entries.filter((entry) => entry.status === "failed").length;
  } catch {
    return 0;
  }
}

