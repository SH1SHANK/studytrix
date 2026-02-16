import "server-only";

import type { drive_v3 } from "googleapis";

import { getDriveClient } from "@/lib/drive.client";

import {
  DEFAULT_FILE_METADATA_CACHE_TTL,
  getCachedMetadata,
  setCachedMetadata,
} from "./file.cache";
import { enrichMetadata } from "./file.enrich";
import type { DriveFileRaw, EnrichedFileMetadata } from "./file.types";

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

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
    typeof data.id === "string" &&
    data.id.length > 0 &&
    typeof data.name === "string" &&
    data.name.length > 0 &&
    typeof data.mimeType === "string" &&
    data.mimeType.length > 0
  );
}

function mapDriveError(error: unknown): FileServiceError {
  if (!isRecord(error)) {
    return new FileServiceError("Failed to access Drive file", 500);
  }

  const response = isRecord(error.response) ? error.response : null;
  const statusCode =
    response && typeof response.status === "number" ? response.status : 500;

  if (statusCode === 404) {
    return new FileServiceError("File not found", 404);
  }

  if (statusCode === 403 || statusCode === 429) {
    return new FileServiceError("Drive quota exceeded", 429);
  }

  return new FileServiceError("Failed to access Drive file", 500);
}

const inFlightEnrichment = new Map<string, Promise<EnrichedFileMetadata>>();

export class FileService {
  async getRawMetadata(fileId: string): Promise<DriveFileRaw> {
    const normalizedFileId = normalizeFileId(fileId);

    try {
      const drive = getDriveClient();
      const response = await drive.files.get({
        fileId: normalizedFileId,
        fields: "id,name,mimeType,size,modifiedTime",
        supportsAllDrives: true,
      });

      const data = response.data;

      if (!isValidDriveMetadata(data)) {
        throw new FileServiceError("Invalid Drive metadata", 500);
      }

      return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        size: parseDriveSize(data.size),
        modifiedTime:
          typeof data.modifiedTime === "string" ? data.modifiedTime : null,
      };
    } catch (error) {
      if (error instanceof FileServiceError) {
        throw error;
      }

      throw mapDriveError(error);
    }
  }

  async getEnrichedMetadata(fileId: string): Promise<EnrichedFileMetadata> {
    const normalizedFileId = normalizeFileId(fileId);

    const cached = await getCachedMetadata(normalizedFileId);
    if (cached) {
      return cached;
    }

    const active = inFlightEnrichment.get(normalizedFileId);
    if (active) {
      return active;
    }

    const enrichmentPromise = (async (): Promise<EnrichedFileMetadata> => {
      const raw = await this.getRawMetadata(normalizedFileId);
      const enriched = await enrichMetadata(normalizedFileId, raw);
      await setCachedMetadata(
        normalizedFileId,
        enriched,
        DEFAULT_FILE_METADATA_CACHE_TTL,
      );
      return enriched;
    })().finally(() => {
      inFlightEnrichment.delete(normalizedFileId);
    });

    inFlightEnrichment.set(normalizedFileId, enrichmentPromise);
    return enrichmentPromise;
  }
}
