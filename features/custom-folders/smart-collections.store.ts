"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getIntelligenceClient } from "@/features/intelligence/intelligence.client";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import type { SmartCollection } from "./smart-collections.types";
import { SMART_COLLECTION_GENERIC_SEGMENTS } from "./smart-collections.constants";

type SmartCollectionsStore = {
  collections: SmartCollection[];
  lastGeneratedAt: number | null;
  isGenerating: boolean;
  generateCollections: () => Promise<void>;
  dismissCollection: (id: string) => void;
  pinCollection: (id: string) => void;
};

const SMART_COLLECTIONS_STORAGE_KEY = "studytrix_smart_collections";

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
}

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}

function pickCollectionName(paths: string[]): string {
  const frequency = new Map<string, number>();

  for (const path of paths) {
    const segments = path
      .split(">")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    for (const segment of segments.slice(0, -1)) {
      const normalized = segment.toLowerCase();
      if (SMART_COLLECTION_GENERIC_SEGMENTS.has(normalized)) {
        continue;
      }

      if (isNumeric(normalized)) {
        continue;
      }

      frequency.set(segment, (frequency.get(segment) ?? 0) + 1);
    }
  }

  if (frequency.size === 0) {
    return "Smart Collection";
  }

  const ranked = Array.from(frequency.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0]);
  });

  return ranked[0]?.[0] ?? "Smart Collection";
}

function mapCollectionsWithPreviousState(
  nextCollections: SmartCollection[],
  previous: SmartCollection[],
): SmartCollection[] {
  const previousByName = new Map(previous.map((collection) => [collection.name.toLowerCase(), collection]));

  return nextCollections.map((collection) => {
    const match = previousByName.get(collection.name.toLowerCase());
    if (!match) {
      return collection;
    }

    return {
      ...collection,
      dismissed: match.dismissed,
      pinned: match.pinned,
    };
  });
}

export const useSmartCollectionsStore = create<SmartCollectionsStore>()(persist(
  (set, get) => ({
    collections: [],
    lastGeneratedAt: null,
    isGenerating: false,

    generateCollections: async () => {
      if (get().isGenerating) {
        return;
      }

      const indexedEntries = useIntelligenceStore.getState().indexedEntries;
      const personalFiles = indexedEntries.filter((entry) => entry.repoKind === "personal" && !entry.isFolder);

      if (personalFiles.length < 9) {
        return;
      }

      set({ isGenerating: true });

      try {
        const fileIds = personalFiles.map((entry) => entry.fileId).sort((left, right) => left.localeCompare(right));
        const fileById = new Map(personalFiles.map((entry) => [entry.fileId, entry]));
        const k = Math.min(6, Math.floor(fileIds.length / 5));

        if (k <= 0) {
          return;
        }

        const clusterResult = await getIntelligenceClient().cluster({
          fileIds,
          k,
        });

        const now = Date.now();
        const previous = get().collections;

        const computed = clusterResult.clusters
          .map((cluster) => {
            const memberIds = cluster.memberIds
              .filter((memberId) => fileById.has(memberId));

            if (memberIds.length < 3) {
              return null;
            }

            const name = pickCollectionName(
              memberIds
                .map((memberId) => fileById.get(memberId)?.fullPath ?? "")
                .filter((path) => path.length > 0),
            );

            return {
              id: `smart_collection_${stableHash(name.toLowerCase())}`,
              name,
              fileIds: memberIds,
              fileCount: memberIds.length,
              generatedAt: now,
              dismissed: false,
              pinned: false,
              colourIndex: stableHash(name) % 6,
            } satisfies SmartCollection;
          })
          .filter((collection) => collection !== null) as SmartCollection[]
        ;

        const sortedComputed = computed
          .sort((left, right) => right.fileCount - left.fileCount)
          .slice(0, 5);

        const merged = mapCollectionsWithPreviousState(sortedComputed, previous)
          .sort((left, right) => {
            if (left.pinned !== right.pinned) {
              return left.pinned ? -1 : 1;
            }

            if (right.fileCount !== left.fileCount) {
              return right.fileCount - left.fileCount;
            }

            return left.name.localeCompare(right.name);
          });

        set({
          collections: merged,
          lastGeneratedAt: now,
        });
      } finally {
        set({ isGenerating: false });
      }
    },

    dismissCollection: (id) => {
      set((state) => ({
        collections: state.collections.map((collection) => (
          collection.id === id
            ? { ...collection, dismissed: true }
            : collection
        )),
      }));
    },

    pinCollection: (id) => {
      set((state) => ({
        collections: state.collections
          .map((collection) => (
            collection.id === id
              ? { ...collection, pinned: !collection.pinned }
              : collection
          ))
          .sort((left, right) => {
            if (left.pinned !== right.pinned) {
              return left.pinned ? -1 : 1;
            }

            if (right.fileCount !== left.fileCount) {
              return right.fileCount - left.fileCount;
            }

            return left.name.localeCompare(right.name);
          }),
      }));
    },
  }),
  {
    name: SMART_COLLECTIONS_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      collections: state.collections,
      lastGeneratedAt: state.lastGeneratedAt,
    }),
  },
));
