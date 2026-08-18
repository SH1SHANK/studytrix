import { getDatabase, destroyDatabase } from "@/db/database";
import { folderRepository } from "@/db/repositories/folder.repository";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";

describe("FolderRepository Local Hierarchy", () => {
  beforeEach(async () => {
    await getDatabase(true);
  });

  afterEach(async () => {
    await destroyDatabase();
  });

  it("should create local root folders and nested subfolders", async () => {
    const ws = await workspaceRepository.create({
      name: "GATE Preparation",
      driveFolderId: "",
      pinned: false,
    });

    // Create root folder
    const thermo = await folderRepository.createFolder({
      workspaceId: ws.id,
      name: "Thermodynamics",
    });

    expect(thermo.id).toBeDefined();
    expect(thermo.workspaceId).toBe(ws.id);
    expect(thermo.parentFolderId).toBe("");

    // Create subfolder inside Thermodynamics
    const notes = await folderRepository.createFolder({
      workspaceId: ws.id,
      parentFolderId: thermo.id,
      name: "Notes",
    });

    expect(notes.parentFolderId).toBe(thermo.id);

    // Query root folders
    const rootFolders = await folderRepository.getFoldersInFolder(ws.id, null);
    expect(rootFolders.length).toBe(1);
    expect(rootFolders[0].name).toBe("Thermodynamics");

    // Query subfolders
    const subFolders = await folderRepository.getFoldersInFolder(ws.id, thermo.id);
    expect(subFolders.length).toBe(1);
    expect(subFolders[0].name).toBe("Notes");

    // Resolve breadcrumb path
    const breadcrumbPath = await folderRepository.getFolderPath(notes.id);
    expect(breadcrumbPath).toEqual([
      { id: thermo.id, name: "Thermodynamics" },
      { id: notes.id, name: "Notes" },
    ]);
  });

  it("should cascade delete child folders and unbind localFolderId from files upon folder deletion", async () => {
    const ws = await workspaceRepository.create({
      name: "Research",
      driveFolderId: "",
      pinned: false,
    });

    const parent = await folderRepository.createFolder({
      workspaceId: ws.id,
      name: "Papers",
    });

    const child = await folderRepository.createFolder({
      workspaceId: ws.id,
      parentFolderId: parent.id,
      name: "2026",
    });

    // Seed file bound to child folder
    await driveFileRepository.bulkUpsert([
      {
        id: "source1:fileA",
        sourceId: "source1",
        driveFileId: "fileA",
        parentFolderId: "remote_root",
        workspaceId: ws.id,
        localFolderId: child.id,
        name: "paper.pdf",
        mimeType: "application/pdf",
        size: 1000,
        modifiedTime: null,
        webViewUrl: null,
        path: "paper.pdf",
        remoteStatus: "available",
        contentStatus: "downloaded",
        errorMessage: null,
        indexedAt: null,
        downloadedAt: null,
        lastOpenedAt: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    // Delete parent folder
    await folderRepository.deleteFolder(parent.id);

    // Verify parent and child folders are deleted
    const parentDoc = await folderRepository.getById(parent.id);
    const childDoc = await folderRepository.getById(child.id);
    expect(parentDoc).toBeNull();
    expect(childDoc).toBeNull();

    // Verify file remains intact but localFolderId is cleanly unset to ""
    const file = await driveFileRepository.getFileById("source1:fileA");
    expect(file).not.toBeNull();
    expect(file?.localFolderId).toBe("");
    expect(file?.parentFolderId).toBe("remote_root"); // remote hierarchy preserved!
  });
});
