"use client";

import { useCallback } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { OfflineRuntimeDiagnostics } from "@/components/offline/OfflineRuntimeDiagnostics";
import { BulkDeletePanel } from "@/components/storage/BulkDeletePanel";
import { CourseStorageTable } from "@/components/storage/CourseStorageTable";
import { IntegrityStatusCard } from "@/components/storage/IntegrityStatusCard";
import { LargestFilesList } from "@/components/storage/LargestFilesList";
import { StorageBreakdownChart } from "@/components/storage/StorageBreakdownChart";
import { StorageInfographics } from "@/components/storage/StorageInfographics";
import { StorageLayout } from "@/components/storage/StorageLayout";
import { StorageOverviewCard } from "@/components/storage/StorageOverviewCard";
import { StorageQuotaIndicator } from "@/components/storage/StorageQuotaIndicator";
import { StorageLocationCard } from "@/components/storage/StorageLocationCard";
import { getIntegrityIssues } from "@/features/storage/storage.integrity";
import { exportStorageSummary } from "@/features/storage/storage.service";
import { useStorageDashboard } from "@/ui/hooks/useStorageDashboard";
import { useSetting } from "@/ui/hooks/useSettings";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
      {children}
    </h2>
  );
}

export default function StoragePage() {
  const [compactMode] = useSetting("compact_mode");
  const isCompact = compactMode === true;
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
    <AppShell headerTitle="Storage" hideHeaderFilters={true}>
      <div className={cn("px-4 sm:px-5", isCompact ? "pt-3 pb-6 sm:pt-4" : "pt-4 pb-8 sm:pt-5")}>
        <StorageLayout
          loading={loading}
          onRefresh={() => {
            void refresh();
          }}
          onExportSummary={() => {
            void handleExportSummary();
          }}
        >
          {loading && records.length === 0 ? <p className="text-sm text-muted-foreground">Loading storage data...</p> : null}

          {/* ── Overview ──────────────────────────────────────── */}
          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Overview</SectionLabel>
            <StorageOverviewCard
              stats={stats}
              loading={loading}
              hasErrors={errors.length > 0}
            />
          </section>

          {/* ── Storage Location ──────────────────────────────── */}
          <section className={cn(isCompact ? "space-y-3" : "space-y-4")}>
            <StorageLocationCard />
            <OfflineRuntimeDiagnostics compact={isCompact} />
          </section>

          {/* ── Quota & Breakdown ─────────────────────────────── */}
          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Quota &amp; Breakdown</SectionLabel>
            <div className={cn("grid lg:grid-cols-2", isCompact ? "gap-2.5" : "gap-3")}>
              <StorageQuotaIndicator
                quotaBytes={stats?.quotaBytes ?? null}
                usageBytes={stats?.usageBytes ?? null}
              />
              <StorageBreakdownChart breakdown={mimeBreakdown} />
            </div>
          </section>

          {/* ── Files & Courses ────────────────────────────────── */}
          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Files &amp; Courses</SectionLabel>
            <div className={cn("grid lg:grid-cols-2", isCompact ? "gap-2.5" : "gap-3")}>
              <LargestFilesList
                files={largestFiles}
                onDelete={async (id) => {
                  await deleteRecords([id]);
                }}
              />
              <CourseStorageTable courses={courseStorage} />
            </div>
          </section>

          {/* ── Health ─────────────────────────────────────────── */}
          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Health &amp; Maintenance</SectionLabel>
            <div className={cn("grid lg:grid-cols-2", isCompact ? "gap-2.5" : "gap-3")}>
              <StorageInfographics records={records} />
              <IntegrityStatusCard
                corruptedCount={issues.corrupted.length}
                partialCount={issues.partial.length}
                loading={loading}
                onRevalidateCorrupted={revalidateCorrupted}
              />
            </div>
          </section>

          {/* ── Danger Zone ────────────────────────────────────── */}
          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Danger Zone</SectionLabel>
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
          </section>

          {/* ── Errors ─────────────────────────────────────────── */}
          {errors.length > 0 ? (
            <section
              aria-labelledby="storage-errors-title"
              className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/70 dark:bg-rose-950/20"
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
