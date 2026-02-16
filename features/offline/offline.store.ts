"use client";

import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { offlineService } from "./offline.service";
import type {
  CacheFileMetadata,
  DownloadProgress,
  DownloadRules,
  FetchStreamFn,
  StorageStats,
} from "./offline.types";

type OfflineState = {
  offlineFiles: Record<string, boolean>;
  downloading: Record<string, DownloadProgress>;
  storageStats: StorageStats | null;
  rules: DownloadRules;
};

type OfflineActions = {
  setRules: (rules: DownloadRules) => void;
  startDownload: (
    fileId: string,
    metadata: CacheFileMetadata,
    fetchStream: FetchStreamFn,
  ) => Promise<void>;
  removeOffline: (fileId: string) => Promise<void>;
  refreshStorage: () => Promise<void>;
  isOffline: (fileId: string) => boolean;
  hydrateOfflineFiles: () => Promise<void>;
};

export type OfflineStore = OfflineState & OfflineActions;

const defaultRules: DownloadRules = {};

export const offlineStore = createStore<OfflineStore>((set, get) => ({
  offlineFiles: {},
  downloading: {},
  storageStats: null,
  rules: defaultRules,

  setRules: (rules) => {
    set({ rules: { ...rules } });
  },

  startDownload: async (fileId, metadata, fetchStream) => {
    const { rules } = get();

    set((state) => ({
      downloading: {
        ...state.downloading,
        [fileId]: {
          fileId,
          loaded: 0,
          total: metadata.size,
          percent: 0,
        },
      },
    }));

    await offlineService.cacheFile(fileId, metadata, fetchStream, rules);

    set((state) => {
      const nextDownloading = { ...state.downloading };
      delete nextDownloading[fileId];

      return {
        downloading: nextDownloading,
        offlineFiles: {
          ...state.offlineFiles,
          [fileId]: true,
        },
      };
    });

    await get().refreshStorage();
  },

  removeOffline: async (fileId) => {
    await offlineService.removeFile(fileId);

    set((state) => {
      const nextOfflineFiles = { ...state.offlineFiles };
      delete nextOfflineFiles[fileId];

      const nextDownloading = { ...state.downloading };
      delete nextDownloading[fileId];

      return {
        offlineFiles: nextOfflineFiles,
        downloading: nextDownloading,
      };
    });

    await get().refreshStorage();
  },

  refreshStorage: async () => {
    const stats = await offlineService.getStorageStats();
    set({ storageStats: stats });
  },

  isOffline: (fileId) => {
    return Boolean(get().offlineFiles[fileId]);
  },

  hydrateOfflineFiles: async () => {
    const files = await offlineService.listCachedFiles();

    const next: Record<string, boolean> = {};
    for (const file of files) {
      next[file.fileId] = true;
    }

    set({ offlineFiles: next });
    await get().refreshStorage();
  },
}));

offlineService.onProgress((progress) => {
  offlineStore.setState((state) => ({
    downloading: {
      ...state.downloading,
      [progress.fileId]: progress,
    },
  }));
});

offlineService.onComplete((fileId, success) => {
  offlineStore.setState((state) => {
    const nextDownloading = { ...state.downloading };
    delete nextDownloading[fileId];

    const nextOfflineFiles = { ...state.offlineFiles };
    if (success) {
      nextOfflineFiles[fileId] = true;
    }

    return {
      downloading: nextDownloading,
      offlineFiles: nextOfflineFiles,
    };
  });

  void offlineStore.getState().refreshStorage();
});

void offlineStore.getState().hydrateOfflineFiles();

export function useOfflineStore<T>(
  selector: (state: OfflineStore) => T,
): T {
  return useStore(offlineStore, selector);
}
