"use client";

import { useCallback } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { BulkDeletePanel } from "@/components/storage/BulkDeletePanel";
import { CourseStorageTable } from "@/components/storage/CourseStorageTable";
import { IntegrityStatusCard } from "@/components/storage/IntegrityStatusCard";
import { LargestFilesList } from "@/components/storage/LargestFilesList";
import { StorageBreakdownChart } from "@/components/storage/StorageBreakdownChart";
import { StorageInfographics } from "@/components/storage/StorageInfographics";
import { StorageLayout } from "@/components/storage/StorageLayout";
import { StorageOverviewCard } from "@/components/storage/StorageOverviewCard";
import { StorageQuotaIndicator } from "@/components/storage/StorageQuotaIndicator";
import { getIntegrityIssues } from "@/features/storage/storage.integrity";
import { exportStorageSummary } from "@/features/storage/storage.service";
import { useStorageDashboard } from "@/ui/hooks/useStorageDashboard";

export default function StoragePage() {
  const {
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
    refresh,
    deleteOld,
    deletePrefetchOnly,
  } = useStorageDashboard();

  const issues = getIntegrityIssues(records);

  const handleExportSummary = useCallback(async () => {
    const json = await exportStorageSummary();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `storage-summary-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }, []);

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-8 sm:px-5 sm:pt-5">
        <StorageLayout
          loading={loading}
          onRefresh={() => {
            void refresh();
          }}
          onExportSummary={() => {
            void handleExportSummary();
          }}
        >
          {loading && records.length === 0 ? <p>Loading storage dashboard...</p> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <StorageOverviewCard
              stats={stats}
              loading={loading}
              hasErrors={errors.length > 0}
            />

            <StorageQuotaIndicator
              quotaBytes={stats?.quotaBytes ?? null}
              usageBytes={stats?.usageBytes ?? null}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StorageBreakdownChart breakdown={mimeBreakdown} />
            <StorageInfographics records={records} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LargestFilesList
              files={largestFiles}
              onDelete={async (id) => {
                await deleteRecords([id]);
              }}
            />

            <CourseStorageTable courses={courseStorage} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BulkDeletePanel
              corruptedCount={issues.corrupted.length}
              onDeleteAll={async () => {
                await clearAll();
              }}
              onDeleteOld={deleteOld}
              onDeletePrefetchOnly={deletePrefetchOnly}
              onClearCorrupted={async () => {
                await deleteRecords(issues.corrupted.map((record) => record.id));
              }}
            />

            <IntegrityStatusCard
              corruptedCount={issues.corrupted.length}
              partialCount={issues.partial.length}
              loading={loading}
              onRevalidateCorrupted={revalidateCorrupted}
            />
          </div>

          {errors.length > 0 ? (
            <section
              aria-labelledby="storage-errors-title"
              className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/70 dark:bg-rose-950/20"
            >
              <h2
                id="storage-errors-title"
                className="text-sm font-semibold text-rose-700 dark:text-rose-300"
              >
                Errors
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-rose-700 dark:text-rose-300">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </StorageLayout>
      </div>
    </AppShell>
  );
}
