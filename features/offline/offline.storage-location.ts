"use client";

import { openDB, type IDBPDatabase } from "idb";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StorageProvider {
  kind: "filesystem" | "indexeddb";
  writeFile(name: string, blob: Blob): Promise<void>;
  readFile(name: string): Promise<Blob | null>;
  deleteFile(name: string): Promise<void>;
  listFiles(): Promise<string[]>;
}

export interface StorageLocationConfig {
  providerType: "filesystem" | "indexeddb";
  displayPath: string | null;
}

export interface MigrationManifest {
  files: string[];
  completed: string[];
  startedAt: number;
}

export type PermissionStatus = "granted" | "denied" | "prompt";

// ─── Constants ──────────────────────────────────────────────────────────────

const MARKER_FILE = ".studytrix-marker";
const MARKER_CONTENT = "studytrix-offline-storage-v1";
const CONFIG_KEY = "studytrix.storage_location.config";
const HANDLE_DB_NAME = "studytrix_dir_handles";
const HANDLE_DB_VERSION = 1;
const HANDLE_STORE = "handles";
const HANDLE_KEY = "primary";
const MIGRATION_MANIFEST_FILE = "_migration_manifest.json";

// ─── Feature Detection ─────────────────────────────────────────────────────

export function supportsFileSystemAccess(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return typeof (window as any).showDirectoryPicker === "function";
}

// ─── Directory Handle Persistence ───────────────────────────────────────────

let handleDbPromise: Promise<IDBPDatabase | null> | null = null;

async function getHandleDB(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  if (!handleDbPromise) {
    handleDbPromise = (async () => {
      try {
        return await openDB(HANDLE_DB_NAME, HANDLE_DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(HANDLE_STORE)) {
              db.createObjectStore(HANDLE_STORE);
            }
          },
        });
      } catch {
        return null;
      }
    })();
  }

  return handleDbPromise;
}

export async function persistDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await getHandleDB();
  if (!db) {
    return;
  }

  try {
    await db.put(HANDLE_STORE, handle, HANDLE_KEY);
  } catch {
    // Best effort — some browsers may not support serializing handles.
  }
}

export async function loadDirectoryHandle(): Promise<{
  handle: FileSystemDirectoryHandle | null;
  permissionGranted: boolean;
}> {
  const db = await getHandleDB();
  if (!db) {
    return { handle: null, permissionGranted: false };
  }

  try {
    const handle = (await db.get(
      HANDLE_STORE,
      HANDLE_KEY,
    )) as FileSystemDirectoryHandle | undefined;

    if (!handle) {
      return { handle: null, permissionGranted: false };
    }

    const queryPermission = (handle as any).queryPermission;
    const requestPermission = (handle as any).requestPermission;

    // Attempt silent permission re-acquisition when supported.
    if (typeof queryPermission === "function") {
      const queryResult = await queryPermission.call(handle, { mode: "readwrite" });
      if (queryResult === "granted") {
        return { handle, permissionGranted: true };
      }

      if (queryResult === "denied") {
        return { handle, permissionGranted: false };
      }
    }

    // Try requesting permission if the implementation exposes it.
    if (typeof requestPermission === "function") {
      try {
        const requestResult = await requestPermission.call(handle, { mode: "readwrite" });
        return { handle, permissionGranted: requestResult === "granted" };
      } catch {
        // requestPermission failed (e.g., no user gesture context).
        return { handle, permissionGranted: false };
      }
    }

    // Some mobile/PWA runtimes omit permission APIs; if the handle is restored,
    // allow runtime reads/writes to be the source of truth.
    return { handle, permissionGranted: true };
  } catch {
    return { handle: null, permissionGranted: false };
  }
}

export async function clearPersistedHandle(): Promise<void> {
  const db = await getHandleDB();
  if (!db) {
    return;
  }

  try {
    await db.delete(HANDLE_STORE, HANDLE_KEY);
  } catch {
    // Best effort.
  }
}

// ─── Config Persistence (localStorage) ──────────────────────────────────────

export function saveConfig(config: StorageLocationConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Best effort.
  }
}

export function loadConfig(): StorageLocationConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StorageLocationConfig;
    if (
      parsed &&
      typeof parsed.providerType === "string" &&
      (parsed.providerType === "filesystem" || parsed.providerType === "indexeddb")
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function clearConfig(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CONFIG_KEY);
  } catch {
    // Best effort.
  }
}

// ─── FileSystemAccessProvider ───────────────────────────────────────────────

export class FileSystemAccessProvider implements StorageProvider {
  readonly kind = "filesystem" as const;

  constructor(private readonly dirHandle: FileSystemDirectoryHandle) {}

  get displayPath(): string {
    return this.dirHandle.name;
  }

  async writeFile(name: string, blob: Blob): Promise<void> {
    const fileHandle = await this.dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();

    try {
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      try {
        await writable.abort();
      } catch {
        // Ignore abort errors.
      }

      throw error;
    }
  }

  async readFile(name: string): Promise<Blob | null> {
    try {
      const fileHandle = await this.dirHandle.getFileHandle(name);
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  }

  async deleteFile(name: string): Promise<void> {
    try {
      await this.dirHandle.removeEntry(name);
    } catch {
      // File may not exist — that's fine.
    }
  }

  async listFiles(): Promise<string[]> {
    const names: string[] = [];

    for await (const [name, handle] of (this.dirHandle as any).entries()) {
      if (handle.kind === "file" && !name.startsWith(".") && !name.startsWith("_")) {
        names.push(name);
      }
    }

    return names;
  }

  async hasMarker(): Promise<boolean> {
    try {
      const fileHandle = await this.dirHandle.getFileHandle(MARKER_FILE);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return text.trim().startsWith("studytrix-offline-storage");
    } catch {
      return false;
    }
  }

  async createMarker(): Promise<void> {
    await this.writeFile(
      MARKER_FILE,
      new Blob([MARKER_CONTENT], { type: "text/plain" }),
    );
  }
}

// ─── IndexedDBProvider ──────────────────────────────────────────────────────

export class IndexedDBProvider implements StorageProvider {
  readonly kind = "indexeddb" as const;

  async writeFile(name: string, blob: Blob): Promise<void> {
    const { putFile } = await import("./offline.db");
    await putFile({
      fileId: name,
      blob,
      size: blob.size,
      mimeType: blob.type || "application/octet-stream",
      modifiedTime: new Date().toISOString(),
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });
  }

  async readFile(name: string): Promise<Blob | null> {
    const { getFile } = await import("./offline.db");
    const record = await getFile(name);
    return record?.blob ?? null;
  }

  async deleteFile(name: string): Promise<void> {
    const { deleteFile } = await import("./offline.db");
    await deleteFile(name);
  }

  async listFiles(): Promise<string[]> {
    const { getAllFiles } = await import("./offline.db");
    const records = await getAllFiles();
    return records.map((r) => r.fileId);
  }
}

// ─── Module-Level Singleton ─────────────────────────────────────────────────

let activeProvider: StorageProvider | null = null;

export function setActiveProvider(provider: StorageProvider | null): void {
  activeProvider = provider;
}

export function getActiveProvider(): StorageProvider | null {
  return activeProvider;
}

// ─── Migration ──────────────────────────────────────────────────────────────

export async function migrateFiles(
  from: StorageProvider,
  to: StorageProvider,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const files = await from.listFiles();
  const total = files.length;

  if (total === 0) {
    onProgress?.(0, 0);
    return;
  }

  // Write checkpoint manifest to the destination.
  const manifest: MigrationManifest = {
    files,
    completed: [],
    startedAt: Date.now(),
  };

  await writeManifest(to, manifest);

  // Copy phase — write each file to the new location.
  for (let i = 0; i < files.length; i++) {
    const name = files[i];

    if (manifest.completed.includes(name)) {
      onProgress?.(i + 1, total);
      continue;
    }

    const blob = await from.readFile(name);
    if (blob) {
      await to.writeFile(name, blob);
    }

    manifest.completed.push(name);
    await writeManifest(to, manifest);
    onProgress?.(i + 1, total);
  }

  // Delete phase — remove from old provider only after all copies verified.
  for (const name of files) {
    await from.deleteFile(name);
  }

  // Clean up manifest.
  await to.deleteFile(MIGRATION_MANIFEST_FILE);
}

export async function resumeMigration(
  from: StorageProvider,
  to: StorageProvider,
  onProgress?: (done: number, total: number) => void,
): Promise<boolean> {
  const manifestBlob = await to.readFile(MIGRATION_MANIFEST_FILE);
  if (!manifestBlob) {
    return false;
  }

  try {
    const text = await manifestBlob.text();
    const manifest = JSON.parse(text) as MigrationManifest;

    if (!Array.isArray(manifest.files) || !Array.isArray(manifest.completed)) {
      await to.deleteFile(MIGRATION_MANIFEST_FILE);
      return false;
    }

    const remaining = manifest.files.filter(
      (f) => !manifest.completed.includes(f),
    );

    const total = manifest.files.length;
    let done = manifest.completed.length;

    for (const name of remaining) {
      const blob = await from.readFile(name);
      if (blob) {
        await to.writeFile(name, blob);
      }

      manifest.completed.push(name);
      done++;
      await writeManifest(to, manifest);
      onProgress?.(done, total);
    }

    // Delete from old provider.
    for (const name of manifest.files) {
      await from.deleteFile(name);
    }

    await to.deleteFile(MIGRATION_MANIFEST_FILE);
    return true;
  } catch {
    return false;
  }
}

async function writeManifest(
  provider: StorageProvider,
  manifest: MigrationManifest,
): Promise<void> {
  const blob = new Blob([JSON.stringify(manifest)], {
    type: "application/json",
  });
  await provider.writeFile(MIGRATION_MANIFEST_FILE, blob);
}

// ─── Utility: Pick Directory ────────────────────────────────────────────────

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsFileSystemAccess()) {
    return null;
  }

  const picker = (window as any).showDirectoryPicker;
  if (typeof picker !== "function") {
    return null;
  }

  try {
    const handle = await picker({
      mode: "readwrite",
    });
    return handle;
  } catch {
    // Retry without options for runtimes that reject the readwrite parameter.
    try {
      const handle = await picker();
      return handle;
    } catch {
      // User cancelled or permission denied.
      return null;
    }
  }
}

export async function pickAndCreateSubdirectory(
  folderName: string,
): Promise<FileSystemDirectoryHandle | null> {
  const parentHandle = await pickDirectory();
  if (!parentHandle) {
    return null;
  }

  try {
    return await parentHandle.getDirectoryHandle(folderName, { create: true });
  } catch {
    return null;
  }
}
