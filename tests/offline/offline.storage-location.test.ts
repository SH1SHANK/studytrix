import { jest } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock idb to avoid real IndexedDB in tests.
const openDBMock = jest.fn<any>();
jest.mock("idb", () => ({
  openDB: (...args: any[]) => openDBMock(...args),
}));

// Mock offline.db dynamic imports used by IndexedDBProvider.
const putFileMock = jest.fn<any>(async () => undefined);
const getFileMock = jest.fn<any>(async () => undefined);
const deleteFileMock = jest.fn<any>(async () => undefined);
const getAllFilesMock = jest.fn<any>(async () => []);

jest.mock("@/features/offline/offline.db", () => ({
  putFile: (...args: any[]) => putFileMock(...args),
  getFile: (...args: any[]) => getFileMock(...args),
  deleteFile: (...args: any[]) => deleteFileMock(...args),
  getAllFiles: (...args: any[]) => getAllFilesMock(...args),
  getActiveProvider: () => null,
}));

import {
  IndexedDBProvider,
  setActiveProvider,
  getActiveProvider,
  type StorageProvider,
  type MigrationManifest,
  migrateFiles,
  resumeMigration,
  supportsFileSystemAccess,
  saveConfig,
  loadConfig,
  clearConfig,
} from "@/features/offline/offline.storage-location";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

/** In-memory mock of StorageProvider for testing migration. */
class MockProvider implements StorageProvider {
  files = new Map<string, Blob>();

  async writeFile(name: string, blob: Blob): Promise<void> {
    this.files.set(name, blob);
  }

  async readFile(name: string): Promise<Blob | null> {
    return this.files.get(name) ?? null;
  }

  async deleteFile(name: string): Promise<void> {
    this.files.delete(name);
  }

  async listFiles(): Promise<string[]> {
    return Array.from(this.files.keys());
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("offline.storage-location", () => {
  beforeEach(() => {
    const localStorage = createLocalStorage();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage,
      matchMedia: () => ({ matches: false }),
    };

    putFileMock.mockClear();
    getFileMock.mockClear();
    deleteFileMock.mockClear();
    getAllFilesMock.mockClear();
    openDBMock.mockClear();

    setActiveProvider(null);
  });

  // ── Feature Detection ─────────────────────────────────────────────────

  describe("supportsFileSystemAccess", () => {
    it("should return false when showDirectoryPicker is not available", () => {
      expect(supportsFileSystemAccess()).toBe(false);
    });

    it("should return false in server environment", () => {
      const originalWindow = (globalThis as any).window;
      delete (globalThis as any).window;
      expect(supportsFileSystemAccess()).toBe(false);
      (globalThis as any).window = originalWindow;
    });
  });

  // ── Module Singleton ──────────────────────────────────────────────────

  describe("setActiveProvider / getActiveProvider", () => {
    it("should start with null active provider", () => {
      expect(getActiveProvider()).toBeNull();
    });

    it("should set and return the active provider", () => {
      const mock = new MockProvider();
      setActiveProvider(mock);
      expect(getActiveProvider()).toBe(mock);
    });

    it("should clear the active provider when set to null", () => {
      const mock = new MockProvider();
      setActiveProvider(mock);
      setActiveProvider(null);
      expect(getActiveProvider()).toBeNull();
    });
  });

  // ── Config Persistence ────────────────────────────────────────────────

  describe("saveConfig / loadConfig / clearConfig", () => {
    it("should persist and load config from localStorage", () => {
      saveConfig({ providerType: "filesystem", displayPath: "/test/folder" });
      const config = loadConfig();
      expect(config).toEqual({
        providerType: "filesystem",
        displayPath: "/test/folder",
      });
    });

    it("should return null when no config is saved", () => {
      expect(loadConfig()).toBeNull();
    });

    it("should clear config", () => {
      saveConfig({ providerType: "indexeddb", displayPath: "Default" });
      clearConfig();
      expect(loadConfig()).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      const windowRef = globalThis.window as unknown as {
        localStorage: ReturnType<typeof createLocalStorage>;
      };
      windowRef.localStorage.setItem(
        "studytrix.storage_location.config",
        "not-json",
      );
      expect(loadConfig()).toBeNull();
    });

    it("should return null for invalid providerType", () => {
      const windowRef = globalThis.window as unknown as {
        localStorage: ReturnType<typeof createLocalStorage>;
      };
      windowRef.localStorage.setItem(
        "studytrix.storage_location.config",
        JSON.stringify({ providerType: "invalid", displayPath: null }),
      );
      expect(loadConfig()).toBeNull();
    });
  });

  // ── IndexedDBProvider ─────────────────────────────────────────────────

  describe("IndexedDBProvider", () => {
    it("should delegate writeFile to offline.db putFile", async () => {
      const provider = new IndexedDBProvider();
      const blob = new Blob(["hello"], { type: "text/plain" });
      await provider.writeFile("test-file", blob);
      expect(putFileMock).toHaveBeenCalledTimes(1);
      const call = putFileMock.mock.calls[0][0] as any;
      expect(call.fileId).toBe("test-file");
      expect(call.size).toBe(blob.size);
    });

    it("should delegate readFile to offline.db getFile", async () => {
      const blob = new Blob(["hello"], { type: "text/plain" });
      getFileMock.mockResolvedValueOnce({ fileId: "test-file", blob });

      const provider = new IndexedDBProvider();
      const result = await provider.readFile("test-file");
      expect(result).toBe(blob);
    });

    it("should return null when file is not found", async () => {
      getFileMock.mockResolvedValueOnce(undefined);
      const provider = new IndexedDBProvider();
      const result = await provider.readFile("missing");
      expect(result).toBeNull();
    });

    it("should delegate deleteFile to offline.db deleteFile", async () => {
      const provider = new IndexedDBProvider();
      await provider.deleteFile("test-file");
      expect(deleteFileMock).toHaveBeenCalledWith("test-file");
    });

    it("should delegate listFiles to offline.db getAllFiles", async () => {
      getAllFilesMock.mockResolvedValueOnce([
        { fileId: "a" },
        { fileId: "b" },
      ]);
      const provider = new IndexedDBProvider();
      const files = await provider.listFiles();
      expect(files).toEqual(["a", "b"]);
    });
  });

  // ── Migration ─────────────────────────────────────────────────────────

  describe("migrateFiles", () => {
    it("should copy all files from source to destination then delete from source", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();

      source.files.set("file1", new Blob(["content1"]));
      source.files.set("file2", new Blob(["content2"]));

      const progress: Array<[number, number]> = [];
      await migrateFiles(source, dest, (done, total) => {
        progress.push([done, total]);
      });

      // Files should be in destination.
      expect(dest.files.has("file1")).toBe(true);
      expect(dest.files.has("file2")).toBe(true);

      // Files should be deleted from source.
      expect(source.files.has("file1")).toBe(false);
      expect(source.files.has("file2")).toBe(false);

      // Progress should have been tracked.
      expect(progress).toEqual([
        [1, 2],
        [2, 2],
      ]);

      // Manifest should be cleaned up.
      expect(dest.files.has("_migration_manifest.json")).toBe(false);
    });

    it("should handle empty source gracefully", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();

      const progress: Array<[number, number]> = [];
      await migrateFiles(source, dest, (done, total) => {
        progress.push([done, total]);
      });

      expect(progress).toEqual([[0, 0]]);
      expect(dest.files.size).toBe(0);
    });

    it("should write checkpoint manifest during migration", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();
      let manifestSeen = false;

      // Override dest.writeFile to detect manifest writes.
      const originalWrite = dest.writeFile.bind(dest);
      dest.writeFile = async (name: string, blob: Blob) => {
        if (name === "_migration_manifest.json") {
          manifestSeen = true;
        }
        return originalWrite(name, blob);
      };

      source.files.set("file1", new Blob(["a"]));
      await migrateFiles(source, dest);

      expect(manifestSeen).toBe(true);
    });
  });

  describe("resumeMigration", () => {
    it("should return false when no manifest exists", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();

      const result = await resumeMigration(source, dest);
      expect(result).toBe(false);
    });

    it("should resume migration from checkpoint", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();

      // Simulate interrupted migration: file2 was not copied yet.
      source.files.set("file1", new Blob(["content1"]));
      source.files.set("file2", new Blob(["content2"]));
      dest.files.set("file1", new Blob(["content1"]));

      const manifest: MigrationManifest = {
        files: ["file1", "file2"],
        completed: ["file1"],
        startedAt: Date.now(),
      };
      dest.files.set(
        "_migration_manifest.json",
        new Blob([JSON.stringify(manifest)]),
      );

      const progress: Array<[number, number]> = [];
      const result = await resumeMigration(source, dest, (done, total) => {
        progress.push([done, total]);
      });

      expect(result).toBe(true);
      expect(dest.files.has("file2")).toBe(true);
      expect(source.files.size).toBe(0);
      expect(dest.files.has("_migration_manifest.json")).toBe(false);
      expect(progress).toEqual([[2, 2]]);
    });

    it("should return false for invalid manifest JSON", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();

      dest.files.set(
        "_migration_manifest.json",
        new Blob(["not-valid-json"]),
      );

      const result = await resumeMigration(source, dest);
      expect(result).toBe(false);
    });

    it("should clean up invalid manifest", async () => {
      const source = new MockProvider();
      const dest = new MockProvider();

      dest.files.set(
        "_migration_manifest.json",
        new Blob([JSON.stringify({ files: "not-array" })]),
      );

      const result = await resumeMigration(source, dest);
      expect(result).toBe(false);
      // Invalid manifest should be cleaned up.
      expect(dest.files.has("_migration_manifest.json")).toBe(false);
    });
  });
});
