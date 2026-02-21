"use client";

import { create } from "zustand";

import {
  type StorageLocationConfig,
  type StorageProvider,
  FileSystemAccessProvider,
  IndexedDBProvider,
  clearConfig,
  clearPersistedHandle,
  loadConfig,
  loadDirectoryHandle,
  migrateFiles,
  persistDirectoryHandle,
  pickAndCreateSubdirectory,
  pickDirectory,
  resumeMigration,
  saveConfig,
  setActiveProvider,
  supportsFileSystemAccess,
} from "./offline.storage-location";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StorageLocationStatus =
  | "unconfigured"
  | "configured"
  | "missing"
  | "migrating"
  | "unsupported";

export type StorageLocationErrorCode =
  | "PERMISSION_DENIED"
  | "INVALID_FOLDER"
  | "MIGRATION_FAILED"
  | "QUOTA_EXCEEDED"
  | "OFFLINE";

export interface StorageLocationError {
  code: StorageLocationErrorCode;
  message: string;
}

export interface StorageLocationState {
  status: StorageLocationStatus;
  displayPath: string | null;
  providerType: "filesystem" | "indexeddb";
  migrationProgress: { done: number; total: number } | null;
  error: StorageLocationError | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  selectFolder: () => Promise<boolean>;
  createFolder: (name: string) => Promise<boolean>;
  useDefault: () => Promise<void>;
  relinkFolder: () => Promise<boolean>;
  changeFolder: () => Promise<boolean>;
  clearError: () => void;

  isSetupSheetOpen: boolean;
  openSetupSheet: () => void;
  closeSetupSheet: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeError(
  code: StorageLocationErrorCode,
  message: string,
): StorageLocationError {
  return { code, message };
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

// Hold a reference to the current provider outside the store.
let currentProvider: StorageProvider | null = null;

function activateProvider(provider: StorageProvider): void {
  currentProvider = provider;
  setActiveProvider(provider);
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useStorageLocationStore = create<StorageLocationState>(
  (set, get) => ({
    status: "unconfigured",
    displayPath: null,
    providerType: "indexeddb",
    migrationProgress: null,
    error: null,
    initialized: false,
    isSetupSheetOpen: false,

    openSetupSheet: () => set({ isSetupSheetOpen: true }),
    closeSetupSheet: () => set({ isSetupSheetOpen: false }),

    initialize: async () => {
      if (get().initialized) {
        return;
      }

      const config = loadConfig();

      // No config → first time user, silently use IndexedDB.
      if (!config) {
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "unconfigured",
          providerType: "indexeddb",
          displayPath: null,
          initialized: true,
          error: null,
        });

        return;
      }

      // IndexedDB provider → just restore.
      if (config.providerType === "indexeddb") {
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "configured",
          providerType: "indexeddb",
          displayPath: config.displayPath,
          initialized: true,
          error: null,
        });

        return;
      }

      // Filesystem provider → attempt to reload handle.
      if (!supportsFileSystemAccess()) {
        // Browser changed or doesn't support it anymore.
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "unsupported",
          providerType: "indexeddb",
          displayPath: config.displayPath,
          initialized: true,
          error: makeError(
            "PERMISSION_DENIED",
            "File system access is not available in this browser/PWA. Continue with default browser storage.",
          ),
        });

        return;
      }

      const { handle, permissionGranted } = await loadDirectoryHandle();

      if (!handle || !permissionGranted) {
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "missing",
          providerType: "indexeddb",
          displayPath: config.displayPath,
          initialized: true,
          error: makeError(
            "PERMISSION_DENIED",
            "Permission to access your offline folder was revoked. Please relink your folder or start fresh.",
          ),
        });

        return;
      }

      // Re-validate marker.
      const fsProvider = new FileSystemAccessProvider(handle);
      const hasMarker = await fsProvider.hasMarker();

      if (!hasMarker) {
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "missing",
          providerType: "indexeddb",
          displayPath: config.displayPath,
          initialized: true,
          error: makeError(
            "INVALID_FOLDER",
            "The selected folder no longer contains valid Studytrix data. Please relink or start fresh.",
          ),
        });

        return;
      }

      activateProvider(fsProvider);

      // Check for interrupted migration.
      const oldProvider = new IndexedDBProvider();
      void resumeMigration(oldProvider, fsProvider).catch(() => {
        // Best effort resume — non-blocking.
      });

      set({
        status: "configured",
        providerType: "filesystem",
        displayPath: fsProvider.displayPath,
        initialized: true,
        error: null,
      });
    },

    selectFolder: async () => {
      if (!supportsFileSystemAccess()) {
        set({
          error: makeError(
            "PERMISSION_DENIED",
            "Custom folder selection is not supported in this browser.",
          ),
        });
        return false;
      }

      const handle = await pickDirectory();
      if (!handle) {
        set({
          error: makeError("PERMISSION_DENIED", "Folder selection was cancelled."),
        });
        return false;
      }

      const provider = new FileSystemAccessProvider(handle);
      await provider.createMarker();
      await persistDirectoryHandle(handle);

      const config: StorageLocationConfig = {
        providerType: "filesystem",
        displayPath: provider.displayPath,
      };
      saveConfig(config);
      activateProvider(provider);

      set({
        status: "configured",
        providerType: "filesystem",
        displayPath: provider.displayPath,
        error: null,
      });

      return true;
    },

    createFolder: async (name: string) => {
      if (!supportsFileSystemAccess()) {
        set({
          error: makeError(
            "PERMISSION_DENIED",
            "Custom folder creation is not supported in this browser.",
          ),
        });
        return false;
      }

      const sanitized = name.trim().replace(/[^a-zA-Z0-9_\-\s]/g, "");
      if (!sanitized) {
        set({
          error: makeError("INVALID_FOLDER", "Please enter a valid folder name."),
        });
        return false;
      }

      const handle = await pickAndCreateSubdirectory(sanitized);
      if (!handle) {
        set({
          error: makeError("PERMISSION_DENIED", "Folder creation was cancelled."),
        });
        return false;
      }

      const provider = new FileSystemAccessProvider(handle);
      await provider.createMarker();
      await persistDirectoryHandle(handle);

      const config: StorageLocationConfig = {
        providerType: "filesystem",
        displayPath: provider.displayPath,
      };
      saveConfig(config);
      activateProvider(provider);

      set({
        status: "configured",
        providerType: "filesystem",
        displayPath: provider.displayPath,
        error: null,
      });

      return true;
    },

    useDefault: async () => {
      const provider = new IndexedDBProvider();
      activateProvider(provider);

      const config: StorageLocationConfig = {
        providerType: "indexeddb",
        displayPath: "Browser Storage (Default)",
      };
      saveConfig(config);

      set({
        status: "configured",
        providerType: "indexeddb",
        displayPath: config.displayPath,
        error: null,
      });
    },

    relinkFolder: async () => {
      if (!supportsFileSystemAccess()) {
        set({
          error: makeError(
            "PERMISSION_DENIED",
            "Custom folder selection is not supported in this browser.",
          ),
        });
        return false;
      }

      const handle = await pickDirectory();
      if (!handle) {
        set({
          error: makeError("PERMISSION_DENIED", "Folder selection was cancelled."),
        });
        return false;
      }

      const provider = new FileSystemAccessProvider(handle);
      const hasMarker = await provider.hasMarker();

      if (!hasMarker) {
        set({
          error: makeError(
            "INVALID_FOLDER",
            "This folder doesn't contain Studytrix offline data. Please select the correct folder.",
          ),
        });
        return false;
      }

      await persistDirectoryHandle(handle);

      const config: StorageLocationConfig = {
        providerType: "filesystem",
        displayPath: provider.displayPath,
      };
      saveConfig(config);
      activateProvider(provider);

      set({
        status: "configured",
        providerType: "filesystem",
        displayPath: provider.displayPath,
        error: null,
      });

      return true;
    },

    changeFolder: async () => {
      if (!isOnline()) {
        set({
          error: makeError(
            "OFFLINE",
            "Cannot change storage folder while offline. Please connect to the internet and try again.",
          ),
        });
        return false;
      }

      if (!supportsFileSystemAccess()) {
        set({
          error: makeError(
            "PERMISSION_DENIED",
            "Custom folder selection is not supported in this browser.",
          ),
        });
        return false;
      }

      const handle = await pickDirectory();
      if (!handle) {
        set({
          error: makeError("PERMISSION_DENIED", "Folder selection was cancelled."),
        });
        return false;
      }

      const newProvider = new FileSystemAccessProvider(handle);
      const oldProvider = currentProvider;

      if (!oldProvider) {
        // No old provider — just set up the new one.
        await newProvider.createMarker();
        await persistDirectoryHandle(handle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: newProvider.displayPath,
        };
        saveConfig(config);
        activateProvider(newProvider);

        set({
          status: "configured",
          providerType: "filesystem",
          displayPath: newProvider.displayPath,
          error: null,
        });

        return true;
      }

      // Migrate files from old to new.
      set({
        status: "migrating",
        migrationProgress: { done: 0, total: 0 },
        error: null,
      });

      try {
        await migrateFiles(oldProvider, newProvider, (done, total) => {
          set({ migrationProgress: { done, total } });
        });

        await newProvider.createMarker();
        await persistDirectoryHandle(handle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: newProvider.displayPath,
        };
        saveConfig(config);
        activateProvider(newProvider);

        set({
          status: "configured",
          providerType: "filesystem",
          displayPath: newProvider.displayPath,
          migrationProgress: null,
          error: null,
        });

        return true;
      } catch {
        // Restore old provider.
        set({
          status: "configured",
          migrationProgress: null,
          error: makeError(
            "MIGRATION_FAILED",
            "Failed to migrate offline files to the new folder. Your files are safe in the original location.",
          ),
        });

        return false;
      }
    },

    clearError: () => {
      set({ error: null });
    },
  }),
);
