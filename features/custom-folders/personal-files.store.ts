"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PersonalFileRecord = {
  id: string;
  name: string;
  folderId: string;
  fullPath: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  source: "capture" | "upload" | "duplicate" | "move";
};

type PersonalFilesStore = {
  records: PersonalFileRecord[];
  upsertRecord: (record: PersonalFileRecord) => void;
  removeRecord: (fileId: string) => void;
  moveRecord: (fileId: string, targetFolderId: string, targetFullPath: string) => void;
  duplicateRecord: (input: {
    sourceFileId: string;
    nextFileId: string;
    nextName: string;
    nextFullPath: string;
  }) => void;
  setFileTags: (fileId: string, tags: string[]) => void;
  clearAll: () => void;
};

const STORE_KEY = "studytrix_personal_files";

function normalizeText(value: string): string {
  return value.trim();
}

function sanitizeRecord(record: PersonalFileRecord): PersonalFileRecord | null {
  const id = normalizeText(record.id);
  const folderId = normalizeText(record.folderId);
  const name = normalizeText(record.name) || id;
  const fullPath = normalizeText(record.fullPath) || name;
  if (!id || !folderId) {
    return null;
  }

  return {
    ...record,
    id,
    folderId,
    name,
    fullPath,
    mimeType: normalizeText(record.mimeType) || "application/octet-stream",
    size: Number.isFinite(record.size) && record.size >= 0 ? Math.floor(record.size) : 0,
    modifiedTime: record.modifiedTime ? normalizeText(record.modifiedTime) : null,
    createdAt: Number.isFinite(record.createdAt) ? Math.floor(record.createdAt) : Date.now(),
    updatedAt: Number.isFinite(record.updatedAt) ? Math.floor(record.updatedAt) : Date.now(),
    tags: Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : [],
  };
}

export const usePersonalFilesStore = create<PersonalFilesStore>()(persist(
  (set, get) => ({
    records: [],

    upsertRecord: (record) => {
      const sanitized = sanitizeRecord(record);
      if (!sanitized) {
        return;
      }

      set((state) => {
        const existingIndex = state.records.findIndex((entry) => entry.id === sanitized.id);
        if (existingIndex < 0) {
          return { records: [sanitized, ...state.records] };
        }

        const next = [...state.records];
        next[existingIndex] = {
          ...next[existingIndex],
          ...sanitized,
          createdAt: next[existingIndex].createdAt,
        };
        return { records: next };
      });
    },

    removeRecord: (fileId) => {
      const normalized = normalizeText(fileId);
      if (!normalized) {
        return;
      }
      set((state) => ({ records: state.records.filter((entry) => entry.id !== normalized) }));
    },

    moveRecord: (fileId, targetFolderId, targetFullPath) => {
      const normalizedId = normalizeText(fileId);
      const normalizedFolderId = normalizeText(targetFolderId);
      if (!normalizedId || !normalizedFolderId) {
        return;
      }

      set((state) => ({
        records: state.records.map((entry) => {
          if (entry.id !== normalizedId) {
            return entry;
          }

          return {
            ...entry,
            folderId: normalizedFolderId,
            fullPath: normalizeText(targetFullPath) || entry.fullPath,
            updatedAt: Date.now(),
            source: "move",
          };
        }),
      }));
    },

    duplicateRecord: ({ sourceFileId, nextFileId, nextName, nextFullPath }) => {
      const sourceId = normalizeText(sourceFileId);
      const newId = normalizeText(nextFileId);
      if (!sourceId || !newId) {
        return;
      }

      const source = get().records.find((entry) => entry.id === sourceId);
      if (!source) {
        return;
      }

      const now = Date.now();
      const duplicate: PersonalFileRecord = {
        ...source,
        id: newId,
        name: normalizeText(nextName) || `Copy of ${source.name}`,
        fullPath: normalizeText(nextFullPath) || source.fullPath,
        createdAt: now,
        updatedAt: now,
        source: "duplicate",
      };

      set((state) => ({ records: [duplicate, ...state.records] }));
    },

    setFileTags: (fileId, tags) => {
      const normalizedId = normalizeText(fileId);
      if (!normalizedId) {
        return;
      }

      const nextTags = tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      set((state) => ({
        records: state.records.map((entry) => (
          entry.id === normalizedId
            ? {
              ...entry,
              tags: nextTags,
              updatedAt: Date.now(),
            }
            : entry
        )),
      }));
    },

    clearAll: () => {
      set({ records: [] });
    },
  }),
  {
    name: STORE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ records: state.records }),
  },
));

