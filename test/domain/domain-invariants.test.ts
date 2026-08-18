import { getDatabase, destroyDatabase } from "@/db/database";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { folderRepository } from "@/db/repositories/folder.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { tagRepository } from "@/db/repositories/tag.repository";
import { searchService } from "@/features/search/search.service";

describe("Domain Invariants: Generic Study Library", () => {
  beforeEach(async () => {
    await getDatabase(true);
  });

  afterEach(async () => {
    await destroyDatabase();
  });

  describe("1. Folder Hierarchy & Subtree Deletion Invariants", () => {
    it("should correctly handle root folder (parentFolderId: '') and nested hierarchy", async () => {
      const ws = await workspaceRepository.create({
        name: "GATE Preparation",
        driveFolderId: "",
        pinned: false,
      });

      // Root folder A
      const folderA = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: "",
        name: "Thermodynamics",
      });
      expect(folderA.parentFolderId).toBe("");

      // Nested subfolder B inside A
      const folderB = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: folderA.id,
        name: "Notes",
      });
      expect(folderB.parentFolderId).toBe(folderA.id);

      // Sibling subfolder C inside A
      const folderC = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: folderA.id,
        name: "Mock Tests",
      });

      // Separate root folder D
      const folderD = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: "",
        name: "Fluid Mechanics",
      });

      // Check root folders query
      const rootFolders = await folderRepository.getFoldersInFolder(ws.id, "");
      expect(rootFolders.length).toBe(2);
      expect(rootFolders.map((f) => f.id).sort()).toEqual([folderA.id, folderD.id].sort());

      // Check nested folders in A
      const subFoldersA = await folderRepository.getFoldersInFolder(ws.id, folderA.id);
      expect(subFoldersA.length).toBe(2);
      expect(subFoldersA.map((f) => f.id).sort()).toEqual([folderB.id, folderC.id].sort());

      // Check breadcrumb path resolution for nested folder B
      const pathB = await folderRepository.getFolderPath(folderB.id);
      expect(pathB).toEqual([
        { id: folderA.id, name: "Thermodynamics" },
        { id: folderB.id, name: "Notes" },
      ]);

      // Move folder C to root
      const movedC = await folderRepository.moveFolder(folderC.id, "");
      expect(movedC?.parentFolderId).toBe("");
      const updatedRootFolders = await folderRepository.getFoldersInFolder(ws.id, "");
      expect(updatedRootFolders.length).toBe(3);
    });

    it("should delete subtree (A -> B, C), unbind nested files, and leave sibling subtree (D) intact", async () => {
      const ws = await workspaceRepository.create({
        name: "Computer Science",
        driveFolderId: "",
        pinned: false,
      });

      // Seed Drive source
      await driveSourceRepository.addSource({
        folderId: "remote_drive_src_1",
        url: "https://drive.google.com/drive/folders/remote_drive_src_1",
        name: "CS Resources",
      });

      // Folder A (root)
      const folderA = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: "",
        name: "Algorithms",
      });

      // Folder B (child of A)
      const folderB = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: folderA.id,
        name: "Graph Theory",
      });

      // Folder C (child of A)
      const folderC = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: folderA.id,
        name: "Dynamic Programming",
      });

      // Sibling root folder D
      const folderD = await folderRepository.createFolder({
        workspaceId: ws.id,
        parentFolderId: "",
        name: "Databases",
      });

      // Seed File 1 inside Folder B
      await driveFileRepository.bulkUpsert([
        {
          id: "remote_drive_src_1:dijkstra_pdf",
          sourceId: "remote_drive_src_1",
          driveFileId: "dijkstra_pdf",
          parentFolderId: "remote_drive_src_1",
          workspaceId: ws.id,
          localFolderId: folderB.id,
          name: "dijkstra.pdf",
          mimeType: "application/pdf",
          size: 1024,
          modifiedTime: null,
          webViewUrl: null,
          path: "Algorithms / Graph Theory / dijkstra.pdf",
          remoteStatus: "available",
          contentStatus: "downloaded",
          errorMessage: null,
          indexedAt: null,
          downloadedAt: null,
          lastOpenedAt: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        // Seed File 2 inside Folder D
        {
          id: "remote_drive_src_1:sql_pdf",
          sourceId: "remote_drive_src_1",
          driveFileId: "sql_pdf",
          parentFolderId: "remote_drive_src_1",
          workspaceId: ws.id,
          localFolderId: folderD.id,
          name: "sql_guide.pdf",
          mimeType: "application/pdf",
          size: 2048,
          modifiedTime: null,
          webViewUrl: null,
          path: "Databases / sql_guide.pdf",
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

      // Execute recursive deletion on Folder A
      const deleteResult = await folderRepository.deleteFolder(folderA.id);
      expect(deleteResult).toBe(true);

      // Verify A, B, C are deleted
      expect(await folderRepository.getById(folderA.id)).toBeNull();
      expect(await folderRepository.getById(folderB.id)).toBeNull();
      expect(await folderRepository.getById(folderC.id)).toBeNull();

      // Verify Sibling D is intact
      const intactFolderD = await folderRepository.getById(folderD.id);
      expect(intactFolderD).not.toBeNull();
      expect(intactFolderD?.name).toBe("Databases");

      // Verify File 1 was safely unlinked from deleted folder (localFolderId: "")
      const unlinkedFile1 = await driveFileRepository.getFile("remote_drive_src_1", "dijkstra_pdf");
      expect(unlinkedFile1).not.toBeNull();
      expect(unlinkedFile1?.workspaceId).toBe(ws.id);
      expect(unlinkedFile1?.localFolderId).toBe(""); // unlinked to workspace root
      expect(unlinkedFile1?.remoteStatus).toBe("available"); // Remote file NEVER marked deleted

      // Verify File 2 in Folder D is untouched
      const intactFile2 = await driveFileRepository.getFile("remote_drive_src_1", "sql_pdf");
      expect(intactFile2).not.toBeNull();
      expect(intactFile2?.localFolderId).toBe(folderD.id);

      // Verify Drive source is intact
      const intactSource = await driveSourceRepository.getById("remote_drive_src_1");
      expect(intactSource).not.toBeNull();
    });
  });

  describe("2. Drive File Assignment & Placement Invariants", () => {
    it("should preserve remote identity & remote parent while moving across local workspaces and folders", async () => {
      const ws1 = await workspaceRepository.create({ name: "Semester 5", driveFolderId: "", pinned: false });
      const ws2 = await workspaceRepository.create({ name: "Self Study", driveFolderId: "", pinned: false });

      const folder1 = await folderRepository.createFolder({ workspaceId: ws1.id, name: "Math", parentFolderId: "" });
      const folder2 = await folderRepository.createFolder({ workspaceId: ws2.id, name: "Calculus", parentFolderId: "" });

      // Seed Drive file
      const fileId = "src_mit:calculus_notes";
      await driveFileRepository.bulkUpsert([
        {
          id: fileId,
          sourceId: "src_mit",
          driveFileId: "calculus_notes",
          parentFolderId: "remote_drive_root_xyz", // Remote Google Drive folder
          workspaceId: ws1.id,
          localFolderId: folder1.id,
          name: "Calculus_Notes.pdf",
          mimeType: "application/pdf",
          size: 4096,
          modifiedTime: "2026-01-01T00:00:00Z",
          webViewUrl: "https://drive.google.com/file/d/calculus_notes",
          path: "Math / Calculus_Notes.pdf",
          remoteStatus: "available",
          contentStatus: "not-downloaded",
          errorMessage: null,
          indexedAt: null,
          downloadedAt: null,
          lastOpenedAt: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      // Move file to Workspace 2, Folder 2
      const moved = await driveFileRepository.moveFileToFolder(fileId, ws2.id, folder2.id);
      expect(moved).not.toBeNull();
      expect(moved?.workspaceId).toBe(ws2.id);
      expect(moved?.localFolderId).toBe(folder2.id);

      // Verify Remote Drive properties are invariant and untouched
      expect(moved?.sourceId).toBe("src_mit");
      expect(moved?.driveFileId).toBe("calculus_notes");
      expect(moved?.parentFolderId).toBe("remote_drive_root_xyz");
      expect(moved?.webViewUrl).toBe("https://drive.google.com/file/d/calculus_notes");
      expect(moved?.remoteStatus).toBe("available");
    });
  });

  describe("3. Recent Access Invariants", () => {
    it("should track lastOpenedAt, sort descending, and ignore unopened files (lastOpenedAt = 0)", async () => {
      const now = Date.now();

      await driveFileRepository.bulkUpsert([
        {
          id: "src:f1",
          sourceId: "src",
          driveFileId: "f1",
          parentFolderId: "root",
          name: "Unopened_File.pdf",
          mimeType: "application/pdf",
          size: 100,
          modifiedTime: null,
          webViewUrl: null,
          path: "f1.pdf",
          remoteStatus: "available",
          contentStatus: "not-downloaded",
          errorMessage: null,
          indexedAt: null,
          downloadedAt: null,
          lastOpenedAt: 0, // Never opened
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "src:f2",
          sourceId: "src",
          driveFileId: "f2",
          parentFolderId: "root",
          name: "Opened_Older.pdf",
          mimeType: "application/pdf",
          size: 100,
          modifiedTime: null,
          webViewUrl: null,
          path: "f2.pdf",
          remoteStatus: "available",
          contentStatus: "not-downloaded",
          errorMessage: null,
          indexedAt: null,
          downloadedAt: null,
          lastOpenedAt: now - 50000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "src:f3",
          sourceId: "src",
          driveFileId: "f3",
          parentFolderId: "root",
          name: "Opened_Newer.pdf",
          mimeType: "application/pdf",
          size: 100,
          modifiedTime: null,
          webViewUrl: null,
          path: "f3.pdf",
          remoteStatus: "available",
          contentStatus: "not-downloaded",
          errorMessage: null,
          indexedAt: null,
          downloadedAt: null,
          lastOpenedAt: now - 10000,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Query recent files: must return f3 (newer) then f2 (older), strictly ignoring f1 (unopened)
      const recents = await driveFileRepository.getRecentFiles(10);
      expect(recents.length).toBe(2);
      expect(recents[0].driveFileId).toBe("f3");
      expect(recents[1].driveFileId).toBe("f2");

      // Record open on f1
      await driveFileRepository.recordFileOpen("src:f1");
      const updatedRecents = await driveFileRepository.getRecentFiles(10);
      expect(updatedRecents.length).toBe(3);
      expect(updatedRecents[0].driveFileId).toBe("f1"); // f1 is now most recently opened
    });
  });

  describe("4. Multi-Entity Search Invariants", () => {
    it("should find workspaces, local folders, files, tags, and Drive sources", async () => {
      const ws = await workspaceRepository.create({ name: "Robotics Engineering", driveFolderId: "", pinned: false });
      await folderRepository.createFolder({ workspaceId: ws.id, name: "Kinematics", parentFolderId: "" });
      await driveSourceRepository.addSource({
        folderId: "src_robotics",
        url: "https://drive.google.com/drive/folders/src_robotics",
        name: "Robotics Drive Archive",
      });
      await tagRepository.createTag({
        id: "tag_exam",
        name: "exam-material",
        color: "#00FF00",
        uses: 3,
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await driveFileRepository.bulkUpsert([
        {
          id: "src_robotics:forward_kinematics",
          sourceId: "src_robotics",
          driveFileId: "forward_kinematics",
          parentFolderId: "root",
          name: "Forward_Kinematics_Lab.pdf",
          mimeType: "application/pdf",
          size: 500,
          modifiedTime: null,
          webViewUrl: null,
          path: "Kinematics / Forward_Kinematics_Lab.pdf",
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

      // 1. Search workspace
      const wsResults = await searchService.search("robotics", { types: ["workspace"] });
      expect(wsResults.some((r) => r.type === "workspace" && r.title === "Robotics Engineering")).toBe(true);

      // 2. Search folder
      const folderResults = await searchService.search("kinematics", { types: ["folder"] });
      expect(folderResults.some((r) => r.type === "folder" && r.title === "Kinematics")).toBe(true);

      // 3. Search file
      const fileResults = await searchService.search("forward", { types: ["file"] });
      expect(fileResults.some((r) => r.type === "file" && r.title.includes("Forward_Kinematics"))).toBe(true);

      // 4. Search tag
      const tagResults = await searchService.search("exam", { types: ["tag"] });
      expect(tagResults.some((r) => r.type === "tag" && r.title.includes("exam-material"))).toBe(true);

      // 5. Search source
      const sourceResults = await searchService.search("archive", { types: ["source"] });
      expect(sourceResults.some((r) => r.type === "source" && r.title.includes("Robotics Drive Archive"))).toBe(true);
    });
  });

  describe("5. Offline & Remote Deletion Disconnection Invariant", () => {
    it("should preserve downloaded contentStatus and local metadata when remote file is marked deleted", async () => {
      const fileId = "src_backup:lecture_01";
      await driveFileRepository.bulkUpsert([
        {
          id: fileId,
          sourceId: "src_backup",
          driveFileId: "lecture_01",
          parentFolderId: "root",
          name: "Lecture_01.pdf",
          mimeType: "application/pdf",
          size: 1024,
          modifiedTime: "2026-01-01T00:00:00Z",
          webViewUrl: null,
          path: "Lecture_01.pdf",
          remoteStatus: "available",
          contentStatus: "downloaded",
          errorMessage: null,
          indexedAt: null,
          downloadedAt: Date.now(),
          lastOpenedAt: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      // Simulate remote deletion notification
      await driveFileRepository.markFilesDeleted("src_backup", ["lecture_01"]);

      const fileDoc = await driveFileRepository.getFile("src_backup", "lecture_01");
      expect(fileDoc).not.toBeNull();
      expect(fileDoc?.remoteStatus).toBe("deleted");
      // CRITICAL: Local downloaded content status remains downloaded
      expect(fileDoc?.contentStatus).toBe("downloaded");
      expect(fileDoc?.name).toBe("Lecture_01.pdf");
      expect(fileDoc?.size).toBe(1024);
    });
  });
});
