import { jest } from "@jest/globals";

import { FileService, FileServiceError } from "@/features/file/file.service";

const driveGetMock = jest.fn<any>();
const getCachedMetadataMock = jest.fn<any>();
const setCachedMetadataMock = jest.fn<any>(async () => undefined);

jest.mock("@/lib/drive.client", () => ({
  getDriveClient: () => ({
    files: {
      get: (...args: any[]) => driveGetMock(...args),
    },
  }),
}));

jest.mock("@/features/file/file.cache", () => ({
  DEFAULT_FILE_METADATA_CACHE_TTL: 86400,
  getCachedMetadata: (...args: any[]) => getCachedMetadataMock(...args),
  setCachedMetadata: (...args: any[]) => setCachedMetadataMock(...args),
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

  it("resolves shortcut metadata to the target file", async () => {
    getCachedMetadataMock.mockResolvedValueOnce(null);
    driveGetMock
      .mockResolvedValueOnce({
        data: {
          id: "shortcut1",
          name: "Innovation Deck Shortcut",
          mimeType: "application/vnd.google-apps.shortcut",
          shortcutDetails: {
            targetId: "target1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "target1",
          name: "Innovation Deck.pptx",
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          size: "4096",
          modifiedTime: "2026-02-21T12:00:00Z",
        },
      });

    const service = new FileService();
    const result = await service.getMetadata("shortcut1");

    expect(result).toEqual({
      id: "shortcut1",
      name: "Innovation Deck.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 4096,
      modifiedTime: "2026-02-21T12:00:00Z",
      resolvedFileId: "target1",
      sourceMimeType: "application/vnd.google-apps.shortcut",
    });

    expect(driveGetMock).toHaveBeenCalledTimes(2);
    expect(setCachedMetadataMock).toHaveBeenCalledWith("shortcut1", result, 86400);
  });

  it("returns 404 when shortcut target is missing", async () => {
    driveGetMock.mockResolvedValueOnce({
      data: {
        id: "shortcut2",
        name: "Broken Shortcut",
        mimeType: "application/vnd.google-apps.shortcut",
        shortcutDetails: {},
      },
    });

    const service = new FileService();

    await expect(service.getRawMetadata("shortcut2")).rejects.toMatchObject({
      statusCode: 404,
      message: "Shortcut target not found",
    } satisfies Partial<FileServiceError>);
  });

  it("maps inaccessible shortcut target to 403", async () => {
    driveGetMock
      .mockResolvedValueOnce({
        data: {
          id: "shortcut3",
          name: "Restricted Shortcut",
          mimeType: "application/vnd.google-apps.shortcut",
          shortcutDetails: {
            targetId: "restricted-target",
          },
        },
      })
      .mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            error: {
              errors: [{ reason: "insufficientPermissions" }],
            },
          },
        },
      });

    const service = new FileService();

    await expect(service.getRawMetadata("shortcut3")).rejects.toMatchObject({
      statusCode: 403,
      message: "File access denied",
    } satisfies Partial<FileServiceError>);
  });
});
