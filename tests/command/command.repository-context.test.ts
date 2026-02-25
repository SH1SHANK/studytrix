import { hasExplicitRepositoryContext } from "@/features/command/command.repository-context";

describe("command.repository-context", () => {
  it("does not treat dashboard root repo query as explicit context", () => {
    expect(
      hasExplicitRepositoryContext({
        pathname: "/",
        isPersonalPath: false,
        isAcademicPath: false,
        hasRepoQueryParam: true,
      }),
    ).toBe(false);
  });

  it("treats personal path as explicit context", () => {
    expect(
      hasExplicitRepositoryContext({
        pathname: "/personal/folder-1",
        isPersonalPath: true,
        isAcademicPath: false,
        hasRepoQueryParam: false,
      }),
    ).toBe(true);
  });

  it("treats academic global path as explicit context", () => {
    expect(
      hasExplicitRepositoryContext({
        pathname: "/CS/4/folder-1",
        isPersonalPath: false,
        isAcademicPath: true,
        hasRepoQueryParam: false,
      }),
    ).toBe(true);
  });

  it("treats repo query as explicit context outside dashboard root", () => {
    expect(
      hasExplicitRepositoryContext({
        pathname: "/settings",
        isPersonalPath: false,
        isAcademicPath: false,
        hasRepoQueryParam: true,
      }),
    ).toBe(true);
  });
});
