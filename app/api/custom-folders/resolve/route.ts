import "server-only";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DRIVE_FOLDER_ID_PATTERN = /^[a-zA-Z0-9_-]{25,50}$/;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function decodeFid(rawFid: string | null): string | null {
  if (!rawFid) {
    return null;
  }

  const normalized = rawFid.trim();
  if (!normalized || !BASE64_URL_PATTERN.test(normalized)) {
    return null;
  }

  const padded = normalized
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const decoded = Buffer.from(padded, "base64").toString("utf8").trim();
    if (!DRIVE_FOLDER_ID_PATTERN.test(decoded)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fid = request.nextUrl.searchParams.get("fid");
  const folderId = decodeFid(fid);

  if (!folderId) {
    return NextResponse.json({ error: "INVALID_LINK" }, { status: 400 });
  }

  return NextResponse.json({ folderId });
}
