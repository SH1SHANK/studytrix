import {
  isEssentialActionActive,
  resolveEssentialScopeTransition,
  shouldShowEssentialScopeBar,
} from "@/features/command/command.scope-ui";

describe("command.scope-ui", () => {
  it("shows essential bar only when query is empty", () => {
    expect(shouldShowEssentialScopeBar("")).toBe(true);
    expect(shouldShowEssentialScopeBar("   ")).toBe(true);
    expect(shouldShowEssentialScopeBar("abc")).toBe(false);
  });

  it("marks essential actions as active from prefix/scope state", () => {
    expect(
      isEssentialActionActive("folder", {
        prefixMode: "folders",
        scopeSelectorMode: null,
        searchMode: "global",
      }),
    ).toBe(true);

    expect(
      isEssentialActionActive("tag", {
        prefixMode: null,
        scopeSelectorMode: "tags",
        searchMode: "global",
      }),
    ).toBe(true);

    expect(
      isEssentialActionActive("actions", {
        prefixMode: null,
        scopeSelectorMode: null,
        searchMode: "actions",
      }),
    ).toBe(true);
  });

  it("resolves essential transitions", () => {
    expect(resolveEssentialScopeTransition("folder")).toEqual({
      prefixMode: "folders",
      scopeSelectorMode: "folders",
      searchMode: "global",
      clearQuery: true,
      clearScope: false,
    });

    expect(resolveEssentialScopeTransition("clear")).toEqual({
      prefixMode: null,
      scopeSelectorMode: null,
      searchMode: "global",
      clearQuery: true,
      clearScope: true,
    });
  });
});
