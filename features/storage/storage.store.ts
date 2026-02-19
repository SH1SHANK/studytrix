import { create } from "zustand";

import {
  computeTotalStats,
  groupByCourse,
  groupByMime,
  largestFiles,
} from "./storage.analytics";
import { getIntegrityIssues, revalidateRecord } from "./storage.integrity";
import {
  auditOfflineIndexOnce,
  clearAllOffline,
  deleteOfflineRecords,
  getOfflineRecords,
  getQuotaEstimate,
} from "./storage.service";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import type {
  CourseStorage,
  MimeBreakdown,
  OfflineRecord,
  StorageStats,
} from "./storage.types";

const LARGEST_FILES_LIMIT = 10;

interface DerivedDashboard {
  stats: StorageStats;
  courseStorage: CourseStorage[];
  largestFiles: OfflineRecord[];
  mimeBreakdown: MimeBreakdown[];
}

function buildDerived(records: OfflineRecord[], quota: { quota: number | null; usage: number | null }): DerivedDashboard {
  const totals = computeTotalStats(records);

  const stats: StorageStats = {
    totalFiles: totals.totalFiles,
    totalBytes: totals.totalBytes,
    quotaBytes: quota.quota,
    usageBytes: quota.usage,
  };

  return {
    stats,
    courseStorage: groupByCourse(records),
    largestFiles: largestFiles(records, LARGEST_FILES_LIMIT),
    mimeBreakdown: groupByMime(records),
  };
}

function appendError(existing: string[], message: string): string[] {
  if (existing.includes(message)) {
    return existing;
  }

  return [...existing, message];
}

export interface StorageStoreState {
  records: OfflineRecord[];
  stats: StorageStats | null;
  courseStorage: CourseStorage[];
  largestFiles: OfflineRecord[];
  mimeBreakdown: MimeBreakdown[];
  loading: boolean;
  errors: string[];
  loadDashboard: () => Promise<void>;
  deleteRecords: (ids: string[]) => Promise<void>;
  clearAll: () => Promise<void>;
  revalidateCorrupted: () => Promise<void>;
}

export const useStorageStore = create<StorageStoreState>((set, get) => ({
  records: [],
  stats: null,
  courseStorage: [],
  largestFiles: [],
  mimeBreakdown: [],
  loading: false,
  errors: [],

  loadDashboard: async () => {
    set({ loading: true });
    void auditOfflineIndexOnce().catch(() => undefined);

    try {
      const [records, quota] = await Promise.all([
        getOfflineRecords(),
        getQuotaEstimate(),
      ]);

      const derived = buildDerived(records, quota);

      set({
        records,
        stats: derived.stats,
        courseStorage: derived.courseStorage,
        largestFiles: derived.largestFiles,
        mimeBreakdown: derived.mimeBreakdown,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load storage dashboard", error);
      set((state) => ({
        loading: false,
        errors: appendError(state.errors, "Failed to load storage dashboard"),
      }));
    }
  },

  deleteRecords: async (ids: string[]) => {
    const normalized = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (normalized.length === 0) {
      return;
    }

    set({ loading: true });

    try {
      await deleteOfflineRecords(normalized);
      await useOfflineIndexStore.getState().hydrate();
      await get().loadDashboard();
    } catch (error) {
      console.error("Failed to delete selected records", error);
      set((state) => ({
        loading: false,
        errors: appendError(state.errors, "Failed to delete selected records"),
      }));
    }
  },

  clearAll: async () => {
    set({ loading: true });

    try {
      await clearAllOffline();
      await useOfflineIndexStore.getState().hydrate();
      const quota = await getQuotaEstimate();
      const derived = buildDerived([], quota);

      set({
        records: [],
        stats: derived.stats,
        courseStorage: [],
        largestFiles: [],
        mimeBreakdown: [],
        loading: false,
      });
    } catch (error) {
      console.error("Failed to clear offline storage", error);
      set((state) => ({
        loading: false,
        errors: appendError(state.errors, "Failed to clear offline storage"),
      }));
    }
  },

  revalidateCorrupted: async () => {
    const currentRecords = get().records;
    const issues = getIntegrityIssues(currentRecords);
    const candidates = [...issues.corrupted, ...issues.partial];

    if (candidates.length === 0) {
      return;
    }

    set({ loading: true });

    try {
      const revalidated = await Promise.all(
        candidates.map((record) => revalidateRecord(record)),
      );

      const byId = new Map(currentRecords.map((record) => [record.id, record]));
      for (const record of revalidated) {
        byId.set(record.id, record);
      }

      const nextRecords = Array.from(byId.values());
      const quota = await getQuotaEstimate();
      const derived = buildDerived(nextRecords, quota);

      set({
        records: nextRecords,
        stats: derived.stats,
        courseStorage: derived.courseStorage,
        largestFiles: derived.largestFiles,
        mimeBreakdown: derived.mimeBreakdown,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to revalidate offline records", error);
      set((state) => ({
        loading: false,
        errors: appendError(state.errors, "Failed to revalidate offline records"),
      }));
    }
  },
}));
