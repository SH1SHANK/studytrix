"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type CatalogResponse, type Course } from "./catalog.types";

type CatalogState = {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
};

export function useCatalog(department: string, semester: number): CatalogState {
  const [state, setState] = useState<CatalogState>({
    courses: [],
    isLoading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchCatalog = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/catalog/${encodeURIComponent(department)}/${encodeURIComponent(String(semester))}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Request failed (${response.status})`,
        );
      }

      const data = (await response.json()) as CatalogResponse;

      if (!controller.signal.aborted) {
        setState({
          courses: data.courses ?? [],
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      if (!controller.signal.aborted) {
        setState({
          courses: [],
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load catalog",
        });
      }
    }
  }, [department, semester]);

  useEffect(() => {
    fetchCatalog();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchCatalog]);

  return state;
}
