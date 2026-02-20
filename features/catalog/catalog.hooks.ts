"use client";

import { useEffect, useRef, useState } from "react";

import { isOfflineV3Enabled } from "@/features/offline/offline.flags";
import {
  getFreshOrStale,
  putWithPolicy,
} from "@/features/offline/offline.query-cache.db";
import { QUERY_CACHE_KEYS } from "@/features/offline/offline.query-cache.keys";

import { type CatalogResponse, type Course } from "./catalog.types";

type CatalogState = {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
  source: "memory" | "cache" | "network" | null;
  isStale: boolean;
  lastUpdatedAt: number | null;
  isOfflineFallback: boolean;
};

type UseCatalogOptions = {
  enabled?: boolean;
};

type CatalogMemoryEntry = {
  data: CatalogResponse;
  updatedAt: number;
};

const catalogResponseCache = new Map<string, CatalogMemoryEntry>();
const catalogInFlight = new Map<string, Promise<CatalogResponse>>();

function getCatalogCacheKey(department: string, semester: number): string {
  return `${department.toUpperCase()}::${semester}`;
}

async function requestCatalog(
  department: string,
  semester: number,
): Promise<CatalogResponse> {
  const key = getCatalogCacheKey(department, semester);

  const existingRequest = catalogInFlight.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const response = await fetch(
      `/api/catalog/${encodeURIComponent(department)}/${encodeURIComponent(String(semester))}`,
      { cache: "force-cache" },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ??
          `Request failed (${response.status})`,
      );
    }

    const data = (await response.json()) as CatalogResponse;
    const normalized: CatalogResponse = {
      courses: Array.isArray(data.courses) ? data.courses : [],
    };

    catalogResponseCache.set(key, {
      data: normalized,
      updatedAt: Date.now(),
    });

    if (isOfflineV3Enabled()) {
      await putWithPolicy(
        QUERY_CACHE_KEYS.catalogSemester(department, semester),
        normalized,
      );
    }

    return normalized;
  })().finally(() => {
    catalogInFlight.delete(key);
  });

  catalogInFlight.set(key, requestPromise);
  return requestPromise;
}

export function useCatalog(
  department: string,
  semester: number,
  options?: UseCatalogOptions,
): CatalogState {
  const enabled = options?.enabled ?? true;

  const [state, setState] = useState<CatalogState>({
    courses: [],
    isLoading: enabled,
    error: null,
    source: null,
    isStale: false,
    lastUpdatedAt: null,
    isOfflineFallback: false,
  });

  const requestSeqRef = useRef(0);

  useEffect(() => {
    requestSeqRef.current += 1;
    const requestSeq = requestSeqRef.current;

    if (!enabled) {
      queueMicrotask(() => {
        if (requestSeq === requestSeqRef.current) {
          setState({
            courses: [],
            isLoading: false,
            error: null,
            source: null,
            isStale: false,
            lastUpdatedAt: null,
            isOfflineFallback: false,
          });
        }
      });
      return;
    }

    if (!Number.isInteger(semester) || semester < 1) {
      queueMicrotask(() => {
        if (requestSeq === requestSeqRef.current) {
          setState({
            courses: [],
            isLoading: false,
            error: "Invalid semester",
            source: null,
            isStale: false,
            lastUpdatedAt: null,
            isOfflineFallback: false,
          });
        }
      });
      return;
    }

    let isActive = true;
    const key = getCatalogCacheKey(department, semester);
    const canUseOffline = isOfflineV3Enabled();
    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    const memoryEntry = catalogResponseCache.get(key);

    void (async () => {
      let cachedEntry: Awaited<ReturnType<typeof getFreshOrStale<CatalogResponse>>>["entry"] = null;
      let cachedStatus: "fresh" | "stale" | "expired" | "miss" = "miss";

      if (memoryEntry && isActive && requestSeq === requestSeqRef.current) {
        setState({
          courses: memoryEntry.data.courses,
          isLoading: isOnline,
          error: null,
          source: "memory",
          isStale: false,
          lastUpdatedAt: memoryEntry.updatedAt,
          isOfflineFallback: !isOnline,
        });
      }

      if (canUseOffline) {
        try {
          const cached = await getFreshOrStale<CatalogResponse>(
            QUERY_CACHE_KEYS.catalogSemester(department, semester),
          );
          cachedEntry = cached.entry;
          cachedStatus = cached.status;
        } catch {
          cachedEntry = null;
          cachedStatus = "miss";
        }
      }

      if (!memoryEntry && cachedEntry && isActive && requestSeq === requestSeqRef.current) {
        setState({
          courses: cachedEntry.payload.courses,
          isLoading: isOnline,
          error: null,
          source: "cache",
          isStale: cachedStatus === "stale",
          lastUpdatedAt: cachedEntry.updatedAt,
          isOfflineFallback: !isOnline,
        });
      }

      if (!isOnline) {
        if (!memoryEntry && !cachedEntry && isActive && requestSeq === requestSeqRef.current) {
          setState({
            courses: [],
            isLoading: false,
            error: "You are offline.",
            source: null,
            isStale: false,
            lastUpdatedAt: null,
            isOfflineFallback: true,
          });
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
        const data = await requestCatalog(department, semester);
        if (!isActive || requestSeq !== requestSeqRef.current) {
          return;
        }

        setState({
          courses: data.courses,
          isLoading: false,
          error: null,
          source: "network",
          isStale: false,
          lastUpdatedAt: Date.now(),
          isOfflineFallback: false,
        });
      } catch (err: unknown) {
        if (!isActive || requestSeq !== requestSeqRef.current) {
          return;
        }

        if (memoryEntry) {
          setState({
            courses: memoryEntry.data.courses,
            isLoading: false,
            error: null,
            source: "memory",
            isStale: true,
            lastUpdatedAt: memoryEntry.updatedAt,
            isOfflineFallback: true,
          });
          return;
        }

        if (cachedEntry) {
          setState({
            courses: cachedEntry.payload.courses,
            isLoading: false,
            error: null,
            source: "cache",
            isStale: true,
            lastUpdatedAt: cachedEntry.updatedAt,
            isOfflineFallback: true,
          });
          return;
        }

        setState({
          courses: [],
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load catalog",
          source: null,
          isStale: false,
          lastUpdatedAt: null,
          isOfflineFallback: false,
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [department, enabled, semester]);

  return state;
}
