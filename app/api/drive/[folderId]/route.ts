import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  getCachedFolder,
  setCachedFolder,
  withFolderRequestDedup,
} from "@/features/drive/drive.cache";
import { enforceDriveRateLimit } from "@/features/drive/drive.rateLimit";
import { DriveService, DriveServiceError } from "@/features/drive/drive.service";
import type { DriveFolderContents } from "@/features/drive/drive.types";

export const runtime = "nodejs";

type RouteParams = {
  folderId: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const FOLDER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PAGE_TOKEN_PATTERN = /^[a-zA-Z0-9._-]{1,512}$/;
const DRIVE_CACHE_TTL_SECONDS = 600;

let driveService: DriveService | null = null;

function decodeParam(value: string): string | null {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return null;
  }
}

function validateFolderId(rawFolderId: string): string | null {
  const folderId = decodeParam(rawFolderId);

  if (!folderId) {
    return null;
  }

  if (!FOLDER_ID_PATTERN.test(folderId)) {
    return null;
  }

  if (folderId.length > 256) {
    return null;
  }

  return folderId;
}

function validatePageToken(rawPageToken: string | null): string | undefined {
  if (!rawPageToken) {
    return undefined;
  }

  const token = rawPageToken.trim();
  if (!token) {
    return undefined;
  }

  if (!PAGE_TOKEN_PATTERN.test(token)) {
    return undefined;
  }

  return token;
}

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const directIp = (request as NextRequest & { ip?: string }).ip?.trim();

  return firstForwarded || realIp || directIp || "unknown";
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === "Rate limit exceeded";
}

function getDriveService(): DriveService {
  if (driveService) {
    return driveService;
  }

  driveService = new DriveService();
  return driveService;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { folderId: routeFolderId } = await params;
    const folderId = validateFolderId(routeFolderId);

    if (!folderId) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const url = new URL(request.url);
    const pageToken = validatePageToken(url.searchParams.get("pageToken"));

    if (url.searchParams.get("pageToken") && !pageToken) {
      return NextResponse.json({ error: "Invalid page token" }, { status: 400 });
    }

    const ip = getRequestIp(request);

    try {
      await enforceDriveRateLimit(ip);
    } catch (error) {
      if (isRateLimitError(error)) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      throw error;
    }

    const cached = await getCachedFolder(folderId, pageToken);
    if (cached) {
      return NextResponse.json(cached);
    }

    const data = await withFolderRequestDedup(
      folderId,
      pageToken,
      async (): Promise<DriveFolderContents> => {
        const fresh = await getDriveService().listFolder(folderId, pageToken);
        await setCachedFolder(
          folderId,
          pageToken,
          fresh,
          DRIVE_CACHE_TTL_SECONDS,
        );
        return fresh;
      },
    );

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof DriveServiceError && error.statusCode === 429) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    console.error("Drive route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
