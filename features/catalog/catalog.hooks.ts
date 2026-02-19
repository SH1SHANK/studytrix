"use client";

import { useEffect, useRef, useState } from "react";

import { type CatalogResponse, type Course } from "./catalog.types";

type CatalogState = {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
};

type UseCatalogOptions = {
  enabled?: boolean;
};

const catalogResponseCache = new Map<string, CatalogResponse>();
const catalogInFlight = new Map<string, Promise<CatalogResponse>>();

function getCatalogCacheKey(department: string, semester: number): string {
  return `${department.toUpperCase()}::${semester}`;
}

async function requestCatalog(
  department: string,
  semester: number,
): Promise<CatalogResponse> {
  const key = getCatalogCacheKey(department, semester);

  const cached = catalogResponseCache.get(key);
  if (cached) {
    return cached;
  }

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

    catalogResponseCache.set(key, normalized);
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
          });
        }
      });
      return;
    }

    let isActive = true;
    queueMicrotask(() => {
      if (isActive && requestSeq === requestSeqRef.current) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }
    });

    void requestCatalog(department, semester)
      .then((data) => {
        if (!isActive || requestSeq !== requestSeqRef.current) {
          return;
        }

        setState({
          courses: data.courses,
          isLoading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (!isActive || requestSeq !== requestSeqRef.current) {
          return;
        }

        setState({
          courses: [],
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load catalog",
        });
      });

    return () => {
      isActive = false;
    };
  }, [department, enabled, semester]);

  return state;
}
