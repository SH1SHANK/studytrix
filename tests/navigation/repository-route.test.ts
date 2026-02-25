import {
  PERSONAL_BREADCRUMB_ROOT_LABEL,
  buildGlobalFolderRouteHref,
  buildPersonalFolderRouteHref,
  parseRepositoryRoute,
} from "@/features/navigation/repository-route";

describe("repository-route", () => {
  it("parses global academic folder routes", () => {
    const parsed = parseRepositoryRoute({
      pathname: "/CS/4/abc123",
      searchParams: new URLSearchParams("name=Algorithms"),
    });

    expect(parsed.repoKind).toBe("global");
    expect(parsed.departmentId).toBe("CS");
    expect(parsed.semesterId).toBe("4");
    expect(parsed.folderId).toBe("abc123");
  });

  it("parses personal folder routes without academic context", () => {
    const parsed = parseRepositoryRoute({
      pathname: "/personal/folder-123",
      searchParams: new URLSearchParams("name=My%20Folder"),
    });

    expect(parsed.repoKind).toBe("personal");
    expect(parsed.departmentId).toBeNull();
    expect(parsed.semesterId).toBeNull();
    expect(parsed.folderId).toBe("folder-123");
    expect(PERSONAL_BREADCRUMB_ROOT_LABEL).toBe("Personal");
  });

  it("resolves personal root from repo query on dashboard route", () => {
    const parsed = parseRepositoryRoute({
      pathname: "/",
      searchParams: new URLSearchParams("repo=personal"),
    });

    expect(parsed.repoKind).toBe("personal");
    expect(parsed.folderId).toBeNull();
    expect(parsed.departmentId).toBeNull();
    expect(parsed.semesterId).toBeNull();
  });

  it("does not support legacy repository query alias", () => {
    const parsed = parseRepositoryRoute({
      pathname: "/",
      searchParams: new URLSearchParams("repository=personal"),
    });

    expect(parsed.repoKind).toBe("global");
    expect(parsed.folderId).toBeNull();
    expect(parsed.departmentId).toBeNull();
    expect(parsed.semesterId).toBeNull();
  });

  it("builds global folder href with encoded trail", () => {
    const href = buildGlobalFolderRouteHref({
      departmentId: "ME",
      semesterId: "4",
      folderId: "rootFolder",
      folderName: "Thermodynamics",
      trailLabels: ["Thermodynamics"],
      trailIds: ["rootFolder"],
    });

    expect(href.startsWith("/ME/4/rootFolder")).toBe(true);
    expect(href).toContain("name=Thermodynamics");
    expect(href).toContain("trail=");
    expect(href).toContain("trailIds=");
  });

  it("builds personal folder href with personal namespace", () => {
    const href = buildPersonalFolderRouteHref({
      folderId: "personalFolder",
      folderName: "My Notes",
      trailLabels: ["My Notes"],
      trailIds: ["personalFolder"],
    });

    expect(href.startsWith("/personal/personalFolder")).toBe(true);
    expect(href).toContain("name=My+Notes");
  });
});
