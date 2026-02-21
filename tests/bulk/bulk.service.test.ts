import { jest } from "@jest/globals";

import type { DriveItem } from "@/features/drive/drive.types";

import {
  expandFolders,
  resolveSelectedItems,
  resolveAllFiles,
  computeTotalSize,
  isLargeFile,
  hasLargeFiles,
} from "@/features/bulk/bulk.service";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeFile(overrides: Partial<DriveItem> = {}): DriveItem {
  return {
    id: overrides.id ?? "file-1",
    name: overrides.name ?? "test.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    size: "size" in overrides ? overrides.size! : 1024,
    modifiedTime: overrides.modifiedTime ?? null,
    isFolder: overrides.isFolder ?? false,
    webViewLink: overrides.webViewLink ?? null,
    iconLink: overrides.iconLink ?? null,
  };
}

function makeFolder(overrides: Partial<DriveItem> = {}): DriveItem {
  return {
    id: overrides.id ?? "folder-1",
    name: overrides.name ?? "My Folder",
    mimeType: overrides.mimeType ?? "application/vnd.google-apps.folder",
    size: null,
    modifiedTime: overrides.modifiedTime ?? null,
    isFolder: true,
    webViewLink: overrides.webViewLink ?? null,
    iconLink: overrides.iconLink ?? null,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("bulk.service", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    }
    jest.restoreAllMocks();
  });

  // ── resolveSelectedItems ──────────────────────────────────────────────

  describe("resolveSelectedItems", () => {
    it("should separate files from folders", () => {
      const items = [
        makeFile({ id: "f1" }),
        makeFolder({ id: "d1" }),
        makeFile({ id: "f2" }),
        makeFolder({ id: "d2" }),
      ];

      const selected = new Set(["f1", "d1", "f2", "d2"]);
      const result = resolveSelectedItems(selected, items);

      expect(result.files).toHaveLength(2);
      expect(result.files.map((f) => f.id)).toEqual(["f1", "f2"]);
      expect(result.folderIds).toEqual(["d1", "d2"]);
    });

    it("should ignore IDs not in allItems", () => {
      const items = [makeFile({ id: "f1" })];
      const selected = new Set(["f1", "unknown-id"]);
      const result = resolveSelectedItems(selected, items);

      expect(result.files).toHaveLength(1);
      expect(result.folderIds).toHaveLength(0);
    });

    it("should return empty arrays for empty selection", () => {
      const items = [makeFile({ id: "f1" })];
      const result = resolveSelectedItems(new Set(), items);

      expect(result.files).toHaveLength(0);
      expect(result.folderIds).toHaveLength(0);
    });

    it("should handle all folders", () => {
      const items = [makeFolder({ id: "d1" }), makeFolder({ id: "d2" })];
      const selected = new Set(["d1", "d2"]);
      const result = resolveSelectedItems(selected, items);

      expect(result.files).toHaveLength(0);
      expect(result.folderIds).toEqual(["d1", "d2"]);
    });

    it("should handle all files", () => {
      const items = [makeFile({ id: "f1" }), makeFile({ id: "f2" })];
      const selected = new Set(["f1", "f2"]);
      const result = resolveSelectedItems(selected, items);

      expect(result.files).toHaveLength(2);
      expect(result.folderIds).toHaveLength(0);
    });
  });

  describe("resolveAllFiles", () => {
    it("expands selected folders and deduplicates direct files", async () => {
      const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/drive/nested-index")) {
          return {
            ok: true,
            json: async () => ({
              files: [
                {
                  id: "f1",
                  name: "duplicate.pdf",
                  mimeType: "application/pdf",
                  size: 1500,
                  modifiedTime: null,
                  webViewLink: null,
                  path: "Root",
                },
                {
                  id: "f2",
                  name: "nested.pdf",
                  mimeType: "application/pdf",
                  size: 2000,
                  modifiedTime: null,
                  webViewLink: null,
                  path: "Root / Unit 1",
                },
              ],
            }),
          } as Response;
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      });

      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const folder = makeFolder({ id: "d1", name: "Root" });
      const directFile = makeFile({ id: "f1", name: "duplicate.pdf", size: 1000 });
      const selected = new Set(["d1", "f1"]);

      const progress: Array<[number, number]> = [];
      const resolved = await resolveAllFiles(selected, [folder, directFile], (done, total) => {
        progress.push([done, total]);
      });

      expect(resolved.files.map((file) => file.id).sort()).toEqual(["f1", "f2"]);
      expect(resolved.totalSize).toBe(3500);
      expect(progress.length).toBeGreaterThan(0);
      expect(progress[progress.length - 1]).toEqual([2, 2]);
    });
  });

  describe("expandFolders", () => {
    it("falls back to paged folder traversal when nested-index fails", async () => {
      const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/drive/nested-index")) {
          return {
            ok: false,
            json: async () => ({}),
          } as Response;
        }

        if (url.includes("/api/drive/d1?pageToken=next")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "f2",
                  name: "root-2.pdf",
                  mimeType: "application/pdf",
                  size: 1200,
                  modifiedTime: null,
                  isFolder: false,
                  webViewLink: null,
                  iconLink: null,
                },
              ],
            }),
          } as Response;
        }

        if (url.includes("/api/drive/d1")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "f1",
                  name: "root-1.pdf",
                  mimeType: "application/pdf",
                  size: 1000,
                  modifiedTime: null,
                  isFolder: false,
                  webViewLink: null,
                  iconLink: null,
                },
                {
                  id: "sub",
                  name: "Unit 1",
                  mimeType: "application/vnd.google-apps.folder",
                  size: null,
                  modifiedTime: null,
                  isFolder: true,
                  webViewLink: null,
                  iconLink: null,
                },
              ],
              nextPageToken: "next",
            }),
          } as Response;
        }

        if (url.includes("/api/drive/sub")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "f3",
                  name: "sub-1.pdf",
                  mimeType: "application/pdf",
                  size: 1800,
                  modifiedTime: null,
                  isFolder: false,
                  webViewLink: null,
                  iconLink: null,
                },
              ],
            }),
          } as Response;
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      });

      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const progress: Array<[number, number]> = [];
      const files = await expandFolders([{ id: "d1", name: "Root" }], {
        onProgress: (done, total) => progress.push([done, total]),
      });

      expect(files).toHaveLength(3);
      expect(files.find((file) => file.id === "f1")?.zipPath).toBe("Root");
      expect(files.find((file) => file.id === "f3")?.zipPath).toBe("Root / Unit 1");
      expect(progress[progress.length - 1]).toEqual([1, 1]);
    });
  });

  // ── computeTotalSize ──────────────────────────────────────────────────

  describe("computeTotalSize", () => {
    it("should sum file sizes", () => {
      const files = [
        makeFile({ size: 1000 }),
        makeFile({ size: 2000 }),
        makeFile({ size: 3000 }),
      ];

      expect(computeTotalSize(files)).toBe(6000);
    });

    it("should handle null sizes as 0", () => {
      const files = [makeFile({ size: 1000 }), makeFile({ size: null })];
      expect(computeTotalSize(files)).toBe(1000);
    });

    it("should return 0 for empty array", () => {
      expect(computeTotalSize([])).toBe(0);
    });
  });

  // ── isLargeFile ───────────────────────────────────────────────────────

  describe("isLargeFile", () => {
    it("should return true for files over 25 MB", () => {
      const file = makeFile({ size: 30 * 1024 * 1024 });
      expect(isLargeFile(file)).toBe(true);
    });

    it("should return false for files under 25 MB", () => {
      const file = makeFile({ size: 20 * 1024 * 1024 });
      expect(isLargeFile(file)).toBe(false);
    });

    it("should return false for files exactly at threshold", () => {
      const file = makeFile({ size: 25 * 1024 * 1024 });
      expect(isLargeFile(file)).toBe(false);
    });

    it("should use custom threshold when provided", () => {
      const file = makeFile({ size: 15 * 1024 * 1024 });
      expect(isLargeFile(file, 10 * 1024 * 1024)).toBe(true);
    });

    it("should treat null size as 0", () => {
      const file = makeFile({ size: null });
      expect(isLargeFile(file)).toBe(false);
    });
  });

  // ── hasLargeFiles ─────────────────────────────────────────────────────

  describe("hasLargeFiles", () => {
    it("should return true if any file is large", () => {
      const files = [
        makeFile({ size: 1024 }),
        makeFile({ size: 30 * 1024 * 1024 }),
      ];
      expect(hasLargeFiles(files)).toBe(true);
    });

    it("should return false if no file is large", () => {
      const files = [
        makeFile({ size: 1024 }),
        makeFile({ size: 10 * 1024 * 1024 }),
      ];
      expect(hasLargeFiles(files)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasLargeFiles([])).toBe(false);
    });

    it("should use custom threshold", () => {
      const files = [makeFile({ size: 5 * 1024 * 1024 })];
      expect(hasLargeFiles(files, 1 * 1024 * 1024)).toBe(true);
    });
  });
});
