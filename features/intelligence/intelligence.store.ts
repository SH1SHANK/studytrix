"use client";

import { create } from "zustand";

import type { IntelligenceDuplicatePair, IntelligenceModelCatalog } from "./intelligence.types";

export type IntelligenceRuntimeStatus = "idle" | "loading" | "ready" | "error";

interface IntelligenceState {
  enabled: boolean;
  runtimeStatus: IntelligenceRuntimeStatus;
  cleanupRuntimeStatus: IntelligenceRuntimeStatus;
  indexing: boolean;
  indexedDocs: number;
  indexSize: number;
  lastIndexedAt: number | null;
  duplicates: Map<string, string>;
  activeModelId: string | null;
  embeddingDownloadPercent: number | null;
  embeddingDownloadLoadedBytes: number | null;
  embeddingDownloadTotalBytes: number | null;
  cleanupModelId: string | null;
  cleanupDownloadPercent: number | null;
  cleanupDownloadLoadedBytes: number | null;
  cleanupDownloadTotalBytes: number | null;
  resolvedAutoModelId: string | null;
  usingHashedFallback: boolean;
  lastError: string | null;
  cleanupLastError: string | null;
  catalog: IntelligenceModelCatalog | null;
  catalogLoadedAt: number | null;
  setEnabled: (enabled: boolean) => void;
  setRuntimeStatus: (status: IntelligenceRuntimeStatus, error?: string | null) => void;
  setCleanupRuntimeStatus: (status: IntelligenceRuntimeStatus, error?: string | null) => void;
  setIndexing: (indexing: boolean) => void;
  setIndexStats: (stats: { indexedDocs: number; lastIndexedAt: number | null }) => void;
  setDuplicates: (pairs: IntelligenceDuplicatePair[]) => void;
  clearDuplicates: () => void;
  setCleanupModelId: (modelId: string | null) => void;
  setEmbeddingDownloadProgress: (payload: {
    percent: number | null;
    loadedBytes: number | null;
    totalBytes: number | null;
  }) => void;
  setCleanupDownloadProgress: (payload: {
    percent: number | null;
    loadedBytes: number | null;
    totalBytes: number | null;
  }) => void;
  setModel: (params: { activeModelId: string | null; resolvedAutoModelId?: string | null; usingHashedFallback?: boolean }) => void;
  setCatalog: (catalog: IntelligenceModelCatalog | null) => void;
  reset: () => void;
}

const initialState = {
  enabled: false,
  runtimeStatus: "idle" as IntelligenceRuntimeStatus,
  cleanupRuntimeStatus: "idle" as IntelligenceRuntimeStatus,
  indexing: false,
  indexedDocs: 0,
  indexSize: 0,
  lastIndexedAt: null,
  duplicates: new Map<string, string>(),
  activeModelId: null,
  embeddingDownloadPercent: null,
  embeddingDownloadLoadedBytes: null,
  embeddingDownloadTotalBytes: null,
  cleanupModelId: null,
  cleanupDownloadPercent: null,
  cleanupDownloadLoadedBytes: null,
  cleanupDownloadTotalBytes: null,
  resolvedAutoModelId: null,
  usingHashedFallback: false,
  lastError: null,
  cleanupLastError: null,
  catalog: null,
  catalogLoadedAt: null,
};

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  ...initialState,

  setEnabled: (enabled) => {
    set({ enabled });
  },

  setRuntimeStatus: (runtimeStatus, error = null) => {
    set({
      runtimeStatus,
      lastError: runtimeStatus === "error" ? (error ?? "Unknown intelligence runtime error") : null,
    });
  },

  setCleanupRuntimeStatus: (cleanupRuntimeStatus, error = null) => {
    set((state) => ({
      cleanupRuntimeStatus,
      cleanupLastError:
        cleanupRuntimeStatus === "error"
          ? (error ?? "Unknown cleanup runtime error")
          : null,
      cleanupDownloadPercent:
        cleanupRuntimeStatus === "ready" ? 100 : state.cleanupDownloadPercent,
    }));
  },

  setIndexing: (indexing) => {
    set({ indexing });
  },

  setIndexStats: ({ indexedDocs, lastIndexedAt }) => {
    set({
      indexedDocs,
      indexSize: indexedDocs,
      lastIndexedAt,
    });
  },

  setDuplicates: (pairs) => {
    const map = new Map<string, string>();

    for (const pair of pairs) {
      if (!pair.fileIdA || !pair.fileIdB) {
        continue;
      }

      map.set(pair.fileIdA, pair.fileIdB);
      map.set(pair.fileIdB, pair.fileIdA);
    }

    set({ duplicates: map });
  },

  clearDuplicates: () => {
    set({ duplicates: new Map<string, string>() });
  },

  setCleanupModelId: (cleanupModelId) => {
    set({ cleanupModelId });
  },

  setEmbeddingDownloadProgress: ({ percent, loadedBytes, totalBytes }) => {
    set({
      embeddingDownloadPercent: percent,
      embeddingDownloadLoadedBytes: loadedBytes,
      embeddingDownloadTotalBytes: totalBytes,
    });
  },

  setCleanupDownloadProgress: ({ percent, loadedBytes, totalBytes }) => {
    set({
      cleanupDownloadPercent: percent,
      cleanupDownloadLoadedBytes: loadedBytes,
      cleanupDownloadTotalBytes: totalBytes,
    });
  },

  setModel: ({ activeModelId, resolvedAutoModelId, usingHashedFallback }) => {
    set((state) => ({
      activeModelId,
      resolvedAutoModelId: resolvedAutoModelId ?? state.resolvedAutoModelId,
      usingHashedFallback: usingHashedFallback ?? state.usingHashedFallback,
    }));
  },

  setCatalog: (catalog) => {
    set({
      catalog,
      catalogLoadedAt: catalog ? Date.now() : null,
    });
  },

  reset: () => {
    set({ ...initialState });
  },
}));
