import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { extractDriveFolderId } from "@/features/drive/drive.parser";
import { DriveService, DriveServiceError } from "@/features/drive/drive.service";
import { enforceDriveRateLimit } from "@/features/drive/drive.rateLimit";

export const runtime = "nodejs";

let driveService: DriveService | null = null;

function getDriveService(): DriveService {
  if (!driveService) {
    driveService = new DriveService();
  }
  return driveService;
}

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const directIp = (request as NextRequest & { ip?: string }).ip?.trim();

  return firstForwarded || realIp || directIp || "unknown";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = getRequestIp(request);
    await enforceDriveRateLimit(ip).catch(() => undefined);

    const body = (await request.json()) as { input?: string };
    const rawInput = body?.input?.trim() ?? "";

    if (!rawInput) {
      return NextResponse.json(
        { accessible: false, error: "Please enter a valid Google Drive link or Folder ID." },
        { status: 400 },
      );
    }

    const folderId = extractDriveFolderId(rawInput);
    if (!folderId) {
      return NextResponse.json(
        { accessible: false, error: "Could not extract a valid Google Drive folder ID from the input." },
        { status: 400 },
      );
    }

    const service = getDriveService();
    try {
      const metadata = await service.getFolderMetadata(folderId);
      return NextResponse.json({
        folderId: metadata.id,
        name: metadata.name,
        accessible: true,
      });
    } catch (error) {
      if (error instanceof DriveServiceError) {
        if (error.statusCode === 404) {
          return NextResponse.json(
            { accessible: false, error: "Folder not found. Ensure the folder link is correct." },
            { status: 404 },
          );
        }
        if (error.statusCode === 403) {
          return NextResponse.json(
            { accessible: false, error: "Access denied. Ensure the Google Drive folder link sharing is set to 'Anyone with the link can view'." },
            { status: 403 },
          );
        }
      }
      return NextResponse.json(
        { accessible: false, error: "Failed to access Google Drive folder." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Resolve route error:", error);
    return NextResponse.json(
      { accessible: false, error: "An unexpected error occurred while resolving the link." },
      { status: 500 },
    );
  }
}
