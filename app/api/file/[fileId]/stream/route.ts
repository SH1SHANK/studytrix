import "server-only";

import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { getDriveClient } from "@/lib/drive.client";
import { enforceDriveRateLimit } from "@/features/drive/drive.rateLimit";
import { FileService, FileServiceError } from "@/features/file/file.service";

export const runtime = "nodejs";

type RouteParams = {
  fileId: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const fileService = new FileService();

const SAFE_PREVIEW_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

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

function buildContentDisposition(
  fileName: string,
  mimeType: string,
): string {
  const safeName = sanitizeFilename(fileName);
  const encodedName = encodeURIComponent(safeName);
  const mode = isSafePreviewMimeType(mimeType) ? "inline" : "attachment";

  return `${mode}; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
}

function mapStreamError(error: unknown): NextResponse {
  if (isRateLimitError(error)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (error instanceof FileServiceError) {
    if (error.statusCode === 400) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    if (error.statusCode === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (error.statusCode === 429) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  }

  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { fileId: routeFileId } = await params;
    const fileId = validateFileId(routeFileId);

    if (!fileId) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    const ip = getClientIp(request);
    await enforceDriveRateLimit(ip);

    const raw = await fileService.getRawMetadata(fileId);

    const drive = getDriveClient();
    const mediaResponse = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
      },
    );

    if (!(mediaResponse.data instanceof Readable)) {
      throw new Error("Drive stream unavailable");
    }

    const webStream = Readable.toWeb(mediaResponse.data) as ReadableStream<Uint8Array>;

    const headers = new Headers();
    headers.set("Content-Type", raw.mimeType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      buildContentDisposition(raw.name, raw.mimeType),
    );
    headers.set("Cache-Control", "private, max-age=60");

    if (Number.isFinite(raw.size) && raw.size > 0) {
      headers.set("Content-Length", String(raw.size));
    }

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("File stream route error:", error);
    return mapStreamError(error);
  }
}
