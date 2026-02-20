"use client";

import { useEffect, useState } from "react";

import { isOfflineV3Enabled } from "@/features/offline/offline.flags";
import {
  getFreshOrStale,
  putWithPolicy,
} from "@/features/offline/offline.query-cache.db";
import { QUERY_CACHE_KEYS } from "@/features/offline/offline.query-cache.keys";

export type CatalogIndexEntry = {
  id: string;
  name: string;
  availableSemesters: number[];
};

type IndexState = {
  departments: CatalogIndexEntry[];
  isLoading: boolean;
  error: string | null;
  source: "memory" | "cache" | "network" | null;
  isStale: boolean;
  lastUpdatedAt: number | null;
  isOfflineFallback: boolean;
};

type IndexMemoryEntry = {
  departments: CatalogIndexEntry[];
  updatedAt: number;
};

let cachedIndex: IndexMemoryEntry | null = null;
let inflightIndexPromise: Promise<CatalogIndexEntry[]> | null = null;

async function fetchIndex(): Promise<CatalogIndexEntry[]> {
  if (cachedIndex) return cachedIndex.departments;
  if (inflightIndexPromise) return inflightIndexPromise;

  inflightIndexPromise = fetch("/api/catalog/index", { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Index fetch failed (${res.status})`);
      return res.json() as Promise<{ departments: CatalogIndexEntry[] }>;
    })
    .then((data) => {
      const departments = Array.isArray(data.departments) ? data.departments : [];
      cachedIndex = {
        departments,
        updatedAt: Date.now(),
      };
      if (isOfflineV3Enabled()) {
        void putWithPolicy(QUERY_CACHE_KEYS.catalogIndex, { departments });
      }
      return departments;
    })
    .finally(() => {
      inflightIndexPromise = null;
    });

  return inflightIndexPromise;
}

export function useCatalogIndex(): IndexState {
  const [state, setState] = useState<IndexState>({
    departments: cachedIndex?.departments ?? [],
    isLoading: !cachedIndex,
    error: null,
    source: cachedIndex ? "memory" : null,
    isStale: false,
    lastUpdatedAt: cachedIndex?.updatedAt ?? null,
    isOfflineFallback: false,
  });

  useEffect(() => {
    let active = true;

    void (async () => {
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      const canUseOffline = isOfflineV3Enabled();

      if (cachedIndex && active) {
        setState({
          departments: cachedIndex.departments,
          isLoading: isOnline,
          error: null,
          source: "memory",
          isStale: false,
          lastUpdatedAt: cachedIndex.updatedAt,
          isOfflineFallback: !isOnline,
        });
      }

      let cacheDepartments: CatalogIndexEntry[] | null = null;
      let cacheUpdatedAt: number | null = null;
      let cacheIsStale = false;

      if (canUseOffline) {
        try {
          const cached = await getFreshOrStale<{ departments: CatalogIndexEntry[] }>(
            QUERY_CACHE_KEYS.catalogIndex,
          );
          if (cached.entry && Array.isArray(cached.entry.payload.departments)) {
            cacheDepartments = cached.entry.payload.departments;
            cacheUpdatedAt = cached.entry.updatedAt;
            cacheIsStale = cached.status === "stale";
          }
        } catch {
        }
      }

      if (!cachedIndex && cacheDepartments && active) {
        setState({
          departments: cacheDepartments,
          isLoading: isOnline,
          error: null,
          source: "cache",
          isStale: cacheIsStale,
          lastUpdatedAt: cacheUpdatedAt,
          isOfflineFallback: !isOnline,
        });
      }

      if (!isOnline) {
        if (!cachedIndex && !cacheDepartments && active) {
          setState({
            departments: [],
            isLoading: false,
            error: "You are offline.",
            source: null,
            isStale: false,
            lastUpdatedAt: null,
            isOfflineFallback: true,
          });
          return;
        }

        if (active) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
        return;
      }

      if (active) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        const departments = await fetchIndex();
        if (!active) {
          return;
        }

        setState({
          departments,
          isLoading: false,
          error: null,
          source: "network",
          isStale: false,
          lastUpdatedAt: Date.now(),
          isOfflineFallback: false,
        });
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        if (cachedIndex) {
          setState({
            departments: cachedIndex.departments,
            isLoading: false,
            error: null,
            source: "memory",
            isStale: true,
            lastUpdatedAt: cachedIndex.updatedAt,
            isOfflineFallback: true,
          });
          return;
        }

        if (cacheDepartments) {
          setState({
            departments: cacheDepartments,
            isLoading: false,
            error: null,
            source: "cache",
            isStale: true,
            lastUpdatedAt: cacheUpdatedAt,
            isOfflineFallback: true,
          });
          return;
        }

        setState({
          departments: [],
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load index",
          source: null,
          isStale: false,
          lastUpdatedAt: null,
          isOfflineFallback: false,
        });
      }
    })();

    return () => { active = false; };
  }, []);

  return state;
}
