"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useStorageStore } from "@/features/storage/storage.store";
import { auditOfflineIndexOnce } from "@/features/storage/storage.service";

export function useStorageDashboard() {
  const records = useStorageStore((state) => state.records);
  const stats = useStorageStore((state) => state.stats);
  const courseStorage = useStorageStore((state) => state.courseStorage);
  const largestFiles = useStorageStore((state) => state.largestFiles);
  const mimeBreakdown = useStorageStore((state) => state.mimeBreakdown);
  const loading = useStorageStore((state) => state.loading);
  const errors = useStorageStore((state) => state.errors);

  const loadDashboard = useStorageStore((state) => state.loadDashboard);
  const deleteRecords = useStorageStore((state) => state.deleteRecords);
  const clearAll = useStorageStore((state) => state.clearAll);
  const revalidateCorrupted = useStorageStore((state) => state.revalidateCorrupted);

  useEffect(() => {
    void auditOfflineIndexOnce().catch(() => undefined);
    void loadDashboard();
  }, [loadDashboard]);

  const deleteOld = useCallback(
    async (notAccessedSince: number) => {
      if (!Number.isFinite(notAccessedSince)) {
        return;
      }

      const ids = records
        .filter((record) => record.lastAccessedAt < notAccessedSince)
        .map((record) => record.id);

      await deleteRecords(ids);
    },
    [deleteRecords, records],
  );

  const deletePrefetchOnly = useCallback(async () => {
    const ids = records
      .filter((record) => record.source === "prefetch")
      .map((record) => record.id);

    await deleteRecords(ids);
  }, [deleteRecords, records]);

  return useMemo(
    () => ({
      records,
      stats,
      courseStorage,
      largestFiles,
      mimeBreakdown,
      loading,
      errors,
      deleteRecords,
      clearAll,
      revalidateCorrupted,
      refresh: loadDashboard,
      deleteOld,
      deletePrefetchOnly,
    }),
    [
      clearAll,
      courseStorage,
      deleteOld,
      deletePrefetchOnly,
      deleteRecords,
      errors,
      largestFiles,
      loading,
      mimeBreakdown,
      records,
      revalidateCorrupted,
      loadDashboard,
      stats,
    ],
  );
}
