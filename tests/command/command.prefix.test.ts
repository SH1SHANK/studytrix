import {
  normalizeStickyPrefixInput,
  parseLeadingPrefixInput,
  prefixForMode,
} from "@/features/command/command.prefix";

describe("command.prefix", () => {
  it("parses a leading prefix", () => {
    const parsed = parseLeadingPrefixInput("/notes");
    expect(parsed.mode).toBe("folders");
    expect(parsed.query).toBe("notes");
    expect(parsed.hadPrefix).toBe(true);
  });

  it("normalizes mixed prefix chains by latest leading prefix", () => {
    const parsed = parseLeadingPrefixInput("/#>actions");
    expect(parsed.mode).toBe("actions");
    expect(parsed.query).toBe("actions");
  });

  it("keeps sticky mode when prefix text is removed", () => {
    const normalized = normalizeStickyPrefixInput("", "tags");
    expect(normalized.mode).toBe("tags");
    expect(normalized.query).toBe("");
    expect(normalized.changedByPrefix).toBe(false);
  });

  it("switches sticky mode when pasted value starts with prefix", () => {
    const normalized = normalizeStickyPrefixInput("@recent", "folders");
    expect(normalized.mode).toBe("recents");
    expect(normalized.query).toBe("recent");
    expect(normalized.changedByPrefix).toBe(true);
  });

  it("maps modes back to prefix token", () => {
    expect(prefixForMode("folders")).toBe("/");
    expect(prefixForMode("tags")).toBe("#");
    expect(prefixForMode("domains")).toBe(":");
    expect(prefixForMode("actions")).toBe(">");
    expect(prefixForMode("recents")).toBe("@");
  });
});
