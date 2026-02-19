import { jest } from "@jest/globals";

import { FileService } from "@/features/file/file.service";

const driveGetMock = jest.fn();
const getCachedMetadataMock = jest.fn();
const setCachedMetadataMock = jest.fn(async () => undefined);

jest.mock("@/lib/drive.client", () => ({
  getDriveClient: () => ({
    files: {
      get: (...args: unknown[]) => driveGetMock(...args),
    },
  }),
}));

jest.mock("@/features/file/file.cache", () => ({
  DEFAULT_FILE_METADATA_CACHE_TTL: 86400,
  getCachedMetadata: (...args: unknown[]) => getCachedMetadataMock(...args),
  setCachedMetadata: (...args: unknown[]) => setCachedMetadataMock(...args),
}));

describe("FileService.getMetadata", () => {
  beforeEach(() => {
    driveGetMock.mockReset();
    getCachedMetadataMock.mockReset();
    setCachedMetadataMock.mockClear();
  });

  it("returns cached metadata without fetching drive", async () => {
    const cached = {
      id: "f1",
      name: "notes.pdf",
      mimeType: "application/pdf",
      size: 42,
      modifiedTime: "2025-01-01T00:00:00Z",
    };
    getCachedMetadataMock.mockResolvedValueOnce(cached);

    const service = new FileService();
    const result = await service.getMetadata("f1");

    expect(result).toEqual(cached);
    expect(driveGetMock).not.toHaveBeenCalled();
  });

  it("fetches raw metadata and caches it", async () => {
    getCachedMetadataMock.mockResolvedValueOnce(null);
    driveGetMock.mockResolvedValueOnce({
      data: {
        id: "f1",
        name: "slides.pptx",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        size: "2048",
        modifiedTime: "2026-01-01T00:00:00Z",
      },
    });

    const service = new FileService();
    const result = await service.getMetadata("f1");

    expect(result).toEqual({
      id: "f1",
      name: "slides.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 2048,
      modifiedTime: "2026-01-01T00:00:00Z",
    });
    expect(setCachedMetadataMock).toHaveBeenCalledWith("f1", result, 86400);
  });
});
