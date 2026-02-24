"use client";

import { openDB, type IDBPDatabase } from "idb";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StorageProvider {
  kind: "filesystem" | "indexeddb";
  /**
   * Writes `blob` at `name`.
   * Throws on unrecoverable write failures (e.g. permission revoked, quota exceeded).
   */
  writeFile(name: string, blob: Blob): Promise<void>;
  /**
   * Reads `name`.
   * Returns `null` when the file does not exist or is unreadable.
   */
  readFile(name: string): Promise<Blob | null>;
  /**
   * Deletes `name`.
   * Best effort: implementations may swallow "not found".
   */
  deleteFile(name: string): Promise<void>;
  /**
   * Lists user file names (excluding internal marker/manifest files).
   * Returns empty list on unreadable directories.
   */
  listFiles(): Promise<string[]>;
  /**
   * Lightweight read+write probe.
   * Must return `false` (not throw) when the provider is currently inaccessible.
   */
  testAccess(): Promise<boolean>;
}

export type StorageHandleStatus = "valid" | "requires-gesture" | "lost" | "unsupported";

export interface StorageLocationConfig {
  providerType: "filesystem" | "indexeddb";
  displayPath: string | null;
  handleStatus: StorageHandleStatus;
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
const ACCESS_TEST_FILE = ".studytrix-access-test";
export const MIN_RECOMMENDED_AVAILABLE_BYTES = 500 * 1024 * 1024;

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
  handleStatus: StorageHandleStatus;
}>;
export async function loadDirectoryHandle(options: {
  requestOnPrompt?: boolean;
}): Promise<{
  handle: FileSystemDirectoryHandle | null;
  permissionGranted: boolean;
  handleStatus: StorageHandleStatus;
}>;
export async function loadDirectoryHandle(options?: {
  requestOnPrompt?: boolean;
}): Promise<{
  handle: FileSystemDirectoryHandle | null;
  permissionGranted: boolean;
  handleStatus: StorageHandleStatus;
}> {
  const db = await getHandleDB();
  if (!db) {
    return { handle: null, permissionGranted: false, handleStatus: "unsupported" };
  }

  try {
    const handle = (await db.get(
      HANDLE_STORE,
      HANDLE_KEY,
    )) as FileSystemDirectoryHandle | undefined;

    if (!handle) {
      return { handle: null, permissionGranted: false, handleStatus: "lost" };
    }

    const queryPermission = (handle as any).queryPermission;
    const requestPermission = (handle as any).requestPermission;

    // Attempt silent permission re-acquisition when supported.
    if (typeof queryPermission === "function") {
      const queryResult = await queryPermission.call(handle, { mode: "readwrite" });
      if (queryResult === "granted") {
        return { handle, permissionGranted: true, handleStatus: "valid" };
      }

      if (queryResult === "denied") {
        return { handle, permissionGranted: false, handleStatus: "lost" };
      }

      if (queryResult === "prompt") {
        if (options?.requestOnPrompt && typeof requestPermission === "function") {
          try {
            const requestResult = await requestPermission.call(handle, { mode: "readwrite" });
            if (requestResult === "granted") {
              return { handle, permissionGranted: true, handleStatus: "valid" };
            }
            return { handle, permissionGranted: false, handleStatus: "requires-gesture" };
          } catch {
            return { handle, permissionGranted: false, handleStatus: "requires-gesture" };
          }
        }

        return { handle, permissionGranted: false, handleStatus: "requires-gesture" };
      }
    }

    // Try requesting permission if the implementation exposes it.
    if (typeof requestPermission === "function") {
      try {
        const requestResult = await requestPermission.call(handle, { mode: "readwrite" });
        if (requestResult === "granted") {
          return { handle, permissionGranted: true, handleStatus: "valid" };
        }
        return { handle, permissionGranted: false, handleStatus: "requires-gesture" };
      } catch {
        // requestPermission failed (e.g., no user gesture context).
        return { handle, permissionGranted: false, handleStatus: "requires-gesture" };
      }
    }

    // Some mobile/PWA runtimes omit permission APIs; if the handle is restored,
    // allow runtime reads/writes to be the source of truth.
    return { handle, permissionGranted: true, handleStatus: "valid" };
  } catch {
    return { handle: null, permissionGranted: false, handleStatus: "lost" };
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
      const handleStatus =
        parsed.handleStatus === "valid"
        || parsed.handleStatus === "requires-gesture"
        || parsed.handleStatus === "lost"
        || parsed.handleStatus === "unsupported"
          ? parsed.handleStatus
          : (parsed.providerType === "filesystem" ? "requires-gesture" : "valid");

      return {
        providerType: parsed.providerType,
        displayPath: parsed.displayPath ?? null,
        handleStatus,
      };
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

  private async writeDirect(name: string, blob: Blob): Promise<void> {
    const fileHandle = await this.dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      try {
        await writable.abort();
      } catch {
      }
      throw error;
    }
  }

  async writeFile(name: string, blob: Blob): Promise<void> {
    const tempName = `${name}.tmp`;
    await this.writeDirect(tempName, blob);

    try {
      const tempHandle = await this.dirHandle.getFileHandle(tempName);
      const move = (tempHandle as any).move;
      if (typeof move === "function") {
        await move.call(tempHandle, name);
      } else {
        // Chromium variants without move() cannot complete atomically; this fallback can tear on tab kill.
        await this.writeDirect(name, blob);
        await this.deleteFile(tempName);
      }
    } catch (error) {
      await this.deleteFile(tempName);
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

  async testAccess(): Promise<boolean> {
    try {
      await this.writeDirect(ACCESS_TEST_FILE, new Blob(["ok"], { type: "text/plain" }));
      await this.deleteFile(ACCESS_TEST_FILE);
      return true;
    } catch {
      return false;
    }
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

  async testAccess(): Promise<boolean> {
    try {
      const probeName = `__access_probe_${Date.now()}__`;
      await this.writeFile(probeName, new Blob(["ok"], { type: "text/plain" }));
      await this.deleteFile(probeName);
      return true;
    } catch {
      return false;
    }
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

// ─── Utility: Pick Directory ────────────────────────────────────────────────

export async function estimateAvailableStorageBytes(): Promise<number | null> {
  if (
    typeof navigator === "undefined"
    || !navigator.storage
    || typeof navigator.storage.estimate !== "function"
  ) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    if (typeof estimate.quota !== "number" || typeof estimate.usage !== "number") {
      return null;
    }
    return Math.max(0, estimate.quota - estimate.usage);
  } catch {
    return null;
  }
}

export async function confirmStorageBudgetOrWarn(): Promise<boolean> {
  const availableBytes = await estimateAvailableStorageBytes();
  if (availableBytes === null || availableBytes >= MIN_RECOMMENDED_AVAILABLE_BYTES) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const availableMb = Math.floor(availableBytes / (1024 * 1024));
  return window.confirm(
    `Only about ${availableMb} MB storage is available. Offline downloads may fail. Continue anyway?`,
  );
}

export async function pickDirectory(options?: {
  startIn?: "documents" | "downloads" | "desktop" | FileSystemDirectoryHandle;
}): Promise<FileSystemDirectoryHandle | null> {
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
      startIn: options?.startIn ?? "documents",
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
