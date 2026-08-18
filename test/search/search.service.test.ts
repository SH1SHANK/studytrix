import { getDatabase } from "@/db/database";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { tagRepository } from "@/db/repositories/tag.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import { searchService } from "@/features/search/search.service";

describe("SearchService Multi-Entity Search", () => {
  beforeEach(async () => {
    await getDatabase(true);

    await workspaceRepository.create({
      name: "GATE Preparation",
      driveFolderId: "",
      pinned: false,
    });

    await driveSourceRepository.addSource({
      folderId: "src_algorithms",
      url: "https://drive.google.com/drive/folders/src_algorithms",
      name: "Algorithms Source",
    });

    await tagRepository.createTag({
      id: `tag_important_${Math.random().toString(36).slice(2, 7)}`,
      name: "important",
      color: "#FF0000",
      uses: 5,
      isSystem: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await driveFileRepository.bulkUpsert([
      {
        id: "src:thermo_pdf",
        sourceId: "src",
        driveFileId: "thermo_pdf",
        parentFolderId: "root",
        name: "Thermodynamics_Lecture_01.pdf",
        mimeType: "application/pdf",
        size: 500,
        modifiedTime: null,
        webViewUrl: null,
        path: "GATE / Thermodynamics_Lecture_01.pdf",
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
  });

  it("should find workspace by name query", async () => {
    const results = await searchService.search("gate");
    expect(results.some((r) => r.type === "workspace" && r.title === "GATE Preparation")).toBe(true);
  });

  it("should find drive source by name query", async () => {
    const results = await searchService.search("algorithms");
    expect(results.some((r) => r.type === "source" && r.title === "Algorithms Source")).toBe(true);
  });

  it("should find file by name or path query", async () => {
    const results = await searchService.search("thermo");
    expect(results.some((r) => r.type === "file" && r.title.includes("Thermodynamics"))).toBe(true);
  });

  it("should find tag by name query", async () => {
    const results = await searchService.search("important");
    expect(results.some((r) => r.type === "tag" && r.title.includes("important"))).toBe(true);
  });
});
