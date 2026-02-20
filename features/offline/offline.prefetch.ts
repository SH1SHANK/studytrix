"use client";

import { getFileMetadataWithCache } from "@/features/file/file-metadata.client";
import { isOfflineV3Enabled } from "@/features/offline/offline.flags";

const PREFETCH_COUNT = 3;
const MIN_STORAGE_HEADROOM = 0.15;
const BLOCKED_NETWORK_TYPES = new Set(["slow-2g", "2g"]);

function canUseNetworkPrefetch(): boolean {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return false;
  }

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  }).connection;

  if (connection?.saveData) {
    return false;
  }

  if (connection?.effectiveType && BLOCKED_NETWORK_TYPES.has(connection.effectiveType)) {
    return false;
  }

  return true;
}

async function hasEnoughStorageHeadroom(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return true;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = typeof estimate.quota === "number" ? estimate.quota : 0;
    const usage = typeof estimate.usage === "number" ? estimate.usage : 0;
    if (!quota || quota <= 0) {
      return true;
    }

    const headroom = (quota - usage) / quota;
    return headroom >= MIN_STORAGE_HEADROOM;
  } catch {
    return true;
  }
}

export function autoPrefetch(
  currentFileId: string,
  siblingFileIds: string[],
): void {
  if (!isOfflineV3Enabled()) {
    return;
  }

  void (async () => {
    if (!canUseNetworkPrefetch()) {
      return;
    }

    const hasHeadroom = await hasEnoughStorageHeadroom();
    if (!hasHeadroom) {
      return;
    }

    const uniqueSiblings = Array.from(new Set(siblingFileIds));
    const currentIndex = uniqueSiblings.indexOf(currentFileId);

    if (currentIndex === -1) {
      return;
    }

    const candidates = uniqueSiblings.slice(
      currentIndex + 1,
      currentIndex + 1 + PREFETCH_COUNT,
    );

    await Promise.all(
      candidates.map(async (fileId) => {
        await getFileMetadataWithCache(fileId, { allowNetwork: true });
      }),
    );
  })();
}
