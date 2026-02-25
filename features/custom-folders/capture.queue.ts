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
let drainInFlight: Promise<void> | null = null;

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

  if (normalized.sourceFolderId === normalized.targetFolderId) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    const existing = await db.getAll(MOVE_STORE);
    const duplicates = existing
      .filter((entry) => entry.fileId === normalized.fileId && entry.id !== normalized.id)
      .map((entry) => entry.id);
    for (const duplicateId of duplicates) {
      await db.delete(MOVE_STORE, duplicateId);
    }

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

async function markMoveFailed(db: IDBPDatabase<CaptureQueueDbSchema>, item: PendingMove): Promise<void> {
  try {
    await db.put(MOVE_STORE, {
      ...item,
      status: "failed",
      attempts: Math.max(item.attempts, MAX_ATTEMPTS),
      lastAttemptAt: Date.now(),
    });
  } catch {
  }
}

async function drainPendingCapturesInternal(
  db: IDBPDatabase<CaptureQueueDbSchema>,
): Promise<void> {
  let captures: PendingCapture[] = [];
  try {
    captures = await db.getAll(CAPTURE_STORE);
  } catch {
    return;
  }

  if (captures.length === 0) {
    return;
  }

  for (const capture of captures) {
    if (!capture.id?.trim() || !capture.folderId?.trim() || !capture.blobKey?.trim()) {
      try {
        await db.delete(CAPTURE_STORE, capture.id);
      } catch {
      }
      continue;
    }

    const attempts = Math.max(0, capture.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      await markCaptureFailed(db, capture);
      continue;
    }
  }
}

async function drainPendingMovesInternal(
  db: IDBPDatabase<CaptureQueueDbSchema>,
): Promise<void> {
  let moves: PendingMove[] = [];
  try {
    moves = await db.getAll(MOVE_STORE);
  } catch {
    return;
  }

  if (moves.length === 0) {
    return;
  }

  const keepByFileId = new Map<string, PendingMove>();
  const moveIdsToDelete = new Set<string>();
  const sortedMoves = [...moves].sort((left, right) => right.createdAt - left.createdAt);
  for (const move of sortedMoves) {
    const fileId = move.fileId.trim();
    if (!fileId || move.sourceFolderId === move.targetFolderId) {
      moveIdsToDelete.add(move.id);
      continue;
    }

    if (keepByFileId.has(fileId)) {
      moveIdsToDelete.add(move.id);
      continue;
    }

    keepByFileId.set(fileId, move);
  }

  for (const id of moveIdsToDelete) {
    try {
      await db.delete(MOVE_STORE, id);
    } catch {
    }
  }

  for (const move of keepByFileId.values()) {
    const attempts = Math.max(0, move.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      await markMoveFailed(db, move);
      continue;
    }
  }
}

export function isCaptureSyncEnabled(): boolean {
  return CAPTURE_SYNC_ENABLED;
}

export async function drainPendingCaptures(): Promise<void> {
  if (drainInFlight) {
    return drainInFlight;
  }

  drainInFlight = (async () => {
    const db = await getDb();
    if (!db) {
      return;
    }

    await drainPendingCapturesInternal(db);
    await drainPendingMovesInternal(db);
  })().finally(() => {
    drainInFlight = null;
  });

  await drainInFlight;
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

export async function getPendingMoveCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 0;
  }

  try {
    const entries = await db.getAll(MOVE_STORE);
    return entries.length;
  } catch {
    return 0;
  }
}

export async function getFailedMoveCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 0;
  }

  try {
    const entries = await db.getAll(MOVE_STORE);
    return entries.filter((entry) => entry.status === "failed").length;
  } catch {
    return 0;
  }
}
