"use client";

import { useEffect, useRef, useState } from "react";

import { isOfflineV3Enabled } from "@/features/offline/offline.flags";
import {
  getFreshOrStale,
  putWithPolicy,
} from "@/features/offline/offline.query-cache.db";
import { QUERY_CACHE_KEYS } from "@/features/offline/offline.query-cache.keys";

import { type DriveItem, isDriveFolder } from "./drive.types";

type DriveState = {
  items: DriveItem[];
  folders: DriveItem[];
  files: DriveItem[];
  isLoading: boolean;
  error: string | null;
  source: "memory" | "cache" | "network" | null;
  isStale: boolean;
  lastUpdatedAt: number | null;
  isOfflineFallback: boolean;
};

type DriveMemoryEntry = {
  items: DriveItem[];
  updatedAt: number;
};

const driveMemoryCache = new Map<string, DriveMemoryEntry>();
const driveInFlight = new Map<string, Promise<DriveItem[]>>();

function isUnavailableFolderId(folderId: string): boolean {
  return folderId.trim().toUpperCase().startsWith("UNAVAILABLE_");
}

function toDriveState(
  items: DriveItem[],
  options: {
    isLoading: boolean;
    error: string | null;
    source: "memory" | "cache" | "network" | null;
    isStale: boolean;
    lastUpdatedAt: number | null;
    isOfflineFallback: boolean;
  },
): DriveState {
  return {
    items,
    folders: items.filter(isDriveFolder),
    files: items.filter((item) => !isDriveFolder(item)),
    ...options,
  };
}

async function requestDriveFolder(folderId: string): Promise<DriveItem[]> {
  const active = driveInFlight.get(folderId);
  if (active) {
    return active;
  }

  const request = (async () => {
    const response = await fetch(
      `/api/drive/${encodeURIComponent(folderId)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Request failed (${response.status})`,
      );
    }

    const data = (await response.json()) as { items?: DriveItem[] };
    const items = Array.isArray(data.items) ? data.items : [];
    driveMemoryCache.set(folderId, {
      items,
      updatedAt: Date.now(),
    });

    if (isOfflineV3Enabled()) {
      await putWithPolicy(QUERY_CACHE_KEYS.driveFolderPage(folderId), { items });
    }

    return items;
  })().finally(() => {
    driveInFlight.delete(folderId);
  });

  driveInFlight.set(folderId, request);
  return request;
}

export function useDriveFolder(folderId: string | null): DriveState {
  const [state, setState] = useState<DriveState>(
    toDriveState([], {
      isLoading: !!folderId,
      error: null,
      source: null,
      isStale: false,
      lastUpdatedAt: null,
      isOfflineFallback: false,
    }),
  );

  const requestSeqRef = useRef(0);

  useEffect(() => {
    requestSeqRef.current += 1;
    const requestSeq = requestSeqRef.current;
    let isActive = true;

    if (!folderId) {
      setState(
        toDriveState([], {
          isLoading: false,
          error: null,
          source: null,
          isStale: false,
          lastUpdatedAt: null,
          isOfflineFallback: false,
        }),
      );
      return () => {
        isActive = false;
      };
    }

    if (isUnavailableFolderId(folderId)) {
      setState(
        toDriveState([], {
          isLoading: false,
          error: "This course folder is not available yet.",
          source: null,
          isStale: false,
          lastUpdatedAt: null,
          isOfflineFallback: false,
        }),
      );
      return () => {
        isActive = false;
      };
    }

    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    const canUseOffline = isOfflineV3Enabled();
    const memoryEntry = driveMemoryCache.get(folderId);

    void (async () => {
      let cacheItems: DriveItem[] | null = null;
      let cacheUpdatedAt: number | null = null;
      let cacheIsStale = false;

      if (memoryEntry && isActive && requestSeq === requestSeqRef.current) {
        setState(
          toDriveState(memoryEntry.items, {
            isLoading: isOnline,
            error: null,
            source: "memory",
            isStale: false,
            lastUpdatedAt: memoryEntry.updatedAt,
            isOfflineFallback: !isOnline,
          }),
        );
      }

      if (canUseOffline) {
        try {
          const cached = await getFreshOrStale<{ items: DriveItem[] }>(
            QUERY_CACHE_KEYS.driveFolderPage(folderId),
          );

          if (cached.entry && Array.isArray(cached.entry.payload.items)) {
            cacheItems = cached.entry.payload.items;
            cacheUpdatedAt = cached.entry.updatedAt;
            cacheIsStale = cached.status === "stale";
          }
        } catch {
        }
      }

      if (!memoryEntry && cacheItems && isActive && requestSeq === requestSeqRef.current) {
        setState(
          toDriveState(cacheItems, {
            isLoading: isOnline,
            error: null,
            source: "cache",
            isStale: cacheIsStale,
            lastUpdatedAt: cacheUpdatedAt,
            isOfflineFallback: !isOnline,
          }),
        );
      }

      if (!isOnline) {
        if (!memoryEntry && !cacheItems && isActive && requestSeq === requestSeqRef.current) {
          setState(
            toDriveState([], {
              isLoading: false,
              error: "You are offline.",
              source: null,
              isStale: false,
              lastUpdatedAt: null,
              isOfflineFallback: true,
            }),
          );
          return;
        }

        if (isActive && requestSeq === requestSeqRef.current) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
        return;
      }

      if (isActive && requestSeq === requestSeqRef.current) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        const items = await requestDriveFolder(folderId);
        if (!isActive || requestSeq !== requestSeqRef.current) {
          return;
        }

        setState(
          toDriveState(items, {
            isLoading: false,
            error: null,
            source: "network",
            isStale: false,
            lastUpdatedAt: Date.now(),
            isOfflineFallback: false,
          }),
        );
      } catch (err: unknown) {
        if (!isActive || requestSeq !== requestSeqRef.current) {
          return;
        }

        if (memoryEntry) {
          setState(
            toDriveState(memoryEntry.items, {
              isLoading: false,
              error: null,
              source: "memory",
              isStale: true,
              lastUpdatedAt: memoryEntry.updatedAt,
              isOfflineFallback: true,
            }),
          );
          return;
        }

        if (cacheItems) {
          setState(
            toDriveState(cacheItems, {
              isLoading: false,
              error: null,
              source: "cache",
              isStale: true,
              lastUpdatedAt: cacheUpdatedAt,
              isOfflineFallback: true,
            }),
          );
          return;
        }

        setState(
          toDriveState([], {
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to load folder",
            source: null,
            isStale: false,
            lastUpdatedAt: null,
            isOfflineFallback: false,
          }),
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [folderId]);

  return state;
}
