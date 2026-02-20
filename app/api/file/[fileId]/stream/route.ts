import "server-only";

import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { enforceDriveRateLimit } from "@/features/drive/drive.rateLimit";
import { FileService, FileServiceError } from "@/features/file/file.service";
import { getDriveClient } from "@/lib/drive.client";

export const runtime = "nodejs";

type RouteParams = {
  fileId: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

type StreamRouteErrorPayload = {
  status: number;
  errorCode: string;
  message: string;
};

class StreamRouteError extends Error {
  readonly status: number;

  readonly errorCode: string;

  constructor(payload: StreamRouteErrorPayload) {
    super(payload.message);
    this.name = "StreamRouteError";
    this.status = payload.status;
    this.errorCode = payload.errorCode;
  }
}

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const fileService = new FileService();

const SAFE_PREVIEW_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const GOOGLE_EXPORT_FORMATS: Record<
  string,
  { mimeType: string; extension: string }
> = {
  "application/vnd.google-apps.document": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
  },
  "application/vnd.google-apps.drawing": {
    mimeType: "image/png",
    extension: "png",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeParam(value: string): string | null {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return null;
  }
}

function validateFileId(value: string): string | null {
  const decoded = decodeParam(value);
  if (!decoded) {
    return null;
  }

  if (!FILE_ID_PATTERN.test(decoded) || decoded.length > 256) {
    return null;
  }

  return decoded;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return firstForwarded || realIp || "unknown";
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === "Rate limit exceeded";
}

function isUpstreamNetworkError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const code = typeof error.code === "string" ? error.code.toUpperCase() : "";
  const cause = isRecord(error.cause) ? error.cause : null;
  const causeCode =
    cause && typeof cause.code === "string" ? cause.code.toUpperCase() : "";
  const message =
    typeof error.message === "string" ? error.message.toLowerCase() : "";

  if (
    code === "ENOTFOUND"
    || code === "EAI_AGAIN"
    || code === "ECONNRESET"
    || code === "ECONNREFUSED"
    || code === "ETIMEDOUT"
    || causeCode === "ENOTFOUND"
    || causeCode === "EAI_AGAIN"
    || causeCode === "ECONNRESET"
    || causeCode === "ECONNREFUSED"
    || causeCode === "ETIMEDOUT"
  ) {
    return true;
  }

  return (
    message.includes("fetch failed")
    || message.includes("network")
    || message.includes("socket hang up")
    || message.includes("timed out")
    || message.includes("econnreset")
  );
}

function isSafePreviewMimeType(mimeType: string): boolean {
  if (mimeType.startsWith("image/")) {
    return true;
  }

  if (mimeType.startsWith("text/")) {
    return true;
  }

  return SAFE_PREVIEW_MIME_TYPES.has(mimeType);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n"\\]/g, "_").trim() || "file";
}

function ensureExtension(fileName: string, extension: string): string {
  const normalizedName = sanitizeFilename(fileName);
  if (normalizedName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    return normalizedName;
  }

  return `${normalizedName}.${extension}`;
}

function resolveExportFormat(
  mimeType: string | null | undefined,
): { mimeType: string; extension: string } | null {
  if (!mimeType) {
    return null;
  }

  return GOOGLE_EXPORT_FORMATS[mimeType] ?? null;
}

function mapGoogleApiError(error: unknown): StreamRouteError | null {
  if (!isRecord(error)) {
    return null;
  }

  const response = isRecord(error.response) ? error.response : null;
  const statusCode =
    response && typeof response.status === "number" ? response.status : null;

  if (response && isRecord(response.data) && isRecord(response.data.error)) {
    const driveError = response.data.error;
    const errors = Array.isArray(driveError.errors) ? driveError.errors : [];

    for (const entry of errors) {
      if (!isRecord(entry)) {
        continue;
      }

      const reason =
        typeof entry.reason === "string" ? entry.reason.toLowerCase() : "";

      if (
        reason === "ratelimitexceeded" ||
        reason === "userratelimitexceeded" ||
        reason === "quotaexceeded" ||
        reason === "dailylimitexceeded"
      ) {
        return new StreamRouteError({
          status: 429,
          errorCode: "RATE_LIMITED",
          message: "Drive quota exceeded",
        });
      }

      if (
        reason === "filenotfound" ||
        reason === "teamdrivefilenotfound" ||
        reason === "notfound"
      ) {
        return new StreamRouteError({
          status: 404,
          errorCode: "FILE_NOT_FOUND",
          message: "File not found",
        });
      }

      if (
        reason === "forbidden" ||
        reason === "insufficientpermissions" ||
        reason === "cannotdownloadfile"
      ) {
        return new StreamRouteError({
          status: 403,
          errorCode: "FILE_ACCESS_DENIED",
          message: "File access denied",
        });
      }

      if (reason === "cannotexportfile") {
        return new StreamRouteError({
          status: 415,
          errorCode: "UNSUPPORTED_EXPORT",
          message: "File export is not supported",
        });
      }
    }
  }

  if (statusCode === 400) {
    return new StreamRouteError({
      status: 400,
      errorCode: "INVALID_FILE_ID",
      message: "Invalid file ID",
    });
  }

  if (statusCode === 403) {
    return new StreamRouteError({
      status: 403,
      errorCode: "FILE_ACCESS_DENIED",
      message: "File access denied",
    });
  }

  if (statusCode === 404) {
    return new StreamRouteError({
      status: 404,
      errorCode: "FILE_NOT_FOUND",
      message: "File not found",
    });
  }

  if (statusCode === 429) {
    return new StreamRouteError({
      status: 429,
      errorCode: "RATE_LIMITED",
      message: "Rate limit exceeded",
    });
  }

  return null;
}

function buildContentDisposition(
  fileName: string,
  mimeType: string,
): string {
  const safeName = sanitizeFilename(fileName);
  const encodedName = encodeURIComponent(safeName);
  const mode = isSafePreviewMimeType(mimeType) ? "inline" : "attachment";

  return `${mode}; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
}

function toErrorResponse(error: StreamRouteError): NextResponse {
  return NextResponse.json(
    {
      errorCode: error.errorCode,
      message: error.message,
    },
    {
      status: error.status,
      headers: {
        "Accept-Ranges": "none",
      },
    },
  );
}

function mapStreamError(error: unknown): NextResponse {
  if (error instanceof StreamRouteError) {
    return toErrorResponse(error);
  }

  if (isRateLimitError(error)) {
    return toErrorResponse(
      new StreamRouteError({
        status: 429,
        errorCode: "RATE_LIMITED",
        message: "Rate limit exceeded",
      }),
    );
  }

  if (error instanceof FileServiceError) {
    if (error.statusCode === 400) {
      return toErrorResponse(
        new StreamRouteError({
          status: 400,
          errorCode: "INVALID_FILE_ID",
          message: "Invalid file ID",
        }),
      );
    }

    if (error.statusCode === 403) {
      return toErrorResponse(
        new StreamRouteError({
          status: 403,
          errorCode: "FILE_ACCESS_DENIED",
          message: "File access denied",
        }),
      );
    }

    if (error.statusCode === 404) {
      return toErrorResponse(
        new StreamRouteError({
          status: 404,
          errorCode: "FILE_NOT_FOUND",
          message: "File not found",
        }),
      );
    }

    if (error.statusCode === 429) {
      return toErrorResponse(
        new StreamRouteError({
          status: 429,
          errorCode: "RATE_LIMITED",
          message: "Rate limit exceeded",
        }),
      );
    }
  }

  return toErrorResponse(
    new StreamRouteError({
      status: 500,
      errorCode: "INTERNAL_ERROR",
      message: "Internal error",
    }),
  );
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { fileId: routeFileId } = await params;
    const fileId = validateFileId(routeFileId);

    if (!fileId) {
      return toErrorResponse(
        new StreamRouteError({
          status: 400,
          errorCode: "INVALID_FILE_ID",
          message: "Invalid file ID",
        }),
      );
    }

    const ip = getClientIp(request);
    await enforceDriveRateLimit(ip);

    const raw = await fileService.getRawMetadata(fileId);
    const resolvedFileId = raw.resolvedFileId ?? fileId;

    if (raw.mimeType === "application/vnd.google-apps.folder") {
      throw new StreamRouteError({
        status: 400,
        errorCode: "UNSUPPORTED_FILE_TYPE",
        message: "Folders cannot be streamed",
      });
    }

    const drive = getDriveClient();
    const exportFormat = resolveExportFormat(raw.mimeType);
    const rangeHeader = request.headers.get("range");

    if (
      raw.mimeType.startsWith("application/vnd.google-apps.")
      && !exportFormat
    ) {
      throw new StreamRouteError({
        status: 415,
        errorCode: "UNSUPPORTED_EXPORT",
        message: "This Google file type cannot be exported",
      });
    }

    let streamData: Readable;
    let responseMimeType = raw.mimeType || "application/octet-stream";
    let responseFileName = raw.name;
    let responseStatus = 200;
    const headers = new Headers();

    if (exportFormat) {
      if (rangeHeader) {
        throw new StreamRouteError({
          status: 416,
          errorCode: "RANGE_NOT_SUPPORTED",
          message: "Byte ranges are not supported for exported Google files",
        });
      }

      const exportResponse = await drive.files.export(
        {
          fileId: resolvedFileId,
          mimeType: exportFormat.mimeType,
        },
        {
          responseType: "stream",
        },
      );

      if (!(exportResponse.data instanceof Readable)) {
        throw new StreamRouteError({
          status: 502,
          errorCode: "DRIVE_STREAM_UNAVAILABLE",
          message: "Drive export stream unavailable",
        });
      }

      streamData = exportResponse.data;
      responseMimeType = exportFormat.mimeType;
      responseFileName = ensureExtension(raw.name, exportFormat.extension);
    } else {
      const mediaResponse = await drive.files.get(
        {
          fileId: resolvedFileId,
          alt: "media",
          supportsAllDrives: true,
        },
        {
          responseType: "stream",
          headers: rangeHeader
            ? {
              Range: rangeHeader,
            }
            : undefined,
        },
      );

      if (!(mediaResponse.data instanceof Readable)) {
        throw new StreamRouteError({
          status: 502,
          errorCode: "DRIVE_STREAM_UNAVAILABLE",
          message: "Drive stream unavailable",
        });
      }

      streamData = mediaResponse.data;
      const statusCode =
        typeof mediaResponse.status === "number" ? mediaResponse.status : 200;
      if (statusCode === 206) {
        const contentRange = mediaResponse.headers?.["content-range"];
        if (typeof contentRange === "string" && contentRange.length > 0) {
          headers.set("Content-Range", contentRange);
        }

        const contentLength = mediaResponse.headers?.["content-length"];
        if (typeof contentLength === "string" && contentLength.length > 0) {
          headers.set("Content-Length", contentLength);
        }
      }
      responseStatus = statusCode;
    }

    const webStream = Readable.toWeb(streamData) as ReadableStream<Uint8Array>;

    headers.set("Content-Type", responseMimeType);
    headers.set(
      "Content-Disposition",
      buildContentDisposition(responseFileName, responseMimeType),
    );
    headers.set("Cache-Control", "private, max-age=60");
    headers.set("Accept-Ranges", exportFormat ? "none" : "bytes");

    if (
      !exportFormat
      && !headers.has("Content-Length")
      && Number.isFinite(raw.size)
      && raw.size > 0
    ) {
      headers.set("Content-Length", String(raw.size));
    }

    return new Response(webStream, {
      status: responseStatus,
      headers,
    });
  } catch (error) {
    const mapped = mapGoogleApiError(error);
    if (mapped) {
      return mapStreamError(mapped);
    }

    if (isUpstreamNetworkError(error)) {
      return toErrorResponse(
        new StreamRouteError({
          status: 503,
          errorCode: "UPSTREAM_UNAVAILABLE",
          message: "Drive upstream unavailable",
        }),
      );
    }

    console.error("File stream route error:", error);
    return mapStreamError(error);
  }
}
