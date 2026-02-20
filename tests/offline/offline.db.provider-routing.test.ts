import { jest } from "@jest/globals";

const openDBMock = jest.fn<any>(async () => {
  throw new Error("IndexedDB unavailable in test");
});

const getActiveProviderMock = jest.fn<any>(() => null);

jest.mock("idb", () => ({
  openDB: (...args: any[]) => openDBMock(...args),
}));

jest.mock("@/features/offline/offline.storage-location", () => ({
  getActiveProvider: (...args: any[]) => getActiveProviderMock(...args),
}));

describe("offline.db provider routing", () => {
  beforeEach(() => {
    openDBMock.mockClear();
    getActiveProviderMock.mockReset();
  });

  it("does not delegate to provider write when active provider is indexeddb", async () => {
    const writeFile = jest.fn(async () => undefined);
    getActiveProviderMock.mockReturnValue({
      kind: "indexeddb",
      writeFile,
      readFile: jest.fn(async () => null),
      deleteFile: jest.fn(async () => undefined),
      listFiles: jest.fn(async () => []),
    });

    const offlineDb = await import("@/features/offline/offline.db");
    await offlineDb.putFile({
      fileId: "file-1",
      blob: new Blob(["hello"], { type: "text/plain" }),
      size: 5,
      mimeType: "text/plain",
      modifiedTime: null,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });

    expect(writeFile).not.toHaveBeenCalled();
  });

  it("delegates to provider write when active provider is filesystem", async () => {
    const writeFile = jest.fn(async () => undefined);
    getActiveProviderMock.mockReturnValue({
      kind: "filesystem",
      writeFile,
      readFile: jest.fn(async () => null),
      deleteFile: jest.fn(async () => undefined),
      listFiles: jest.fn(async () => []),
    });

    const offlineDb = await import("@/features/offline/offline.db");
    await offlineDb.putFile({
      fileId: "file-2",
      blob: new Blob(["hello"], { type: "text/plain" }),
      size: 5,
      mimeType: "text/plain",
      modifiedTime: null,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });

    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
