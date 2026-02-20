import { jest, afterEach } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const loadConfigMock = jest.fn<any>(() => null);
const saveConfigMock = jest.fn<any>();
const clearConfigMock = jest.fn<any>();
const loadDirectoryHandleMock = jest.fn<any>(async () => ({
  handle: null,
  permissionGranted: false,
}));
const persistDirectoryHandleMock = jest.fn<any>(async () => undefined);
const clearPersistedHandleMock = jest.fn<any>(async () => undefined);
const pickDirectoryMock = jest.fn<any>(async () => null);
const pickAndCreateSubdirectoryMock = jest.fn<any>(async () => null);
const supportsFileSystemAccessMock = jest.fn<any>(() => false);
const migrateFilesMock = jest.fn<any>(async () => undefined);
const resumeMigrationMock = jest.fn<any>(async () => false);
const setActiveProviderMock = jest.fn<any>();

jest.mock("@/features/offline/offline.storage-location", () => ({
  loadConfig: (...args: any[]) => loadConfigMock(...args),
  saveConfig: (...args: any[]) => saveConfigMock(...args),
  clearConfig: (...args: any[]) => clearConfigMock(...args),
  loadDirectoryHandle: (...args: any[]) => loadDirectoryHandleMock(...args),
  persistDirectoryHandle: (...args: any[]) =>
    persistDirectoryHandleMock(...args),
  clearPersistedHandle: (...args: any[]) => clearPersistedHandleMock(...args),
  pickDirectory: (...args: any[]) => pickDirectoryMock(...args),
  pickAndCreateSubdirectory: (...args: any[]) =>
    pickAndCreateSubdirectoryMock(...args),
  supportsFileSystemAccess: (...args: any[]) =>
    supportsFileSystemAccessMock(...args),
  migrateFiles: (...args: any[]) => migrateFilesMock(...args),
  resumeMigration: (...args: any[]) => resumeMigrationMock(...args),
  setActiveProvider: (...args: any[]) => setActiveProviderMock(...args),
  FileSystemAccessProvider: class {
    displayPath = "MockFolder";
    async hasMarker() {
      return true;
    }
    async createMarker() {}
    async writeFile() {}
    async readFile() {
      return null;
    }
    async deleteFile() {}
    async listFiles() {
      return [];
    }
  },
  IndexedDBProvider: class {
    async writeFile() {}
    async readFile() {
      return null;
    }
    async deleteFile() {}
    async listFiles() {
      return [];
    }
  },
}));

import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  useStorageLocationStore.setState({
    status: "unconfigured",
    displayPath: null,
    providerType: "indexeddb",
    migrationProgress: null,
    error: null,
    initialized: false,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("offline.storage-location.store", () => {
  beforeEach(() => {
    resetStore();
    loadConfigMock.mockReturnValue(null);
    supportsFileSystemAccessMock.mockReturnValue(false);
    setActiveProviderMock.mockClear();
    saveConfigMock.mockClear();
    migrateFilesMock.mockClear();
    resumeMigrationMock.mockClear();
    pickDirectoryMock.mockResolvedValue(null);
    pickAndCreateSubdirectoryMock.mockResolvedValue(null);

    // Ensure navigator.onLine exists.
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    resetStore();
  });

  // ── initialize ────────────────────────────────────────────────────────

  describe("initialize", () => {
    it("should set unconfigured status on first launch with no config", async () => {
      loadConfigMock.mockReturnValue(null);

      await useStorageLocationStore.getState().initialize();
      const state = useStorageLocationStore.getState();

      expect(state.status).toBe("unconfigured");
      expect(state.initialized).toBe(true);
      expect(state.providerType).toBe("indexeddb");
      expect(setActiveProviderMock).toHaveBeenCalledTimes(1);
    });

    it("should set configured status when indexeddb config exists", async () => {
      loadConfigMock.mockReturnValue({
        providerType: "indexeddb",
        displayPath: "Browser Storage (Default)",
      });

      await useStorageLocationStore.getState().initialize();
      const state = useStorageLocationStore.getState();

      expect(state.status).toBe("configured");
      expect(state.displayPath).toBe("Browser Storage (Default)");
      expect(state.providerType).toBe("indexeddb");
    });

    it("should set missing status when filesystem config exists but API unsupported", async () => {
      loadConfigMock.mockReturnValue({
        providerType: "filesystem",
        displayPath: "MyFolder",
      });
      supportsFileSystemAccessMock.mockReturnValue(false);

      await useStorageLocationStore.getState().initialize();
      const state = useStorageLocationStore.getState();

      expect(state.status).toBe("missing");
      expect(state.error).not.toBeNull();
      expect(state.error!.code).toBe("PERMISSION_DENIED");
    });

    it("should set missing status when handle cannot be reloaded", async () => {
      loadConfigMock.mockReturnValue({
        providerType: "filesystem",
        displayPath: "MyFolder",
      });
      supportsFileSystemAccessMock.mockReturnValue(true);
      loadDirectoryHandleMock.mockResolvedValue({
        handle: null,
        permissionGranted: false,
      });

      await useStorageLocationStore.getState().initialize();
      const state = useStorageLocationStore.getState();

      expect(state.status).toBe("missing");
      expect(state.error!.code).toBe("PERMISSION_DENIED");
    });

    it("should not re-initialize if already initialized", async () => {
      loadConfigMock.mockReturnValue(null);
      await useStorageLocationStore.getState().initialize();

      loadConfigMock.mockReturnValue({
        providerType: "indexeddb",
        displayPath: "Changed",
      });
      await useStorageLocationStore.getState().initialize();

      // Should still have first init values.
      const state = useStorageLocationStore.getState();
      expect(state.status).toBe("unconfigured");
    });
  });

  // ── useDefault ────────────────────────────────────────────────────────

  describe("useDefault", () => {
    it("should transition to configured with indexeddb provider", async () => {
      await useStorageLocationStore.getState().useDefault();
      const state = useStorageLocationStore.getState();

      expect(state.status).toBe("configured");
      expect(state.providerType).toBe("indexeddb");
      expect(state.displayPath).toBe("Browser Storage (Default)");
      expect(saveConfigMock).toHaveBeenCalledTimes(1);
      expect(setActiveProviderMock).toHaveBeenCalled();
    });
  });

  // ── selectFolder ──────────────────────────────────────────────────────

  describe("selectFolder", () => {
    it("should return false and set error when API not supported", async () => {
      supportsFileSystemAccessMock.mockReturnValue(false);

      const result = await useStorageLocationStore.getState().selectFolder();
      const state = useStorageLocationStore.getState();

      expect(result).toBe(false);
      expect(state.error).not.toBeNull();
      expect(state.error!.code).toBe("PERMISSION_DENIED");
    });

    it("should return false when picker is cancelled", async () => {
      supportsFileSystemAccessMock.mockReturnValue(true);
      pickDirectoryMock.mockResolvedValue(null);

      const result = await useStorageLocationStore.getState().selectFolder();

      expect(result).toBe(false);
    });
  });

  // ── createFolder ──────────────────────────────────────────────────────

  describe("createFolder", () => {
    it("should return false for empty name", async () => {
      supportsFileSystemAccessMock.mockReturnValue(true);

      const result = await useStorageLocationStore.getState().createFolder("   ");
      const state = useStorageLocationStore.getState();

      expect(result).toBe(false);
      expect(state.error!.code).toBe("INVALID_FOLDER");
    });

    it("should return false when API not supported", async () => {
      supportsFileSystemAccessMock.mockReturnValue(false);

      const result = await useStorageLocationStore
        .getState()
        .createFolder("Test");

      expect(result).toBe(false);
      expect(useStorageLocationStore.getState().error!.code).toBe(
        "PERMISSION_DENIED",
      );
    });
  });

  // ── changeFolder ──────────────────────────────────────────────────────

  describe("changeFolder", () => {
    it("should reject when offline", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const result = await useStorageLocationStore.getState().changeFolder();
      const state = useStorageLocationStore.getState();

      expect(result).toBe(false);
      expect(state.error!.code).toBe("OFFLINE");
      expect(state.error!.message).toContain("offline");
    });

    it("should return false when API not supported", async () => {
      supportsFileSystemAccessMock.mockReturnValue(false);

      const result = await useStorageLocationStore.getState().changeFolder();

      expect(result).toBe(false);
      expect(useStorageLocationStore.getState().error!.code).toBe(
        "PERMISSION_DENIED",
      );
    });
  });

  // ── relinkFolder ──────────────────────────────────────────────────────

  describe("relinkFolder", () => {
    it("should return false when API not supported", async () => {
      supportsFileSystemAccessMock.mockReturnValue(false);

      const result = await useStorageLocationStore.getState().relinkFolder();

      expect(result).toBe(false);
      expect(useStorageLocationStore.getState().error!.code).toBe(
        "PERMISSION_DENIED",
      );
    });

    it("should return false when picker is cancelled", async () => {
      supportsFileSystemAccessMock.mockReturnValue(true);
      pickDirectoryMock.mockResolvedValue(null);

      const result = await useStorageLocationStore.getState().relinkFolder();

      expect(result).toBe(false);
    });
  });

  // ── clearError ────────────────────────────────────────────────────────

  describe("clearError", () => {
    it("should clear the error state", () => {
      useStorageLocationStore.setState({
        error: { code: "OFFLINE", message: "test" },
      });

      useStorageLocationStore.getState().clearError();

      expect(useStorageLocationStore.getState().error).toBeNull();
    });
  });
});
