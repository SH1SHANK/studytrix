import { Readable } from "node:stream";

import { jest } from "@jest/globals";

const enforceDriveRateLimitMock = jest.fn<any>(async () => undefined);
const getRawMetadataMock = jest.fn<any>();
const driveGetMock = jest.fn<any>();
const driveExportMock = jest.fn<any>();

class MockFileServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "FileServiceError";
    this.statusCode = statusCode;
  }
}

jest.mock("@/features/drive/drive.rateLimit", () => ({
  enforceDriveRateLimit: (...args: any[]) => enforceDriveRateLimitMock(...args),
}));

jest.mock("@/features/file/file.service", () => ({
  FileService: jest.fn().mockImplementation(() => ({
    getRawMetadata: (...args: any[]) => getRawMetadataMock(...args),
  })),
  FileServiceError: MockFileServiceError,
}));

jest.mock("@/lib/drive.client", () => ({
  getDriveClient: () => ({
    files: {
      get: (...args: any[]) => driveGetMock(...args),
      export: (...args: any[]) => driveExportMock(...args),
    },
  }),
}));

import { GET } from "@/app/api/file/[fileId]/stream/route";
import { FileServiceError } from "@/features/file/file.service";

function makeContext(fileId: string): { params: Promise<{ fileId: string }> } {
  return {
    params: Promise.resolve({ fileId }),
  };
}

describe("file stream route", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    enforceDriveRateLimitMock.mockReset();
    getRawMetadataMock.mockReset();
    driveGetMock.mockReset();
    driveExportMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("streams shortcut targets using the resolved target id", async () => {
    getRawMetadataMock.mockResolvedValueOnce({
      id: "shortcut-id",
      name: "innovation.pdf",
      mimeType: "application/pdf",
      size: 3,
      modifiedTime: null,
      resolvedFileId: "target-id",
      sourceMimeType: "application/vnd.google-apps.shortcut",
    });

    driveGetMock.mockResolvedValueOnce({
      data: Readable.from([Buffer.from("abc", "utf8")]),
      status: 200,
      headers: {},
    });

    const request = new Request("http://localhost/api/file/shortcut-id/stream", {
      headers: {
        "x-forwarded-for": "203.0.113.42",
      },
    });

    const response = await GET(request as any, makeContext("shortcut-id"));

    expect(response.status).toBe(200);
    expect(enforceDriveRateLimitMock).toHaveBeenCalledWith("203.0.113.42");
    expect(driveGetMock).toHaveBeenCalledWith(
      {
        fileId: "target-id",
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
        headers: undefined,
      },
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("innovation.pdf");
    await expect(response.text()).resolves.toBe("abc");
  });

  it("returns explicit 404 when shortcut target cannot be resolved", async () => {
    getRawMetadataMock.mockResolvedValueOnce({
      id: "shortcut-id",
      name: "broken-shortcut",
      mimeType: "application/pdf",
      size: 0,
      modifiedTime: null,
      sourceMimeType: "application/vnd.google-apps.shortcut",
    });

    const request = new Request("http://localhost/api/file/shortcut-id/stream");
    const response = await GET(request as any, makeContext("shortcut-id"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      errorCode: "SHORTCUT_TARGET_NOT_FOUND",
      message: "Shortcut target not found",
    });
    expect(driveGetMock).not.toHaveBeenCalled();
  });

  it("maps inaccessible shortcut target metadata to 403", async () => {
    getRawMetadataMock.mockRejectedValueOnce(
      new FileServiceError("File access denied", 403),
    );

    const request = new Request("http://localhost/api/file/shortcut-id/stream");
    const response = await GET(request as any, makeContext("shortcut-id"));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      errorCode: "FILE_ACCESS_DENIED",
      message: "File access denied",
    });
  });

  it("maps drive not-found errors from resolved stream fetch to 404", async () => {
    getRawMetadataMock.mockResolvedValueOnce({
      id: "shortcut-id",
      name: "innovation.pdf",
      mimeType: "application/pdf",
      size: 3,
      modifiedTime: null,
      resolvedFileId: "target-id",
      sourceMimeType: "application/vnd.google-apps.shortcut",
    });

    driveGetMock.mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          error: {
            errors: [{ reason: "notFound" }],
          },
        },
      },
    });

    const request = new Request("http://localhost/api/file/shortcut-id/stream");
    const response = await GET(request as any, makeContext("shortcut-id"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      errorCode: "FILE_NOT_FOUND",
      message: "File not found",
    });
  });
});
