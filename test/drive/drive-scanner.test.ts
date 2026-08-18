import { getDatabase, destroyDatabase } from "@/db/database";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import { driveScanner } from "@/features/drive/drive-scanner";

describe("DriveScanner Failure & Deletion Semantics", () => {
  const mockFolderId = "folder_test_scanner_123";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    await getDatabase(true);
    originalFetch = globalThis.fetch;

    // Seed a source in RxDB
    await driveSourceRepository.addSource({
      folderId: mockFolderId,
      url: `https://drive.google.com/drive/folders/${mockFolderId}`,
      name: "Algorithms Course",
    });

    // Seed 2 existing local files in RxDB
    await driveFileRepository.bulkUpsert([
      {
        id: `${mockFolderId}:file_1`,
        sourceId: mockFolderId,
        driveFileId: "file_1",
        parentFolderId: mockFolderId,
        name: "syllabus.pdf",
        mimeType: "application/pdf",
        size: 5000,
        modifiedTime: "2026-01-01T00:00:00Z",
        webViewUrl: "https://drive.google.com/file/d/file_1",
        path: "syllabus.pdf",
        remoteStatus: "available",
        contentStatus: "downloaded",
        errorMessage: null,
        indexedAt: Date.now(),
        downloadedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: `${mockFolderId}:file_2`,
        sourceId: mockFolderId,
        driveFileId: "file_2",
        parentFolderId: mockFolderId,
        name: "chapter1.pdf",
        mimeType: "application/pdf",
        size: 12000,
        modifiedTime: "2026-01-01T00:00:00Z",
        webViewUrl: "https://drive.google.com/file/d/file_2",
        path: "chapter1.pdf",
        remoteStatus: "available",
        contentStatus: "downloaded",
        errorMessage: null,
        indexedAt: Date.now(),
        downloadedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await destroyDatabase();
  });

  it("CRITICAL: Network/Server error (500) must NEVER mark local files as deleted", async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ error: "Google Drive API rate limit" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await driveScanner.scanSource(mockFolderId);

    const source = await driveSourceRepository.getById(mockFolderId);
    expect(source?.status).toBe("error");

    const files = await driveFileRepository.getAllFilesForSource(mockFolderId);
    expect(files.length).toBe(2);
    expect(files.every((f) => f.remoteStatus === "available")).toBe(true);
  });

  it("CRITICAL: 403 Forbidden / 404 Not Found must NEVER delete local files", async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ error: "Folder not accessible or unshared" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await driveScanner.scanSource(mockFolderId);

    const source = await driveSourceRepository.getById(mockFolderId);
    expect(source?.status).toBe("unavailable");

    const files = await driveFileRepository.getAllFilesForSource(mockFolderId);
    expect(files.length).toBe(2);
    expect(files.every((f) => f.remoteStatus === "available")).toBe(true);
  });

  it("CRITICAL: Truncated crawl (hit limits) must NOT mark unreturned files as deleted", async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          files: [
            {
              id: "file_1",
              name: "syllabus.pdf",
              mimeType: "application/pdf",
              size: 5000,
              modifiedTime: "2026-01-01T00:00:00Z",
              webViewLink: "https://drive.google.com/file/d/file_1",
              path: "syllabus.pdf",
              parentFolderId: mockFolderId,
            },
          ],
          folders: [],
          truncated: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    await driveScanner.scanSource(mockFolderId);

    const source = await driveSourceRepository.getById(mockFolderId);
    expect(source?.status).toBe("ready");

    const allFiles = await driveFileRepository.getAllFilesForSource(mockFolderId);
    expect(allFiles.length).toBe(2);
    expect(allFiles.find((f) => f.driveFileId === "file_2")?.remoteStatus).toBe("available");
  });

  it("should successfully apply local diff on complete, successful crawl", async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          files: [
            {
              id: "file_1",
              name: "syllabus_v2.pdf",
              mimeType: "application/pdf",
              size: 5500,
              modifiedTime: "2026-02-01T00:00:00Z",
              webViewLink: "https://drive.google.com/file/d/file_1",
              path: "syllabus_v2.pdf",
              parentFolderId: mockFolderId,
            },
            {
              id: "file_3",
              name: "cheatsheet.pdf",
              mimeType: "application/pdf",
              size: 8000,
              modifiedTime: "2026-02-01T00:00:00Z",
              webViewLink: "https://drive.google.com/file/d/file_3",
              path: "cheatsheet.pdf",
              parentFolderId: mockFolderId,
            },
          ],
          folders: [],
          truncated: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    await driveScanner.scanSource(mockFolderId);

    const activeFiles = await driveFileRepository.getFilesForSource(mockFolderId);
    expect(activeFiles.length).toBe(2);

    // file_1 was modified: contentStatus reset to not-downloaded
    const f1 = activeFiles.find((f) => f.driveFileId === "file_1");
    expect(f1?.name).toBe("syllabus_v2.pdf");
    expect(f1?.contentStatus).toBe("not-downloaded");

    // file_3 was inserted
    const f3 = activeFiles.find((f) => f.driveFileId === "file_3");
    expect(f3).toBeDefined();

    // file_2 was marked deleted
    const allFiles = await driveFileRepository.getAllFilesForSource(mockFolderId);
    const f2 = allFiles.find((f) => f.driveFileId === "file_2");
    expect(f2?.remoteStatus).toBe("deleted");
  });

  it("should revive a previously deleted file if it reappears remotely", async () => {
    // First mark file_2 as deleted
    await driveFileRepository.markFilesDeleted(mockFolderId, ["file_2"]);
    let files = await driveFileRepository.getFilesForSource(mockFolderId);
    expect(files.length).toBe(1);

    // Scan returns file_1 and file_2 again
    globalThis.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          files: [
            {
              id: "file_1",
              name: "syllabus.pdf",
              mimeType: "application/pdf",
              size: 5000,
              modifiedTime: "2026-01-01T00:00:00Z",
              webViewLink: "https://drive.google.com/file/d/file_1",
              path: "syllabus.pdf",
              parentFolderId: mockFolderId,
            },
            {
              id: "file_2",
              name: "chapter1.pdf",
              mimeType: "application/pdf",
              size: 12000,
              modifiedTime: "2026-01-01T00:00:00Z",
              webViewLink: "https://drive.google.com/file/d/file_2",
              path: "chapter1.pdf",
              parentFolderId: mockFolderId,
            },
          ],
          folders: [],
          truncated: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    await driveScanner.scanSource(mockFolderId);

    files = await driveFileRepository.getFilesForSource(mockFolderId);
    expect(files.length).toBe(2);

    const f2 = files.find((f) => f.driveFileId === "file_2");
    expect(f2?.remoteStatus).toBe("available");
  });
});
