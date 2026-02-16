import { redis } from "@/lib/redis.server";

import type { EnrichedFileMetadata, RichMetadata } from "./file.types";

const ENV_TTL = Number.parseInt(process.env.FILE_METADATA_CACHE_TTL ?? "", 10);
const DEFAULT_TTL = Number.isInteger(ENV_TTL) && ENV_TTL > 0 ? ENV_TTL : 86_400;

type MemoryCacheEntry = {
  value: EnrichedFileMetadata;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

function getCacheKey(fileId: string): string {
  return `filemeta:${fileId}`;
}

function cloneMetadata(value: EnrichedFileMetadata): EnrichedFileMetadata {
  return {
    ...value,
    enriched: value.enriched ? { ...value.enriched } : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRichMetadata(value: unknown): value is RichMetadata {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "other") {
    return true;
  }

  if (value.type === "pdf") {
    return typeof value.pageCount === "number" && Number.isInteger(value.pageCount) && value.pageCount > 0;
  }

  if (value.type === "ppt") {
    return typeof value.slideCount === "number" && Number.isInteger(value.slideCount) && value.slideCount > 0;
  }

  if (value.type === "image") {
    return (
      typeof value.width === "number" &&
      Number.isInteger(value.width) &&
      value.width > 0 &&
      typeof value.height === "number" &&
      Number.isInteger(value.height) &&
      value.height > 0
    );
  }

  return false;
}

function isEnrichedFileMetadata(value: unknown): value is EnrichedFileMetadata {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.mimeType !== "string" ||
    (value.extension !== null && typeof value.extension !== "string") ||
    typeof value.size !== "number" ||
    !Number.isFinite(value.size) ||
    value.size < 0 ||
    typeof value.sizeFormatted !== "string" ||
    (value.modifiedTime !== null && typeof value.modifiedTime !== "string")
  ) {
    return false;
  }

  if (value.enriched !== undefined && !isRichMetadata(value.enriched)) {
    return false;
  }

  return true;
}

function normalizeTtl(ttl: number): number {
  return Number.isInteger(ttl) && ttl > 0 ? ttl : DEFAULT_TTL;
}

export async function getCachedMetadata(
  fileId: string,
): Promise<EnrichedFileMetadata | null> {
  const key = getCacheKey(fileId);

  try {
    const raw = await redis.get(key);

    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isEnrichedFileMetadata(parsed)) {
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
  value: EnrichedFileMetadata,
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
