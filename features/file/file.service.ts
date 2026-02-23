import "server-only";

import type { drive_v3 } from "googleapis";

import { getDriveClient } from "@/lib/drive.client";

import {
  DEFAULT_FILE_METADATA_CACHE_TTL,
  getCachedMetadata,
  setCachedMetadata,
} from "./file.cache";
import type { DriveFileRaw, FileMetadata } from "./file.types";

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
const MAX_SHORTCUT_DEPTH = 4;

export class FileServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "FileServiceError";
    this.statusCode = statusCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFileId(fileId: string): string {
  const trimmed = fileId.trim();
  if (!trimmed || !FILE_ID_PATTERN.test(trimmed) || trimmed.length > 256) {
    throw new FileServiceError("Invalid file ID", 400);
  }

  return trimmed;
}

function parseDriveSize(value: string | null | undefined): number {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function isValidDriveMetadata(
  data: drive_v3.Schema$File,
): data is drive_v3.Schema$File & {
  id: string;
  name: string;
  mimeType: string;
} {
  return (
    typeof data.id === "string"
    && data.id.length > 0
    && typeof data.name === "string"
    && data.name.length > 0
    && typeof data.mimeType === "string"
    && data.mimeType.length > 0
  );
}

function parseShortcutTargetId(data: drive_v3.Schema$File): string | null {
  const details =
    data.shortcutDetails && typeof data.shortcutDetails === "object"
      ? data.shortcutDetails
      : null;
  const targetId =
    details && typeof details.targetId === "string"
      ? details.targetId.trim()
      : "";

  if (!targetId || !FILE_ID_PATTERN.test(targetId) || targetId.length > 256) {
    return null;
  }

  return targetId;
}

function mapDriveError(error: unknown): FileServiceError {
  if (!isRecord(error)) {
    return new FileServiceError("Failed to access Drive file", 500);
  }

  const response = isRecord(error.response) ? error.response : null;
  const statusCode =
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
        reason === "ratelimitexceeded"
        || reason === "userratelimitexceeded"
        || reason === "quotaexceeded"
        || reason === "dailylimitexceeded"
      ) {
        return new FileServiceError("Drive quota exceeded", 429);
      }

      if (
        reason === "filenotfound"
        || reason === "teamdrivefilenotfound"
        || reason === "notfound"
      ) {
        return new FileServiceError("File not found", 404);
      }

      if (
        reason === "forbidden"
        || reason === "insufficientpermissions"
        || reason === "cannotdownloadfile"
      ) {
        return new FileServiceError("File access denied", 403);
      }
    }
  }

  if (statusCode === 404) {
    return new FileServiceError("File not found", 404);
  }

  if (statusCode === 403) {
    return new FileServiceError("File access denied", 403);
  }

  if (statusCode === 429) {
    return new FileServiceError("Drive quota exceeded", 429);
  }

  if (statusCode === 400) {
    return new FileServiceError("Invalid file ID", 400);
  }

  return new FileServiceError("Failed to access Drive file", 500);
}

const inFlightMetadata = new Map<string, Promise<FileMetadata>>();

export class FileService {
  private async fetchDriveMetadata(
    fileId: string,
  ): Promise<drive_v3.Schema$File> {
    const drive = getDriveClient();
    const response = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,size,modifiedTime,shortcutDetails(targetId,targetMimeType)",
      supportsAllDrives: true,
    });

    return response.data;
  }

  async getRawMetadata(fileId: string): Promise<DriveFileRaw> {
    const normalizedFileId = normalizeFileId(fileId);

    try {
      let depth = 0;
      let currentFileId = normalizedFileId;
      let data = await this.fetchDriveMetadata(currentFileId);
      const sourceMimeType =
        typeof data.mimeType === "string" ? data.mimeType : undefined;
      let resolvedFileId = normalizedFileId;
      let resolvedFromShortcut = false;
      const visitedFileIds = new Set<string>([normalizedFileId]);

      while (depth < MAX_SHORTCUT_DEPTH && data.mimeType === SHORTCUT_MIME) {
        const targetId = parseShortcutTargetId(data);
        if (!targetId) {
          throw new FileServiceError("Shortcut target not found", 404);
        }

        if (visitedFileIds.has(targetId)) {
          throw new FileServiceError("Shortcut resolution loop detected", 500);
        }

        visitedFileIds.add(targetId);
        currentFileId = targetId;
        resolvedFileId = targetId;
        resolvedFromShortcut = true;
        data = await this.fetchDriveMetadata(currentFileId);
        depth += 1;
      }

      if (depth >= MAX_SHORTCUT_DEPTH && data.mimeType === SHORTCUT_MIME) {
        throw new FileServiceError("Shortcut resolution depth exceeded", 500);
      }

      if (!isValidDriveMetadata(data)) {
        throw new FileServiceError("Invalid Drive metadata", 500);
      }

      return {
        id: normalizedFileId,
        name: data.name,
        mimeType: data.mimeType,
        size: parseDriveSize(data.size),
        modifiedTime:
          typeof data.modifiedTime === "string" ? data.modifiedTime : null,
        resolvedFileId: resolvedFromShortcut ? resolvedFileId : undefined,
        sourceMimeType: resolvedFromShortcut ? sourceMimeType : undefined,
      };
    } catch (error) {
      if (error instanceof FileServiceError) {
        throw error;
      }

      throw mapDriveError(error);
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata> {
    const normalizedFileId = normalizeFileId(fileId);

    const cached = await getCachedMetadata(normalizedFileId);
    if (cached) {
      return cached;
    }

    const active = inFlightMetadata.get(normalizedFileId);
    if (active) {
      return active;
    }

    const metadataPromise = this.getRawMetadata(normalizedFileId)
      .then(async (raw) => {
        await setCachedMetadata(
          normalizedFileId,
          raw,
          DEFAULT_FILE_METADATA_CACHE_TTL,
        );
        return raw;
      })
      .finally(() => {
        inFlightMetadata.delete(normalizedFileId);
      });

    inFlightMetadata.set(normalizedFileId, metadataPromise);
    return metadataPromise;
  }
}
