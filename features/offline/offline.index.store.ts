"use client";

import { create } from "zustand";

import { deleteFile, deleteSearchIndex, getAllFiles, getFile } from "./offline.db";

export type OfflineAvailability = {
  fileId: string;
  isOffline: boolean;
  updatedAt: number;
};

export type OfflineSnapshot = {
  offlineFiles: Record<string, boolean>;
  updatedAt: number;
};

type OfflineIndexState = {
  snapshot: OfflineSnapshot;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  refreshFile: (fileId: string) => Promise<boolean>;
  markOffline: (fileId: string) => void;
  markOnline: (fileId: string) => void;
  removeOffline: (fileId: string) => Promise<void>;
  isOffline: (fileId: string) => boolean;
};

function withTimestamp(snapshot: Record<string, boolean>): OfflineSnapshot {
  return {
    offlineFiles: snapshot,
    updatedAt: Date.now(),
  };
}

export const useOfflineIndexStore = create<OfflineIndexState>((set, get) => ({
  snapshot: withTimestamp({}),
  hydrated: false,

  hydrate: async () => {
    const files = await getAllFiles();
    const next: Record<string, boolean> = {};

    for (const file of files) {
      next[file.fileId] = true;
    }

    set({
      snapshot: withTimestamp(next),
      hydrated: true,
    });
  },

  refreshFile: async (fileId: string) => {
    const record = await getFile(fileId);
    const isOffline = Boolean(record);

    set((state) => {
      const next = { ...state.snapshot.offlineFiles };
      if (isOffline) {
        next[fileId] = true;
      } else {
        delete next[fileId];
      }

      return {
        snapshot: withTimestamp(next),
      };
    });

    return isOffline;
  },

  markOffline: (fileId: string) => {
    set((state) => ({
      snapshot: withTimestamp({
        ...state.snapshot.offlineFiles,
        [fileId]: true,
      }),
    }));
  },

  markOnline: (fileId: string) => {
    set((state) => {
      const next = { ...state.snapshot.offlineFiles };
      delete next[fileId];

      return {
        snapshot: withTimestamp(next),
      };
    });
  },

  removeOffline: async (fileId: string) => {
    await deleteFile(fileId);
    await deleteSearchIndex(fileId);
    get().markOnline(fileId);
  },

  isOffline: (fileId: string) => {
    return Boolean(get().snapshot.offlineFiles[fileId]);
  },
}));

void useOfflineIndexStore.getState().hydrate();

export function markOfflineAvailability(fileId: string): void {
  useOfflineIndexStore.getState().markOffline(fileId);
}

export function clearOfflineAvailability(fileId: string): void {
  useOfflineIndexStore.getState().markOnline(fileId);
}
