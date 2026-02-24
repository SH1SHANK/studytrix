"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  PERSONAL_REPOSITORY_STORAGE_KEY,
  PERSONAL_REPOSITORY_SWATCHES,
  getPersonalRepositoryErrorMessage,
} from "./custom-folders.constants";
import type { CustomFolder, CustomFolderVerifyResponse } from "./custom-folders.types";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";

type CustomFolderPatch = Partial<Pick<CustomFolder, "label" | "colour" | "pinnedToTop">>;

type CustomFoldersStore = {
  folders: CustomFolder[];
  addFolder: (folder: CustomFolder) => void;
  removeFolder: (id: string) => void;
  clearAllFolders: () => void;
  renameFolder: (id: string, label: string) => void;
  updateFolder: (id: string, patch: CustomFolderPatch) => void;
  refreshFolder: (id: string) => Promise<void>;
  reorderFolders: (ids: string[]) => void;
};

function normalizeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "Untitled folder";
  }
  return trimmed.slice(0, 40);
}

function defaultSwatchValue(): string {
  return PERSONAL_REPOSITORY_SWATCHES[0]?.value ?? "hsl(var(--primary))";
}

function sanitizeFolder(folder: CustomFolder): CustomFolder {
  return {
    ...folder,
    label: normalizeLabel(folder.label),
    colour: folder.colour || defaultSwatchValue(),
  };
}

function sortFolders(folders: readonly CustomFolder[]): CustomFolder[] {
  return [...folders].sort((left, right) => {
    if (left.pinnedToTop !== right.pinnedToTop) {
      return left.pinnedToTop ? -1 : 1;
    }

    if (left.addedAt !== right.addedAt) {
      return right.addedAt - left.addedAt;
    }

    return left.label.localeCompare(right.label);
  });
}

function mergeFolder(existing: CustomFolder | undefined, incoming: CustomFolder): CustomFolder {
  if (!existing) {
    return sanitizeFolder(incoming);
  }

  return sanitizeFolder({
    ...existing,
    ...incoming,
    id: existing.id,
    addedAt: existing.addedAt,
  });
}

export const useCustomFoldersStore = create<CustomFoldersStore>()(persist(
  (set, get) => ({
    folders: [],

    addFolder: (folder) => {
      set((state) => {
        const existing = state.folders.find((entry) => entry.id === folder.id);
        const nextFolder = mergeFolder(existing, folder);
        const nextFolders = existing
          ? state.folders.map((entry) => (entry.id === folder.id ? nextFolder : entry))
          : [nextFolder, ...state.folders];
        return {
          folders: sortFolders(nextFolders),
        };
      });

      void useIntelligenceStore.getState().indexFolderSubtree(folder.id, {
        repoKind: "personal",
        folderName: folder.label,
        customFolderId: folder.id,
      });
    },

    removeFolder: (id) => {
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
      }));
    },

    clearAllFolders: () => {
      set({ folders: [] });
    },

    renameFolder: (id, label) => {
      const nextLabel = normalizeLabel(label);
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? { ...folder, label: nextLabel } : folder),
      }));
    },

    updateFolder: (id, patch) => {
      set((state) => ({
        folders: sortFolders(
          state.folders.map((folder) => {
            if (folder.id !== id) {
              return folder;
            }

            return {
              ...folder,
              ...patch,
              label: patch.label !== undefined ? normalizeLabel(patch.label) : folder.label,
              colour: patch.colour !== undefined ? patch.colour : folder.colour,
              pinnedToTop: patch.pinnedToTop ?? folder.pinnedToTop,
            };
          }),
        ),
      }));
    },

    refreshFolder: async (id) => {
      const folder = get().folders.find((entry) => entry.id === id);
      if (!folder) {
        return;
      }

      const response = await fetch("/api/custom-folders/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderId: id }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          errorCode?: string;
        };
        throw new Error(getPersonalRepositoryErrorMessage(body.errorCode ?? "DRIVE_ERROR"));
      }

      const payload = (await response.json()) as CustomFolderVerifyResponse;
      const now = Date.now();

      set((state) => ({
        folders: state.folders.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          return {
            ...entry,
            lastRefreshedAt: now,
            accessVerifiedAt: now,
            fileCount: payload.fileCount,
            folderCount: payload.folderCount,
          };
        }),
      }));

      await useIntelligenceStore.getState().indexFolderSubtree(id, {
        repoKind: "personal",
        folderName: folder.label,
        customFolderId: id,
      });
    },

    reorderFolders: (ids) => {
      set((state) => {
        const order = new Map<string, number>();
        ids.forEach((id, index) => {
          order.set(id, index);
        });

        const next = [...state.folders].sort((left, right) => {
          if (left.pinnedToTop !== right.pinnedToTop) {
            return left.pinnedToTop ? -1 : 1;
          }

          const leftOrder = order.get(left.id);
          const rightOrder = order.get(right.id);
          if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          if (leftOrder !== undefined && rightOrder === undefined) {
            return -1;
          }
          if (leftOrder === undefined && rightOrder !== undefined) {
            return 1;
          }

          return right.addedAt - left.addedAt;
        });

        return { folders: next };
      });
    },
  }),
  {
    name: PERSONAL_REPOSITORY_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ folders: state.folders }),
  },
));

export function getSortedPersonalFolders(folders: readonly CustomFolder[]): CustomFolder[] {
  return sortFolders(folders);
}
