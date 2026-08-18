import {
  parseDriveFolderUrl,
  normalizeDriveFolderUrl,
  isValidDriveFolderUrl,
} from "@/features/drive/drive-url";

describe("Drive URL Utilities", () => {
  it("should extract folder ID from standard folder URLs", () => {
    const parsed = parseDriveFolderUrl("https://drive.google.com/drive/folders/1ABC_xyz-1234567890");
    expect(parsed).not.toBeNull();
    expect(parsed?.folderId).toBe("1ABC_xyz-1234567890");
    expect(parsed?.normalizedUrl).toBe("https://drive.google.com/drive/folders/1ABC_xyz-1234567890");
  });

  it("should extract folder ID from multi-account /u/1/ URLs", () => {
    const parsed = parseDriveFolderUrl("https://drive.google.com/drive/u/2/folders/1ABC_xyz-1234567890");
    expect(parsed).not.toBeNull();
    expect(parsed?.folderId).toBe("1ABC_xyz-1234567890");
  });

  it("should accept raw valid folder IDs", () => {
    const parsed = parseDriveFolderUrl("1ABC_xyz-1234567890");
    expect(parsed).not.toBeNull();
    expect(parsed?.folderId).toBe("1ABC_xyz-1234567890");
  });

  it("should reject invalid non-drive URLs", () => {
    expect(parseDriveFolderUrl("https://example.com/not-a-drive-url")).toBeNull();
    expect(isValidDriveFolderUrl("https://example.com")).toBe(false);
  });

  it("should normalize folder ID into canonical URL", () => {
    expect(normalizeDriveFolderUrl("1234567890abcdef")).toBe(
      "https://drive.google.com/drive/folders/1234567890abcdef",
    );
  });
});
