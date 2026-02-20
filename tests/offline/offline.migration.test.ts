import { jest } from "@jest/globals";

import { runOfflineV2Migration } from "@/features/offline/offline.migration";

const deleteDBMock = jest.fn<any>();

jest.mock("idb", () => ({
  deleteDB: (...args: any[]) => deleteDBMock(...args),
}));

function createLocalStorage() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("runOfflineV2Migration", () => {
  beforeEach(() => {
    const localStorage = createLocalStorage();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage,
      matchMedia: () => ({ matches: false }),
    };
    deleteDBMock.mockClear();
  });

  it("resets offline DB and download store once", async () => {
    const windowRef = globalThis.window as unknown as {
      localStorage: ReturnType<typeof createLocalStorage>;
    };

    windowRef.localStorage.setItem("studytrix-download-store-v1", "seed");

    const first = await runOfflineV2Migration();
    const second = await runOfflineV2Migration();

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(deleteDBMock).toHaveBeenCalledTimes(1);
    expect(deleteDBMock).toHaveBeenCalledWith("studytrix_offline");
    expect(windowRef.localStorage.getItem("studytrix-download-store-v1")).toBeNull();
    expect(windowRef.localStorage.getItem("studytrix.offline_v2.migrated.v1")).toBe("1");
  });

  it("skips migration when feature flag is disabled", async () => {
    const windowRef = globalThis.window as unknown as {
      localStorage: ReturnType<typeof createLocalStorage>;
    };

    windowRef.localStorage.setItem("studytrix.offline_v2_enabled", "0");

    const result = await runOfflineV2Migration();

    expect(result).toBe(false);
    expect(deleteDBMock).not.toHaveBeenCalled();
  });
});
