import { jest } from "@jest/globals";

import { openIndexedLocalFile } from "@/features/custom-folders/local-file.open";

const loadDirectoryHandleMock = jest.fn<any>();
const verifyHandlePermissionMock = jest.fn<any>();
const requestHandlePermissionMock = jest.fn<any>();

let foldersState: any[] = [];

jest.mock("@/features/custom-folders/local-handle.db", () => ({
  loadDirectoryHandle: (...args: any[]) => loadDirectoryHandleMock(...args),
  verifyHandlePermission: (...args: any[]) => verifyHandlePermissionMock(...args),
  requestHandlePermission: (...args: any[]) => requestHandlePermissionMock(...args),
}));

jest.mock("@/features/custom-folders/custom-folders.store", () => ({
  useCustomFoldersStore: {
    getState: () => ({
      folders: foldersState,
    }),
  },
}));

function createEmptyEntries() {
  return async function* entries() {
    yield* [];
  };
}

describe("local-file.open", () => {
  beforeEach(() => {
    foldersState = [
      {
        id: "local-folder-1",
        label: "Local Root",
        sourceKind: "local",
        localHandleKey: "local-key-1",
      },
    ];

    loadDirectoryHandleMock.mockReset();
    verifyHandlePermissionMock.mockReset();
    requestHandlePermissionMock.mockReset();

    (globalThis as any).window = {
      open: jest.fn(() => ({})),
      setTimeout,
    };

    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL: jest.fn(() => "blob:local-file"),
        revokeObjectURL: jest.fn(),
      },
      configurable: true,
      writable: true,
    });
  });

  it("opens a local indexed file from connected folder handles", async () => {
    const fileHandle = {
      getFile: jest.fn(async () => new Blob(["hello"], { type: "text/plain" })),
    };
    const nestedDirectoryHandle = {
      getDirectoryHandle: jest.fn(),
      getFileHandle: jest.fn(async (name: string) => {
        if (name !== "doc.txt") {
          throw new Error("Not found");
        }
        return fileHandle;
      }),
      entries: createEmptyEntries(),
    };
    const rootDirectoryHandle = {
      getDirectoryHandle: jest.fn(async (name: string) => {
        if (name !== "nested") {
          throw new Error("Not found");
        }
        return nestedDirectoryHandle;
      }),
      getFileHandle: jest.fn(),
      entries: createEmptyEntries(),
    };

    loadDirectoryHandleMock.mockResolvedValue(rootDirectoryHandle);
    verifyHandlePermissionMock.mockResolvedValue("granted");

    const result = await openIndexedLocalFile({
      customFolderId: "local-folder-1",
      fullPath: "Local Root > nested > doc.txt",
      fileName: "doc.txt",
    });

    expect(result.ok).toBe(true);
    expect((globalThis as any).window.open).toHaveBeenCalledWith(
      "blob:local-file",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("returns actionable permission error when permission is denied", async () => {
    const rootDirectoryHandle = {
      getDirectoryHandle: jest.fn(),
      getFileHandle: jest.fn(),
      entries: createEmptyEntries(),
    };

    loadDirectoryHandleMock.mockResolvedValue(rootDirectoryHandle);
    verifyHandlePermissionMock.mockResolvedValue("lost");
    requestHandlePermissionMock.mockResolvedValue(false);

    const result = await openIndexedLocalFile({
      customFolderId: "local-folder-1",
      fullPath: "Local Root > notes.txt",
      fileName: "notes.txt",
    });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; message: string }).message).toContain("permission");
  });

  it("returns a missing-file error when the local path no longer resolves", async () => {
    const rootDirectoryHandle = {
      getDirectoryHandle: jest.fn(),
      getFileHandle: jest.fn(async () => {
        throw new Error("Not found");
      }),
      entries: createEmptyEntries(),
    };

    loadDirectoryHandleMock.mockResolvedValue(rootDirectoryHandle);
    verifyHandlePermissionMock.mockResolvedValue("granted");

    const result = await openIndexedLocalFile({
      customFolderId: "local-folder-1",
      fullPath: "Local Root > missing.txt",
      fileName: "missing.txt",
    });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; message: string }).message).toContain("not found");
  });
});
