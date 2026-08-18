import { getDatabase, destroyDatabase } from "@/db/database";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";

describe("DriveFileRepository Recent & Local Folder Management", () => {
  beforeEach(async () => {
    await getDatabase(true);
  });

  afterEach(async () => {
    await destroyDatabase();
  });

  it("should record file open and retrieve recent files in descending order", async () => {
    await driveFileRepository.bulkUpsert([
      {
        id: "src:f1",
        sourceId: "src",
        driveFileId: "f1",
        parentFolderId: "root",
        name: "file1.pdf",
        mimeType: "application/pdf",
        size: 100,
        modifiedTime: null,
        webViewUrl: null,
        path: "file1.pdf",
        remoteStatus: "available",
        contentStatus: "downloaded",
        errorMessage: null,
        indexedAt: null,
        downloadedAt: null,
        lastOpenedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "src:f2",
        sourceId: "src",
        driveFileId: "f2",
        parentFolderId: "root",
        name: "file2.pdf",
        mimeType: "application/pdf",
        size: 200,
        modifiedTime: null,
        webViewUrl: null,
        path: "file2.pdf",
        remoteStatus: "available",
        contentStatus: "downloaded",
        errorMessage: null,
        indexedAt: null,
        downloadedAt: null,
        lastOpenedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    let recents = await driveFileRepository.getRecentFiles(5);
    expect(recents.length).toBe(0);

    // Open file 1
    await driveFileRepository.recordFileOpen("src:f1");
    // Wait small tick and open file 2
    await new Promise((r) => setTimeout(r, 10));
    await driveFileRepository.recordFileOpen("src:f2");

    recents = await driveFileRepository.getRecentFiles(5);
    expect(recents.length).toBe(2);
    // f2 opened after f1, so f2 should be first
    expect(recents[0].driveFileId).toBe("f2");
    expect(recents[1].driveFileId).toBe("f1");
  });

  it("should move file to a local folder without modifying remote parentFolderId", async () => {
    await driveFileRepository.bulkUpsert([
      {
        id: "src:docA",
        sourceId: "src",
        driveFileId: "docA",
        parentFolderId: "remote_drive_folder_123",
        workspaceId: "ws1",
        localFolderId: null,
        name: "docA.pdf",
        mimeType: "application/pdf",
        size: 100,
        modifiedTime: null,
        webViewUrl: null,
        path: "docA.pdf",
        remoteStatus: "available",
        contentStatus: "downloaded",
        errorMessage: null,
        indexedAt: null,
        downloadedAt: null,
        lastOpenedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    await driveFileRepository.moveFileToFolder("src:docA", "ws1", "local_folder_999");

    const updated = await driveFileRepository.getFileById("src:docA");
    expect(updated?.localFolderId).toBe("local_folder_999");
    expect(updated?.parentFolderId).toBe("remote_drive_folder_123");
  });
});
