import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { drive_v3 } from "googleapis";

import { getGoogleDriveClient } from "@/lib/drive.server";
import type {
  CustomFolderPermissionLevel,
  CustomFolderVerifyErrorCode,
  CustomFolderVerifyResponse,
} from "@/features/custom-folders/custom-folders.types";
import { DRIVE_FOLDER_ID_PATTERN } from "@/features/custom-folders/custom-folders.constants";
import { DRIVE_FOLDER_MIME } from "@/features/drive/drive.types";

export const runtime = "nodejs";

const SERVER_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;
const LIST_PAGE_SIZE = 200;
const MAX_COUNT_SCAN = 5_000;
const OWNER_DOMAIN_BLOCKLIST = new Set([
  "temporarymail.com",
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
]);

const EXECUTABLE_NAME_PATTERN = /\.(exe|msi|bat|cmd|js|vbs|ps1|scr)$/i;
const PHISHING_KEYWORD_PATTERN = /(verify account|urgent login|bank update|crypto giveaway|exam leak|password reset)/i;
const MISLEADING_KEYWORD_PATTERN = /(official|verified|support|urgent|security|admin|exam leak)/i;

type VerifyRequestBody = {
  folderId?: unknown;
};

type RouteError = {
  status: number;
  errorCode: CustomFolderVerifyErrorCode;
  message: string;
};

function parseFolderId(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  const normalized = rawValue.trim();
  if (!normalized) {
    return null;
  }

  if (!SERVER_FOLDER_ID_PATTERN.test(normalized)) {
    return null;
  }

  if (!DRIVE_FOLDER_ID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function extractOwnerDomain(file: drive_v3.Schema$File): string {
  const email = file.owners?.[0]?.emailAddress?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return "unknown";
  }

  return email.split("@")[1] ?? "unknown";
}

function resolvePermissionLevel(file: drive_v3.Schema$File): CustomFolderPermissionLevel {
  const canListChildren = file.capabilities?.canListChildren;
  if (canListChildren === false) {
    return "none";
  }

  if (file.capabilities?.canEdit === true) {
    return "write";
  }

  const roles = (file.permissions ?? [])
    .map((entry) => entry.role?.toLowerCase().trim())
    .filter((value): value is string => Boolean(value));

  if (roles.some((role) => role === "owner" || role === "organizer" || role === "writer")) {
    return "write";
  }

  if (canListChildren === true || roles.some((role) => role === "reader" || role === "commenter")) {
    return "read";
  }

  return "none";
}

async function listTopLevelCounts(folderId: string): Promise<{ fileCount: number; folderCount: number }> {
  const drive = getGoogleDriveClient();
  let pageToken: string | undefined;
  let scanned = 0;
  let fileCount = 0;
  let folderCount = 0;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,mimeType)",
      pageSize: LIST_PAGE_SIZE,
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const files = Array.isArray(response.data.files) ? response.data.files : [];
    for (const item of files) {
      scanned += 1;
      if (item.mimeType === DRIVE_FOLDER_MIME) {
        folderCount += 1;
      } else {
        fileCount += 1;
      }

      if (scanned >= MAX_COUNT_SCAN) {
        return { fileCount, folderCount };
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return { fileCount, folderCount };
}

function runSafetyCheck(input: {
  folderName: string;
  ownerDomain: string;
  createdTime: string | undefined;
}): string[] {
  const flags: string[] = [];
  const name = input.folderName.trim();
  const ownerDomain = input.ownerDomain.trim().toLowerCase();

  if (EXECUTABLE_NAME_PATTERN.test(name)) {
    flags.push("name_contains_executable_pattern");
  }

  if (PHISHING_KEYWORD_PATTERN.test(name)) {
    flags.push("name_contains_phishing_keywords");
  }

  if (OWNER_DOMAIN_BLOCKLIST.has(ownerDomain)) {
    flags.push("owner_domain_blocklisted");
  }

  if (input.createdTime) {
    const createdAtMs = Date.parse(input.createdTime);
    if (Number.isFinite(createdAtMs)) {
      const ageMs = Date.now() - createdAtMs;
      if (ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000 && MISLEADING_KEYWORD_PATTERN.test(name)) {
        flags.push("recent_folder_with_misleading_name");
      }
    }
  }

  return flags;
}

function toRouteError(error: unknown): RouteError {
  const fallback: RouteError = {
    status: 502,
    errorCode: "DRIVE_ERROR",
    message: "Couldn't reach Google Drive. Check your connection and try again.",
  };

  if (!(error && typeof error === "object")) {
    return fallback;
  }

  const response = (error as { response?: unknown }).response;
  const status = typeof (response as { status?: unknown })?.status === "number"
    ? ((response as { status: number }).status)
    : 500;
  const reason = String(
    (response as { data?: { error?: { errors?: Array<{ reason?: string }> } } })?.data?.error?.errors?.[0]?.reason
      ?? "",
  ).toLowerCase();

  if (status === 404 || reason === "filenotfound" || reason === "notfound") {
    return {
      status: 404,
      errorCode: "FOLDER_NOT_FOUND",
      message: "This folder doesn't exist or has been deleted.",
    };
  }

  if (status === 403 || reason === "forbidden" || reason === "insufficientpermissions") {
    return {
      status: 403,
      errorCode: "ACCESS_DENIED",
      message: "Access denied. Share the folder with 'Anyone with the link' and try again.",
    };
  }

  if (status === 400 || reason === "invalid" || reason === "invalidparameter") {
    return {
      status: 400,
      errorCode: "INVALID_ID",
      message: "This doesn't appear to be a valid Drive folder.",
    };
  }

  return fallback;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      {
        errorCode: "INVALID_ID" satisfies CustomFolderVerifyErrorCode,
        message: "This doesn't appear to be a valid Drive folder.",
      },
      { status: 400 },
    );
  }

  const folderId = parseFolderId(body.folderId);
  if (!folderId) {
    return NextResponse.json(
      {
        errorCode: "INVALID_ID" satisfies CustomFolderVerifyErrorCode,
        message: "This doesn't appear to be a valid Drive folder.",
      },
      { status: 400 },
    );
  }

  try {
    const drive = getGoogleDriveClient();
    const folderResponse = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType,createdTime,owners(emailAddress),permissions(role,type),capabilities(canListChildren,canEdit)",
      supportsAllDrives: true,
    });

    const folder = folderResponse.data;
    if (folder.mimeType !== DRIVE_FOLDER_MIME) {
      return NextResponse.json(
        {
          errorCode: "INVALID_ID" satisfies CustomFolderVerifyErrorCode,
          message: "This doesn't appear to be a valid Drive folder.",
        },
        { status: 400 },
      );
    }

    const permissionLevel = resolvePermissionLevel(folder);
    const accessible = permissionLevel !== "none";
    const ownerDomain = extractOwnerDomain(folder);
    const createdTime = typeof folder.createdTime === "string" ? folder.createdTime : new Date(0).toISOString();

    const { fileCount, folderCount } = accessible
      ? await listTopLevelCounts(folderId)
      : { fileCount: 0, folderCount: 0 };
    const folderName = folder.name?.trim() || "Untitled folder";
    const safetyFlags = runSafetyCheck({
      folderName,
      ownerDomain,
      createdTime,
    });

    const payload: CustomFolderVerifyResponse = {
      accessible,
      permissionLevel,
      name: folderName,
      fileCount,
      folderCount,
      ownerDomain,
      createdTime,
      safetyFlags,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const mapped = toRouteError(error);
    return NextResponse.json(
      {
        errorCode: mapped.errorCode,
        message: mapped.message,
      },
      { status: mapped.status },
    );
  }
}
