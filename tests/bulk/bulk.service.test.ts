import { jest } from "@jest/globals";

import type { DriveItem } from "@/features/drive/drive.types";

import {
  resolveSelectedItems,
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
