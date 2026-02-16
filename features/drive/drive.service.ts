import "server-only";

import type { drive_v3 } from "googleapis";

import { getGoogleDriveClient } from "@/lib/drive.server";

import {
  DRIVE_FOLDER_MIME,
  type DriveFolderContents,
  type DriveItem,
} from "./drive.types";

const MIN_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSize(value: string | null | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isDriveFileWithRequiredFields(
  file: drive_v3.Schema$File | undefined,
): file is drive_v3.Schema$File & {
  id: string;
  name: string;
  mimeType: string;
} {
  return Boolean(
    file &&
      typeof file.id === "string" &&
      file.id.length > 0 &&
      typeof file.name === "string" &&
      file.name.length > 0 &&
      typeof file.mimeType === "string" &&
      file.mimeType.length > 0,
  );
}

function toDriveItem(
  file: drive_v3.Schema$File & { id: string; name: string; mimeType: string },
): DriveItem {
  const isFolder = file.mimeType === DRIVE_FOLDER_MIME;

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: normalizeSize(file.size),
    modifiedTime: typeof file.modifiedTime === "string" ? file.modifiedTime : null,
    isFolder,
    webViewLink: typeof file.webViewLink === "string" ? file.webViewLink : null,
    iconLink: typeof file.iconLink === "string" ? file.iconLink : null,
  };
}

export class DriveServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DriveServiceError";
    this.statusCode = statusCode;
  }
}

function mapDriveError(error: unknown): DriveServiceError {
  if (!isRecord(error)) {
    return new DriveServiceError("Failed to list drive folder", 500);
  }

  const response = isRecord(error.response) ? error.response : null;
  const status =
    response && typeof response.status === "number" ? response.status : 500;

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
        reason === "quotaexceeded"
      ) {
        return new DriveServiceError("Drive quota exceeded", 429);
      }
    }
  }

  if (status === 429) {
    return new DriveServiceError("Drive quota exceeded", 429);
  }

  return new DriveServiceError("Failed to list drive folder", 500);
}

export class DriveService {
  private readonly drive = getGoogleDriveClient();

  async listFolder(
    folderId: string,
    pageToken?: string,
  ): Promise<DriveFolderContents> {
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, DEFAULT_PAGE_SIZE));

    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)",
        pageSize,
        pageToken,
        orderBy: "folder,name",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const files = Array.isArray(response.data.files) ? response.data.files : [];
      const items: DriveItem[] = files
        .filter(isDriveFileWithRequiredFields)
        .map(toDriveItem);

      const nextPageToken =
        typeof response.data.nextPageToken === "string" &&
        response.data.nextPageToken.length > 0
          ? response.data.nextPageToken
          : undefined;

      return { items, nextPageToken };
    } catch (error) {
      throw mapDriveError(error);
    }
  }
}
