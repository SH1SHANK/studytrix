import { redis } from "@/lib/redis.server";

import type { FileMetadata } from "./file.types";

const ENV_TTL = Number.parseInt(process.env.FILE_METADATA_CACHE_TTL ?? "", 10);
const DEFAULT_TTL = Number.isInteger(ENV_TTL) && ENV_TTL > 0 ? ENV_TTL : 86_400;

type MemoryCacheEntry = {
  value: FileMetadata;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

function getCacheKey(fileId: string): string {
  return `filemeta:${fileId}`;
}

function cloneMetadata(value: FileMetadata): FileMetadata {
  return {
    ...value,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileMetadata(value: unknown): value is FileMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && value.name.length > 0
    && typeof value.mimeType === "string"
    && value.mimeType.length > 0
    && typeof value.size === "number"
    && Number.isFinite(value.size)
    && value.size >= 0
    && (value.modifiedTime === null || typeof value.modifiedTime === "string")
  );
}

function normalizeTtl(ttl: number): number {
  return Number.isInteger(ttl) && ttl > 0 ? ttl : DEFAULT_TTL;
}

export async function getCachedMetadata(
  fileId: string,
): Promise<FileMetadata | null> {
  const key = getCacheKey(fileId);

  try {
    const raw = await redis.get(key);

    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isFileMetadata(parsed)) {
        return cloneMetadata(parsed);
      }
    }
  } catch {
  }

  const memoryEntry = memoryCache.get(key);
  if (!memoryEntry) {
    return null;
  }

  if (Date.now() >= memoryEntry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return cloneMetadata(memoryEntry.value);
}

export async function setCachedMetadata(
  fileId: string,
  value: FileMetadata,
  ttl: number,
): Promise<void> {
  const key = getCacheKey(fileId);
  const safeTtl = normalizeTtl(ttl);
  const payload = JSON.stringify(value);

  memoryCache.set(key, {
    value: cloneMetadata(value),
    expiresAt: Date.now() + safeTtl * 1000,
  });

  try {
    await redis.set(key, payload, "EX", safeTtl);
  } catch {
  }
}

export { DEFAULT_TTL as DEFAULT_FILE_METADATA_CACHE_TTL };
