"use client";

import { getFile, getMetadata, setMetadata } from "@/features/offline/offline.db";
import { isOfflineV3Enabled } from "@/features/offline/offline.flags";
import {
  getFreshOrStale,
  putWithPolicy,
} from "@/features/offline/offline.query-cache.db";
import { QUERY_CACHE_KEYS } from "@/features/offline/offline.query-cache.keys";

const DOWNLOAD_META_PREFIX = "download-meta:";

export type ClientFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
  updatedAt: number;
};

type MetadataResolution = {
  metadata: ClientFileMetadata | null;
  source: "query-cache" | "download-meta" | "offline-blob" | "network" | "none";
  isStale: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function normalizeMetadata(value: unknown, fallbackId: string): ClientFileMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = parseString(value.id) ?? fallbackId;
  const name = parseString(value.name) ?? id;
  const mimeType = parseString(value.mimeType) ?? "application/octet-stream";
  const modifiedTime = parseString(value.modifiedTime);
  const size = parseSize(value.size);
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : Date.now();

  return {
    id,
    name,
    mimeType,
    size,
    modifiedTime,
    updatedAt,
  };
}

function metadataKey(fileId: string): string {
  return `${DOWNLOAD_META_PREFIX}${fileId}`;
}

async function readDownloadMeta(fileId: string): Promise<ClientFileMetadata | null> {
  const record = await getMetadata(metadataKey(fileId));
  if (!record) {
    return null;
  }

  try {
    return normalizeMetadata(JSON.parse(record.value), fileId);
  } catch {
    return null;
  }
}

export async function writeDownloadMeta(
  fileId: string,
  metadata: Omit<ClientFileMetadata, "updatedAt"> & { updatedAt?: number },
): Promise<void> {
  const payload: ClientFileMetadata = {
    ...metadata,
    id: metadata.id || fileId,
    updatedAt: metadata.updatedAt ?? Date.now(),
  };

  await setMetadata({
    key: metadataKey(fileId),
    value: JSON.stringify(payload),
  });
}

async function fetchNetworkMetadata(
  fileId: string,
  signal?: AbortSignal,
): Promise<ClientFileMetadata | null> {
  try {
    const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/metadata`, {
      method: "GET",
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || !isRecord(payload.metadata)) {
      return null;
    }

    const normalized = normalizeMetadata(payload.metadata, fileId);
    if (!normalized) {
      return null;
    }

    normalized.updatedAt = Date.now();
    await writeDownloadMeta(fileId, normalized);

    if (isOfflineV3Enabled()) {
      await putWithPolicy(QUERY_CACHE_KEYS.fileMetadata(fileId), normalized);
    }

    return normalized;
  } catch {
    return null;
  }
}

export async function getFileMetadataWithCache(
  fileId: string,
  options?: {
    allowNetwork?: boolean;
    signal?: AbortSignal;
  },
): Promise<MetadataResolution> {
  const allowNetwork = options?.allowNetwork ?? true;
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  if (isOfflineV3Enabled()) {
    try {
      const cached = await getFreshOrStale<ClientFileMetadata>(
        QUERY_CACHE_KEYS.fileMetadata(fileId),
      );
      if (cached.entry) {
        return {
          metadata: cached.entry.payload,
          source: "query-cache",
          isStale: cached.status === "stale",
        };
      }
    } catch {
    }
  }

  const canonical = await readDownloadMeta(fileId);
  if (canonical) {
    return {
      metadata: canonical,
      source: "download-meta",
      isStale: false,
    };
  }

  const offlineBlob = await getFile(fileId);
  if (offlineBlob) {
    const fallback: ClientFileMetadata = {
      id: fileId,
      name: fileId,
      mimeType:
        parseString(offlineBlob.mimeType)
        ?? parseString(offlineBlob.blob.type)
        ?? "application/octet-stream",
      size: parseSize(offlineBlob.size) || parseSize(offlineBlob.blob.size),
      modifiedTime: offlineBlob.modifiedTime,
      updatedAt: offlineBlob.cachedAt,
    };
    await writeDownloadMeta(fileId, fallback);
    return {
      metadata: fallback,
      source: "offline-blob",
      isStale: true,
    };
  }

  if (!allowNetwork || !isOnline) {
    return {
      metadata: null,
      source: "none",
      isStale: true,
    };
  }

  const network = await fetchNetworkMetadata(fileId, options?.signal);
  if (network) {
    return {
      metadata: network,
      source: "network",
      isStale: false,
    };
  }

  return {
    metadata: null,
    source: "none",
    isStale: true,
  };
}
