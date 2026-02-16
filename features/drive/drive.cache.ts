import { redis } from "@/lib/redis.server";

import { isDriveFolderContents, type DriveFolderContents } from "./drive.types";

const DEFAULT_TTL_SECONDS = 600;

type MemoryCacheEntry = {
  value: DriveFolderContents;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();
const inFlightRequests = new Map<string, Promise<DriveFolderContents>>();

function getCacheKey(folderId: string, pageToken?: string): string {
  return `drive:${folderId}:${pageToken ?? "root"}`;
}

function getSafeTtl(ttlSeconds: number): number {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_TTL_SECONDS;
  }

  return ttlSeconds;
}

function cloneFolderContents(value: DriveFolderContents): DriveFolderContents {
  return {
    items: value.items.map((item) => ({ ...item })),
    nextPageToken: value.nextPageToken,
  };
}

export async function getCachedFolder(
  folderId: string,
  pageToken?: string,
): Promise<DriveFolderContents | null> {
  const key = getCacheKey(folderId, pageToken);

  try {
    const raw = await redis.get(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isDriveFolderContents(parsed)) {
        return cloneFolderContents(parsed);
      }
    }
  } catch {
  }

  const fallback = memoryCache.get(key);
  if (!fallback) {
    return null;
  }

  if (Date.now() >= fallback.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return cloneFolderContents(fallback.value);
}

export async function setCachedFolder(
  folderId: string,
  pageToken: string | undefined,
  value: DriveFolderContents,
  ttlSeconds: number,
): Promise<void> {
  const key = getCacheKey(folderId, pageToken);
  const ttl = getSafeTtl(ttlSeconds);
  const payload = JSON.stringify(value);

  memoryCache.set(key, {
    value: cloneFolderContents(value),
    expiresAt: Date.now() + ttl * 1000,
  });

  try {
    await redis.set(key, payload, "EX", ttl);
  } catch {
  }
}

export async function withFolderRequestDedup(
  folderId: string,
  pageToken: string | undefined,
  loader: () => Promise<DriveFolderContents>,
): Promise<DriveFolderContents> {
  const key = getCacheKey(folderId, pageToken);
  const activeRequest = inFlightRequests.get(key);

  if (activeRequest) {
    return activeRequest;
  }

  const requestPromise = loader().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}
