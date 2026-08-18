import { getDatabase, destroyDatabase } from "@/db/database";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { tagRepository } from "@/db/repositories/tag.repository";
import { settingsRepository } from "@/db/repositories/settings.repository";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";

describe("RxDB Repositories", () => {
  beforeEach(async () => {
    await getDatabase(true);
  });

  afterEach(async () => {
    await destroyDatabase();
  });

  describe("WorkspaceRepository", () => {
    it("should create, read, update, and delete a workspace", async () => {
      const created = await workspaceRepository.create({
        driveFolderId: "folder_123456789",
        name: "Test Workspace",
        category: "Semester 4",
        color: "indigo",
        pinned: false,
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("Test Workspace");

      const fetched = await workspaceRepository.getById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe("Test Workspace");

      const updated = await workspaceRepository.update(created.id, {
        name: "Updated Workspace",
      });
      expect(updated?.name).toBe("Updated Workspace");

      const pinned = await workspaceRepository.togglePin(created.id);
      expect(pinned?.pinned).toBe(true);

      const deleted = await workspaceRepository.delete(created.id);
      expect(deleted).toBe(true);

      const afterDelete = await workspaceRepository.getById(created.id);
      expect(afterDelete).toBeNull();
    });
  });

  describe("TagRepository", () => {
    it("should handle tag and deterministic tag assignments", async () => {
      const tag = await tagRepository.createTag({
        id: "tag_os",
        name: "OS",
        color: "#4F46E5",
        uses: 0,
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      expect(tag.id).toBe("tag_os");

      const assignment = await tagRepository.assignTag("file_abc", "tag_os", "file", true);
      expect(assignment.id).toBe("file_abc:tag_os");
      expect(assignment.starred).toBe(true);

      const assignments = await tagRepository.getAssignmentsForEntity("file_abc");
      expect(assignments.length).toBe(1);
      expect(assignments[0].tagId).toBe("tag_os");

      const entities = await tagRepository.getEntitiesByTag("tag_os");
      expect(entities).toContain("file_abc");

      await tagRepository.removeAssignment("file_abc", "tag_os");
      const emptyAssignments = await tagRepository.getAssignmentsForEntity("file_abc");
      expect(emptyAssignments.length).toBe(0);
    });
  });

  describe("SettingsRepository", () => {
    it("should store and retrieve settings values", async () => {
      await settingsRepository.set("theme", "midnight");
      const value = await settingsRepository.get("theme");
      expect(value).toBe("midnight");

      const all = await settingsRepository.getAll();
      expect(all.theme).toBe("midnight");
    });
  });

  describe("DriveSource & DriveFile Repositories", () => {
    it("should manage drive sources and files with deterministic composite IDs", async () => {
      const source = await driveSourceRepository.addSource({
        folderId: "folder_root_999",
        url: "https://drive.google.com/drive/folders/folder_root_999",
        name: "DBMS Course",
      });

      expect(source.id).toBe("folder_root_999");
      expect(source.status).toBe("ready");

      const fileDoc = {
        id: "folder_root_999:file_111",
        sourceId: "folder_root_999",
        driveFileId: "file_111",
        parentFolderId: "folder_root_999",
        name: "lecture1.pdf",
        mimeType: "application/pdf",
        size: 1024,
        modifiedTime: "2026-08-18T10:00:00Z",
        webViewUrl: "https://drive.google.com/file/d/file_111",
        path: "DBMS Course / lecture1.pdf",
        remoteStatus: "available" as const,
        contentStatus: "not-downloaded" as const,
        errorMessage: null,
        indexedAt: null,
        downloadedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await driveFileRepository.bulkUpsert([fileDoc]);

      const files = await driveFileRepository.getFilesForSource("folder_root_999");
      expect(files.length).toBe(1);
      expect(files[0].name).toBe("lecture1.pdf");

      await driveFileRepository.markFilesDeleted("folder_root_999", ["file_111"]);
      const activeFiles = await driveFileRepository.getFilesForSource("folder_root_999");
      expect(activeFiles.length).toBe(0);

      // Verify that the document in RxDB still exists with remoteStatus: deleted and untouched contentStatus
      const rawFile = await driveFileRepository.getFile("folder_root_999", "file_111");
      expect(rawFile).not.toBeNull();
      expect(rawFile?.remoteStatus).toBe("deleted");
      expect(rawFile?.contentStatus).toBe("not-downloaded");
      expect(rawFile?.name).toBe("lecture1.pdf");
      expect(rawFile?.size).toBe(1024);
      expect(rawFile?.path).toBe("DBMS Course / lecture1.pdf");

      // Cascading source removal
      await driveSourceRepository.removeSource("folder_root_999");
      const allFiles = await driveFileRepository.getAllFilesForSource("folder_root_999");
      expect(allFiles.length).toBe(0);
    });
  });
});
