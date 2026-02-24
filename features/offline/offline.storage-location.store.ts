"use client";

import { create } from "zustand";

import {
  type StorageLocationConfig,
  type StorageHandleStatus,
  type StorageProvider,
  confirmStorageBudgetOrWarn,
  FileSystemAccessProvider,
  IndexedDBProvider,
  loadConfig,
  loadDirectoryHandle,
  persistDirectoryHandle,
  pickAndCreateSubdirectory,
  pickDirectory,
  saveConfig,
  setActiveProvider,
  supportsFileSystemAccess,
} from "./offline.storage-location";
import { replayPendingSync, syncIndexedDbFilesToActiveProvider } from "./offline.db";
import {
  collectOfflineStorageDiagnostics,
  type OfflineStorageDiagnostics,
} from "./offline.diagnostics";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StorageLocationStatus =
  | "unconfigured"
  | "configured"
  | "missing"
  | "unsupported";

export type StorageLocationErrorCode =
  | "PERMISSION_DENIED"
  | "INVALID_FOLDER"
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
  handleStatus: StorageHandleStatus;
  error: StorageLocationError | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  selectFolder: () => Promise<boolean>;
  createFolder: (name: string) => Promise<boolean>;
  useDefault: () => Promise<void>;
  relinkFolder: () => Promise<boolean>;
  changeFolder: () => Promise<boolean>;
  openStorageFolder: () => Promise<boolean>;
  runDiagnostics: () => Promise<{ report: OfflineStorageDiagnostics; copied: boolean } | null>;
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

function activateProvider(provider: StorageProvider): void {
  setActiveProvider(provider);
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useStorageLocationStore = create<StorageLocationState>(
  (set, get) => ({
    status: "unconfigured",
    displayPath: null,
    providerType: "indexeddb",
    handleStatus: "valid",
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
          handleStatus: "valid",
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
          handleStatus: config.handleStatus ?? "valid",
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
          handleStatus: "unsupported",
          displayPath: config.displayPath,
          initialized: true,
          error: makeError(
            "PERMISSION_DENIED",
            "File system access is not available in this browser/PWA. Continue with default browser storage.",
          ),
        });

        return;
      }

      const { handle, permissionGranted, handleStatus } = await loadDirectoryHandle();

      if (!handle || !permissionGranted) {
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "missing",
          providerType: "indexeddb",
          handleStatus,
          displayPath: config.displayPath,
          initialized: true,
          error: makeError(
            "PERMISSION_DENIED",
            handleStatus === "requires-gesture"
              ? "Storage access needs a user gesture to re-authorize. Tap relink to continue."
              : "Permission to access your offline folder was revoked. Please relink your folder or start fresh.",
          ),
        });

        return;
      }

      // Re-validate marker.
      const fsProvider = new FileSystemAccessProvider(handle);
      const accessOk = await fsProvider.testAccess();
      if (!accessOk) {
        const provider = new IndexedDBProvider();
        activateProvider(provider);

        set({
          status: "missing",
          providerType: "indexeddb",
          handleStatus: "lost",
          displayPath: config.displayPath,
          initialized: true,
          error: makeError(
            "PERMISSION_DENIED",
            "Stored offline folder handle is no longer writable. Please relink your folder.",
          ),
        });

        return;
      }
      const hasMarker = await fsProvider.hasMarker();

      if (!hasMarker) {
        const existingFiles = await fsProvider.listFiles().catch(() => []);
        if (existingFiles.length === 0) {
          const provider = new IndexedDBProvider();
          activateProvider(provider);

          set({
            status: "missing",
            providerType: "indexeddb",
            handleStatus: "lost",
            displayPath: config.displayPath,
            initialized: true,
            error: makeError(
              "INVALID_FOLDER",
              "The selected folder no longer contains valid Studytrix data. Please relink or start fresh.",
            ),
          });

          return;
        }

        try {
          await fsProvider.createMarker();
        } catch {
          const provider = new IndexedDBProvider();
          activateProvider(provider);

          set({
            status: "missing",
            providerType: "indexeddb",
            handleStatus: "lost",
            displayPath: config.displayPath,
            initialized: true,
            error: makeError(
              "PERMISSION_DENIED",
              "Stored offline folder exists but marker recovery failed. Please relink your folder.",
            ),
          });

          return;
        }
      }

      activateProvider(fsProvider);

      set({
        status: "configured",
        providerType: "filesystem",
        handleStatus: "valid",
        displayPath: fsProvider.displayPath,
        initialized: true,
        error: null,
      });
      void replayPendingSync().catch(() => undefined);
      void syncIndexedDbFilesToActiveProvider().catch(() => undefined);
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
      const hasBudget = await confirmStorageBudgetOrWarn();
      if (!hasBudget) {
        set({
          error: makeError("QUOTA_EXCEEDED", "Not enough free storage to safely enable offline folder."),
        });
        return false;
      }

      try {
        const provider = new FileSystemAccessProvider(handle);
        await provider.createMarker();
        await persistDirectoryHandle(handle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: provider.displayPath,
          handleStatus: "valid",
        };
        saveConfig(config);
        activateProvider(provider);

        set({
          status: "configured",
          providerType: "filesystem",
          handleStatus: "valid",
          displayPath: provider.displayPath,
          error: null,
        });
        void replayPendingSync().catch(() => undefined);
        void syncIndexedDbFilesToActiveProvider().catch(() => undefined);

        return true;
      } catch {
        set({
          error: makeError("PERMISSION_DENIED", "Could not initialize the selected storage folder."),
        });
        return false;
      }
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
      const hasBudget = await confirmStorageBudgetOrWarn();
      if (!hasBudget) {
        set({
          error: makeError("QUOTA_EXCEEDED", "Not enough free storage to safely enable offline folder."),
        });
        return false;
      }

      try {
        const provider = new FileSystemAccessProvider(handle);
        await provider.createMarker();
        await persistDirectoryHandle(handle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: provider.displayPath,
          handleStatus: "valid",
        };
        saveConfig(config);
        activateProvider(provider);

        set({
          status: "configured",
          providerType: "filesystem",
          handleStatus: "valid",
          displayPath: provider.displayPath,
          error: null,
        });
        void replayPendingSync().catch(() => undefined);
        void syncIndexedDbFilesToActiveProvider().catch(() => undefined);

        return true;
      } catch {
        set({
          error: makeError("PERMISSION_DENIED", "Could not create or access the selected storage folder."),
        });
        return false;
      }
    },

    useDefault: async () => {
      const provider = new IndexedDBProvider();
      activateProvider(provider);

      const config: StorageLocationConfig = {
        providerType: "indexeddb",
        displayPath: "Browser Storage (Default)",
        handleStatus: "valid",
      };
      saveConfig(config);

      set({
        status: "configured",
        providerType: "indexeddb",
        handleStatus: "valid",
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
      const hasBudget = await confirmStorageBudgetOrWarn();
      if (!hasBudget) {
        set({
          error: makeError("QUOTA_EXCEEDED", "Not enough free storage to safely relink this folder."),
        });
        return false;
      }

      const provider = new FileSystemAccessProvider(handle);
      const hasMarker = await provider.hasMarker();

      if (!hasMarker) {
        try {
          await provider.createMarker();
        } catch {
          set({
            error: makeError(
              "INVALID_FOLDER",
              "Could not initialize this folder for offline storage.",
            ),
          });
          return false;
        }
      }

      try {
        await persistDirectoryHandle(handle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: provider.displayPath,
          handleStatus: "valid",
        };
        saveConfig(config);
        activateProvider(provider);

        set({
          status: "configured",
          providerType: "filesystem",
          handleStatus: "valid",
          displayPath: provider.displayPath,
          error: null,
        });
        void replayPendingSync().catch(() => undefined);
        void syncIndexedDbFilesToActiveProvider().catch(() => undefined);

        return true;
      } catch {
        set({
          error: makeError("PERMISSION_DENIED", "Could not relink the selected storage folder."),
        });
        return false;
      }
    },

    changeFolder: async () => {
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
      const hasBudget = await confirmStorageBudgetOrWarn();
      if (!hasBudget) {
        set({
          error: makeError("QUOTA_EXCEEDED", "Not enough free storage to safely migrate to this folder."),
        });
        return false;
      }

      try {
        const newProvider = new FileSystemAccessProvider(handle);
        await newProvider.createMarker();
        await persistDirectoryHandle(handle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: newProvider.displayPath,
          handleStatus: "valid",
        };
        saveConfig(config);
        activateProvider(newProvider);

        set({
          status: "configured",
          providerType: "filesystem",
          handleStatus: "valid",
          displayPath: newProvider.displayPath,
          error: null,
        });
        void replayPendingSync().catch(() => undefined);
        void syncIndexedDbFilesToActiveProvider().catch(() => undefined);

        return true;
      } catch {
        set({
          error: makeError("PERMISSION_DENIED", "Could not switch to the selected storage folder."),
        });
        return false;
      }
    },

    openStorageFolder: async () => {
      if (!supportsFileSystemAccess()) {
        set({
          error: makeError("PERMISSION_DENIED", "Opening storage folder is not supported in this browser."),
        });
        return false;
      }

      if (get().providerType !== "filesystem") {
        set({
          error: makeError("INVALID_FOLDER", "Storage folder is only available when using custom folder mode."),
        });
        return false;
      }

      const restored = await loadDirectoryHandle({ requestOnPrompt: true });
      const startIn = restored.handle ?? undefined;
      const selectedHandle = await pickDirectory({ startIn });
      if (!selectedHandle) {
        return false;
      }

      try {
        const provider = new FileSystemAccessProvider(selectedHandle);
        const hasMarker = await provider.hasMarker();
        if (!hasMarker) {
          await provider.createMarker();
        }
        await persistDirectoryHandle(selectedHandle);

        const config: StorageLocationConfig = {
          providerType: "filesystem",
          displayPath: provider.displayPath,
          handleStatus: "valid",
        };
        saveConfig(config);
        activateProvider(provider);

        set({
          status: "configured",
          providerType: "filesystem",
          handleStatus: "valid",
          displayPath: provider.displayPath,
          error: null,
        });
        void replayPendingSync().catch(() => undefined);
        void syncIndexedDbFilesToActiveProvider().catch(() => undefined);

        return true;
      } catch {
        set({
          error: makeError("PERMISSION_DENIED", "Could not open or access the selected storage folder."),
        });
        return false;
      }
    },

    runDiagnostics: async () => {
      const report = await collectOfflineStorageDiagnostics({
        status: get().status,
        providerType: get().providerType,
        handleStatus: get().handleStatus,
        displayPath: get().displayPath,
      });
      const copied = await copyToClipboard(JSON.stringify(report, null, 2));
      return { report, copied };
    },

    clearError: () => {
      set({ error: null });
    },
  }),
);
