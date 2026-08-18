import { getDatabase, destroyDatabase } from "@/db/database";
import { runLegacyMigration } from "@/db/migrations/legacy";
import { workspaceRepository } from "@/db/repositories/workspace.repository";

describe("Legacy Migration Runner", () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeAll(() => {
    // Setup window and localStorage mocks for Node environment
    (globalThis as unknown as { window: unknown }).window = globalThis;
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          for (const k of Object.keys(mockLocalStorage)) {
            delete mockLocalStorage[k];
          }
        },
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(async () => {
    localStorage.clear();
    await getDatabase(true);
  });

  afterEach(async () => {
    localStorage.clear();
    await destroyDatabase();
  });

  it("should migrate workspaces from legacy localStorage and set migration flag", async () => {
    const legacyPayload = {
      state: {
        workspaces: [
          {
            id: "ws_legacy_1",
            driveFolderId: "folder_legacy_1",
            name: "CS101 Intro to CS",
            description: "Freshman course notes",
            category: "Semester 1",
            color: "blue",
            pinned: true,
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
        ],
      },
    };

    localStorage.setItem("studytrix_workspaces_v1", JSON.stringify(legacyPayload));

    await runLegacyMigration();

    const workspaces = await workspaceRepository.getAll();
    expect(workspaces.length).toBe(1);
    expect(workspaces[0].id).toBe("ws_legacy_1");
    expect(workspaces[0].name).toBe("CS101 Intro to CS");
    expect(workspaces[0].pinned).toBe(true);

    const marker = localStorage.getItem("studytrix.rxdb_migrated");
    expect(marker).not.toBeNull();
    expect(JSON.parse(marker!).version).toBe(1);

    // Subsequent run: ensure no duplicates or crashes
    await runLegacyMigration();
    const workspacesAfterSecondRun = await workspaceRepository.getAll();
    expect(workspacesAfterSecondRun.length).toBe(1);
  });

  it("should fail closed and not throw when legacy localStorage contains malformed JSON", async () => {
    localStorage.setItem("studytrix_workspaces_v1", "INVALID_JSON_{{[}");

    await expect(runLegacyMigration()).resolves.not.toThrow();

    const marker = localStorage.getItem("studytrix.rxdb_migrated");
    expect(marker).not.toBeNull();
  });

  it("should handle partial legacy records with missing optional fields cleanly", async () => {
    const legacyPayload = {
      state: {
        workspaces: [
          {
            id: "ws_partial",
            driveFolderId: "folder_partial",
            name: "Partial Workspace",
            // missing description, category, color, pinned
          },
        ],
      },
    };

    localStorage.setItem("studytrix_workspaces_v1", JSON.stringify(legacyPayload));

    await runLegacyMigration();

    const ws = await workspaceRepository.getById("ws_partial");
    expect(ws).not.toBeNull();
    expect(ws?.name).toBe("Partial Workspace");
    expect(ws?.pinned).toBe(false);
  });
});
