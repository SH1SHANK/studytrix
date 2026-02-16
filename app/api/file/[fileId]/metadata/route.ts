import "server-only";

import { NextRequest, NextResponse } from "next/server";

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

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { fileId: routeFileId } = await params;
    const fileId = validateFileId(routeFileId);

    if (!fileId) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    const ip = getClientIp(request);
    await enforceDriveRateLimit(ip);

    const metadata = await fileService.getEnrichedMetadata(fileId);

    return NextResponse.json({ metadata }, { status: 200 });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (error instanceof FileServiceError && error.statusCode === 400) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    console.error("File metadata route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
