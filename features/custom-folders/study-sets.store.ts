"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type StudySet = {
  id: string;
  name: string;
  fileIds: string[];
  createdAt: number;
  colour: string;
};

type StudySetsStore = {
  sets: StudySet[];
  pickerFileId: string | null;
  openPicker: (fileId: string) => void;
  closePicker: () => void;
  createSet: (name: string) => string;
  addFileToSet: (setId: string, fileId: string) => void;
  removeFileFromSet: (setId: string, fileId: string) => void;
  reorderSetFiles: (setId: string, fileIds: string[]) => void;
  deleteSet: (setId: string) => void;
  renameSet: (setId: string, name: string) => void;
};

const STUDY_SET_STORAGE_KEY = "studytrix_study_sets";
const STUDY_SET_COLOURS = [
  "hsl(197 89% 48%)",
  "hsl(24 95% 53%)",
  "hsl(142 72% 40%)",
  "hsl(343 78% 51%)",
  "hsl(262 83% 58%)",
  "hsl(48 96% 53%)",
] as const;

function normalizeName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Untitled Set";
  }

  return trimmed.slice(0, 40);
}

function randomColour(): string {
  return STUDY_SET_COLOURS[Math.floor(Math.random() * STUDY_SET_COLOURS.length)] ?? "hsl(var(--primary))";
}

function createSetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `study_set_${crypto.randomUUID()}`;
  }

  return `study_set_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export const useStudySetsStore = create<StudySetsStore>()(persist(
  (set) => ({
    sets: [],
    pickerFileId: null,

    openPicker: (fileId) => {
      const normalized = fileId.trim();
      if (!normalized) {
        return;
      }

      set({ pickerFileId: normalized });
    },

    closePicker: () => {
      set({ pickerFileId: null });
    },

    createSet: (name) => {
      const nextId = createSetId();
      const now = Date.now();

      set((state) => ({
        sets: [
          {
            id: nextId,
            name: normalizeName(name),
            fileIds: [],
            createdAt: now,
            colour: randomColour(),
          },
          ...state.sets,
        ],
      }));

      return nextId;
    },

    addFileToSet: (setId, fileId) => {
      const normalizedFileId = fileId.trim();
      if (!normalizedFileId) {
        return;
      }

      set((state) => ({
        sets: state.sets.map((entry) => {
          if (entry.id !== setId) {
            return entry;
          }

          if (entry.fileIds.includes(normalizedFileId)) {
            return entry;
          }

          return {
            ...entry,
            fileIds: [...entry.fileIds, normalizedFileId],
          };
        }),
      }));
    },

    removeFileFromSet: (setId, fileId) => {
      set((state) => ({
        sets: state.sets.map((entry) => {
          if (entry.id !== setId) {
            return entry;
          }

          return {
            ...entry,
            fileIds: entry.fileIds.filter((id) => id !== fileId),
          };
        }),
      }));
    },

    reorderSetFiles: (setId, fileIds) => {
      set((state) => ({
        sets: state.sets.map((entry) => {
          if (entry.id !== setId) {
            return entry;
          }

          const existing = new Set(entry.fileIds);
          const ordered = fileIds.filter((id, index) => existing.has(id) && fileIds.indexOf(id) === index);
          for (const id of entry.fileIds) {
            if (!ordered.includes(id)) {
              ordered.push(id);
            }
          }

          return {
            ...entry,
            fileIds: ordered,
          };
        }),
      }));
    },

    deleteSet: (setId) => {
      set((state) => ({
        sets: state.sets.filter((entry) => entry.id !== setId),
      }));
    },

    renameSet: (setId, name) => {
      set((state) => ({
        sets: state.sets.map((entry) => (
          entry.id === setId
            ? {
              ...entry,
              name: normalizeName(name),
            }
            : entry
        )),
      }));
    },
  }),
  {
    name: STUDY_SET_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      sets: state.sets,
    }),
  },
));
