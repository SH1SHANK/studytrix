"use client";

import { useCallback } from "react";
import { IconDownload, IconRefresh } from "@tabler/icons-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { BulkDeletePanel } from "@/features/storage/ui/BulkDeletePanel";
import { CourseStorageTable } from "@/features/storage/ui/CourseStorageTable";
import { IntegrityStatusCard } from "@/features/storage/ui/IntegrityStatusCard";
import { LargestFilesList } from "@/features/storage/ui/LargestFilesList";
import { StorageBreakdownChart } from "@/features/storage/ui/StorageBreakdownChart";
import { StorageInfographics } from "@/features/storage/ui/StorageInfographics";
import { StorageLocationCard } from "@/features/storage/ui/StorageLocationCard";
import { StorageOverviewCard } from "@/features/storage/ui/StorageOverviewCard";
import { StorageQuotaIndicator } from "@/features/storage/ui/StorageQuotaIndicator";
import { getIntegrityIssues } from "@/features/storage/storage.integrity";
import { computeUsagePercent } from "@/features/storage/storage.quota";
import { exportStorageSummary } from "@/features/storage/storage.service";
import { useSetting } from "@/ui/hooks/useSettings";
import { useStorageDashboard } from "@/ui/hooks/useStorageDashboard";
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
  const usagePercent = computeUsagePercent(stats?.quotaBytes ?? null, stats?.usageBytes ?? null);

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
      <div className={cn("mx-auto w-full max-w-3xl px-4 sm:px-5", isCompact ? "py-3 pb-20" : "py-4 pb-24")}>
        <header className={cn(isCompact ? "mb-5 space-y-3" : "mb-6 space-y-4")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Files</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums text-foreground", isCompact ? "text-base" : "text-lg")}>
                {stats?.totalFiles ?? 0}
              </p>
            </div>
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Corrupted</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums", isCompact ? "text-base" : "text-lg", issues.corrupted.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                {issues.corrupted.length}
              </p>
            </div>
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Partial</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums", isCompact ? "text-base" : "text-lg", issues.partial.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                {issues.partial.length}
              </p>
            </div>
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Quota</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums text-foreground", isCompact ? "text-base" : "text-lg")}>
                {usagePercent !== null ? `${usagePercent.toFixed(0)}%` : "N/A"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void refresh();
              }}
              disabled={loading}
              className={cn("gap-1.5 rounded-lg", isCompact ? "h-8 text-xs" : "h-9 text-sm")}
            >
              <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
              {loading ? "Refreshing" : "Refresh"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void handleExportSummary();
              }}
              className={cn("gap-1.5 rounded-lg", isCompact ? "h-8 text-xs" : "h-9 text-sm")}
            >
              <IconDownload className="size-3.5" />
              Export summary
            </Button>
          </div>
        </header>

        <main className={cn(isCompact ? "space-y-4" : "space-y-5")}>
          {loading && records.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading storage data...</p>
          ) : null}

          <section className={cn(isCompact ? "space-y-3" : "space-y-4")}>
            <StorageLocationCard />
          </section>

          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Overview</SectionLabel>
            <StorageOverviewCard
              stats={stats}
              loading={loading}
              hasErrors={errors.length > 0}
            />
          </section>

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

          <section className={cn(isCompact ? "space-y-1.5" : "space-y-2")}>
            <SectionLabel>Cleanup</SectionLabel>
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
        </main>
      </div>
    </AppShell>
  );
}
