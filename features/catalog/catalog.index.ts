"use client";

import { useEffect, useState } from "react";

export type CatalogIndexEntry = {
  id: string;
  name: string;
  availableSemesters: number[];
};

type IndexState = {
  departments: CatalogIndexEntry[];
  isLoading: boolean;
  error: string | null;
};

let cachedIndex: CatalogIndexEntry[] | null = null;
let inflightIndexPromise: Promise<CatalogIndexEntry[]> | null = null;

async function fetchIndex(): Promise<CatalogIndexEntry[]> {
  if (cachedIndex) return cachedIndex;
  if (inflightIndexPromise) return inflightIndexPromise;

  inflightIndexPromise = fetch("/api/catalog/index", { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Index fetch failed (${res.status})`);
      return res.json() as Promise<{ departments: CatalogIndexEntry[] }>;
    })
    .then((data) => {
      cachedIndex = Array.isArray(data.departments) ? data.departments : [];
      return cachedIndex;
    })
    .finally(() => {
      inflightIndexPromise = null;
    });

  return inflightIndexPromise;
}

export function useCatalogIndex(): IndexState {
  const [state, setState] = useState<IndexState>({
    departments: cachedIndex ?? [],
    isLoading: !cachedIndex,
    error: null,
  });

  useEffect(() => {
    if (cachedIndex) {
      setState({ departments: cachedIndex, isLoading: false, error: null });
      return;
    }

    let active = true;
    fetchIndex()
      .then((departments) => {
        if (active) setState({ departments, isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            departments: [],
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to load index",
          });
        }
      });

    return () => { active = false; };
  }, []);

  return state;
}
