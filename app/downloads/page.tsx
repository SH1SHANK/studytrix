"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconSearch, IconTrash } from "@tabler/icons-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DownloadList } from "@/features/download/ui/DownloadList";
import { useDownloadTaskActions } from "@/features/download/ui/useDownloadTaskActions";
import { getAllFiles } from "@/features/offline/offline.db";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";
import { useSetting } from "@/ui/hooks/useSettings";
import { cn } from "@/lib/utils";

type DownloadFilter = "all" | "active" | "completed" | "issues";
type DownloadStorageSummary = {
  totalFiles: number;
  totalBytes: number;
  usage: number | null;
  quota: number | null;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const ACTIVE_STATES = new Set(["downloading", "waiting", "queued", "paused"]);
const ISSUE_STATES = new Set(["failed", "canceled", "evicted"]);

export default function DownloadsPage() {
  const [compactMode] = useSetting("compact_mode");
  const isCompact = compactMode === true;
  const {
    tasks,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeTask,
    clearCompleted,
  } = useDownloadManager();
  const {
    grouped,
    onPause,
    onResume,
    onCancel,
    onRemove,
    onRetry,
    onOpenFile,
  } = useDownloadTaskActions({
    tasks,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeTask,
  });

  const [stats, setStats] = useState<DownloadStorageSummary | null>(null);
  const [activeFilter, setActiveFilter] = useState<DownloadFilter>("all");
  const [query, setQuery] = useState("");

  const refreshStats = useCallback(async () => {
    const files = await getAllFiles();
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    let usage: number | null = null;
    let quota: number | null = null;

    if (
      typeof navigator !== "undefined"
      && navigator.storage
      && typeof navigator.storage.estimate === "function"
    ) {
      try {
        const estimate = await navigator.storage.estimate();
        usage = typeof estimate.usage === "number" ? estimate.usage : null;
        quota = typeof estimate.quota === "number" ? estimate.quota : null;
      } catch {
        usage = null;
        quota = null;
      }
    }

    setStats({
      totalFiles: files.length,
      totalBytes,
      usage,
      quota,
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void refreshStats();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [refreshStats]);

  const downloadingCount = grouped.byState.downloading.length;
  const waitingCount = grouped.byState.waiting.length;
  const queuedCount = grouped.byState.queued.length;
  const pausedCount = grouped.byState.paused.length;
  const completedCount = grouped.byState.completed.length;
  const issueCount = grouped.byState.failed.length + grouped.byState.canceled.length + grouped.byState.evicted.length;
  const activeCount = downloadingCount + waitingCount + queuedCount + pausedCount;

  useEffect(() => {
    void refreshStats();
  }, [completedCount, refreshStats]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = grouped.values.filter((task) => {
      if (activeFilter === "active") {
        return ACTIVE_STATES.has(task.state);
      }

      if (activeFilter === "completed") {
        return task.state === "completed";
      }

      if (activeFilter === "issues") {
        return ISSUE_STATES.has(task.state);
      }

      return true;
    });

    if (!normalizedQuery) {
      return base;
    }

    return base.filter((task) => {
      const haystack = `${task.fileName} ${task.groupLabel ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeFilter, grouped.values, query]);

  return (
    <AppShell headerTitle="Downloads" hideHeaderFilters={true}>
      <div className={cn("mx-auto w-full max-w-3xl px-4 sm:px-5", isCompact ? "py-3 pb-20" : "py-4 pb-24")}>
        <header className={cn(isCompact ? "mb-5 space-y-3" : "mb-6 space-y-4")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Active</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums text-foreground", isCompact ? "text-base" : "text-lg")}>
                {activeCount}
              </p>
            </div>
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Completed</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums text-foreground", isCompact ? "text-base" : "text-lg")}>
                {completedCount}
              </p>
            </div>
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Issues</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums", isCompact ? "text-base" : "text-lg", issueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                {issueCount}
              </p>
            </div>
            <div className={cn("rounded-xl border border-border bg-card", isCompact ? "p-2.5" : "p-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Offline</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums text-foreground", isCompact ? "text-base" : "text-lg")}>
                {formatBytes(stats?.totalBytes ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "active", "completed", "issues"] as const).map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={activeFilter === filter ? "default" : "outline"}
                className={cn("rounded-lg", isCompact ? "h-8 text-xs" : "h-9 text-sm")}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "all"
                  ? "All"
                  : filter === "active"
                    ? "Active"
                    : filter === "completed"
                      ? "Completed"
                      : "Issues"}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearCompleted}
              disabled={completedCount === 0}
              className={cn("ml-auto gap-1.5 rounded-lg", isCompact ? "h-8 text-xs" : "h-9 text-sm")}
            >
              <IconTrash className="size-3.5" />
              Clear completed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void refreshStats();
              }}
              className={cn("gap-1.5 rounded-lg", isCompact ? "h-8 text-xs" : "h-9 text-sm")}
            >
              <IconRefresh className="size-3.5" />
              Refresh
            </Button>
          </div>

          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search downloads..."
              className="h-10 rounded-xl border-border bg-muted/40 pl-9 text-sm"
            />
          </div>
        </header>

        <main className={cn(isCompact ? "space-y-3" : "space-y-4")}>
          {filteredTasks.length > 0 ? (
            <DownloadList
              tasks={filteredTasks}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRemove={onRemove}
              onRetry={onRetry}
              onOpenFile={onOpenFile}
            />
          ) : (
            <section className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No downloads match this view.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try clearing filters or search keywords.
              </p>
              {(activeFilter !== "all" || query.trim()) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={() => {
                    setActiveFilter("all");
                    setQuery("");
                  }}
                >
                  Reset view
                </Button>
              ) : null}
            </section>
          )}
        </main>
      </div>
    </AppShell>
  );
}
