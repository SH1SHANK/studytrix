import { jest } from "@jest/globals";

import { getBlob, has, openLocalFirst, revoke } from "@/features/offline/offline.access";

const getFileMock = jest.fn();
const updateLastAccessMock = jest.fn(async () => undefined);

jest.mock("@/features/offline/offline.db", () => ({
  getFile: (...args: unknown[]) => getFileMock(...args),
  updateLastAccess: (...args: unknown[]) => updateLastAccessMock(...args),
}));

describe("offline.access", () => {
  beforeEach(() => {
    getFileMock.mockReset();
    updateLastAccessMock.mockClear();

    const open = jest.fn(() => ({}));

    (globalThis as unknown as { window: unknown }).window = {
      open,
      setTimeout,
    };

    const createObjectURL = jest.fn(() => "blob:mock-local");
    const revokeObjectURL = jest.fn();

    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL,
        revokeObjectURL,
      },
      configurable: true,
      writable: true,
    });
  });

  it("reports offline availability", async () => {
    getFileMock.mockResolvedValueOnce({ fileId: "f1" });
    getFileMock.mockResolvedValueOnce(undefined);

    await expect(has("f1")).resolves.toBe(true);
    await expect(has("f2")).resolves.toBe(false);
  });

  it("returns blob and touches last access when cached", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    getFileMock.mockResolvedValueOnce({ fileId: "f1", blob });

    const result = await getBlob("f1");

    expect(result).toBe(blob);
    expect(updateLastAccessMock).toHaveBeenCalledWith("f1");
  });

  it("opens cached blob before fallback url", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    getFileMock.mockResolvedValueOnce({ fileId: "f1", blob });

    const opened = await openLocalFirst("f1", "/fallback");

    const windowRef = globalThis.window as unknown as { open: jest.Mock };
    expect(opened).toBe(true);
    expect(windowRef.open).toHaveBeenCalledWith("blob:mock-local", "_blank", "noopener,noreferrer");

    revoke("f1");
    const urlRef = globalThis.URL as unknown as { revokeObjectURL: jest.Mock };
    expect(urlRef.revokeObjectURL).toHaveBeenCalledWith("blob:mock-local");
  });

  it("falls back to network url when cache miss", async () => {
    getFileMock.mockResolvedValueOnce(undefined);

    const opened = await openLocalFirst("f1", "/api/file/f1/stream");

    const windowRef = globalThis.window as unknown as { open: jest.Mock };
    expect(opened).toBe(true);
    expect(windowRef.open).toHaveBeenCalledWith("/api/file/f1/stream", "_blank", "noopener,noreferrer");
  });
});
