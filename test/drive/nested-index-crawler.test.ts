import { POST } from "@/app/api/drive/nested-index/route";
import type { DriveFolderContents } from "@/features/drive/drive.types";
import { NextRequest } from "next/server";

const mockListFolder = jest.fn();

jest.mock("@/features/drive/drive.service", () => ({
  DriveService: jest.fn().mockImplementation(() => ({
    listFolder: mockListFolder,
  })),
  DriveServiceError: class DriveServiceError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "DriveServiceError";
      this.statusCode = statusCode;
    }
  },
}));

jest.mock("@/features/drive/drive.cache", () => ({
  getCachedFolder: jest.fn(async () => null),
  setCachedFolder: jest.fn(async () => {}),
  withFolderRequestDedup: jest.fn(async (_id, _token, fn: () => Promise<unknown>) => await fn()),
}));

describe("POST /api/drive/nested-index Adversarial Crawler Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createPostRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/drive/nested-index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("should handle zero initial children / empty root folder cleanly", async () => {
    mockListFolder.mockResolvedValueOnce({
      folder: { id: "root_empty", name: "Empty Root", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
      items: [],
      nextPageToken: undefined,
    } as unknown as DriveFolderContents);

    const req = createPostRequest({
      roots: [{ folderId: "root_empty", courseCode: "EMPTY", courseName: "Empty" }],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.files).toEqual([]);
    expect(data.truncated).toBe(false);
  });

  it("should coordinate concurrent workers when queue expands dynamically after cursor advances", async () => {
    const folderMap: Record<string, DriveFolderContents> = {
      root_concurrent: {
        items: [
          { id: "folder_a", name: "Folder A", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
          { id: "folder_b", name: "Folder B", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
        ],
      } as unknown as DriveFolderContents,
      folder_a: {
        items: [
          { id: "sub_a1", name: "Sub A1", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
          { id: "sub_a2", name: "Sub A2", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
        ],
      } as unknown as DriveFolderContents,
      folder_b: {
        items: [
          { id: "file_b1", name: "fileB1.pdf", mimeType: "application/pdf", isFolder: false, size: 100, modifiedTime: "2026-01-01", webViewLink: null, iconLink: null },
        ],
      } as unknown as DriveFolderContents,
      sub_a1: {
        items: [
          { id: "file_a1_1", name: "fileA1_1.pdf", mimeType: "application/pdf", isFolder: false, size: 200, modifiedTime: "2026-01-01", webViewLink: null, iconLink: null },
        ],
      } as unknown as DriveFolderContents,
      sub_a2: {
        items: [
          { id: "file_a2_1", name: "fileA2_1.pdf", mimeType: "application/pdf", isFolder: false, size: 300, modifiedTime: "2026-01-01", webViewLink: null, iconLink: null },
        ],
      } as unknown as DriveFolderContents,
    };

    mockListFolder.mockImplementation(async (folderId: string) => {
      // Add artificial async jitter to simulate concurrency
      if (folderId === "folder_a") {
        await new Promise((r) => setTimeout(r, 40));
      } else {
        await new Promise((r) => setTimeout(r, 10));
      }
      return folderMap[folderId] || { items: [] };
    });

    const req = createPostRequest({
      roots: [{ folderId: "root_concurrent", courseCode: "TEST", courseName: "Concurrent Test" }],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.truncated).toBe(false);

    const fileIds = data.files.map((f: { id: string }) => f.id);
    expect(fileIds).toContain("file_b1");
    expect(fileIds).toContain("file_a1_1");
    expect(fileIds).toContain("file_a2_1");
    expect(data.files.length).toBe(3);
  });

  it("should be resilient to individual subfolder exceptions without crashing the crawl", async () => {
    mockListFolder.mockImplementation(async (folderId: string) => {
      if (folderId === "error_folder") {
        throw new Error("Simulated transient Google Drive 503");
      }
      if (folderId === "root_resilient") {
        return {
          items: [
            { id: "healthy_folder", name: "Healthy", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
            { id: "error_folder", name: "Broken", mimeType: "application/vnd.google-apps.folder", isFolder: true, size: null, modifiedTime: null, webViewLink: null, iconLink: null },
          ],
        } as unknown as DriveFolderContents;
      }
      if (folderId === "healthy_folder") {
        return {
          items: [
            { id: "file_h1", name: "healthy.pdf", mimeType: "application/pdf", isFolder: false, size: 100, modifiedTime: "2026-01-01", webViewLink: null, iconLink: null },
          ],
        } as unknown as DriveFolderContents;
      }
      return { items: [] } as unknown as DriveFolderContents;
    });

    const req = createPostRequest({
      roots: [{ folderId: "root_resilient", courseCode: "RESILIENT", courseName: "Resilient" }],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.files.length).toBe(1);
    expect(data.files[0].id).toBe("file_h1");
  });
});
