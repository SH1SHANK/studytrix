"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconTrash } from "@tabler/icons-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { DownloadList } from "@/components/download/DownloadList";
import { OfflineRuntimeDiagnostics } from "@/components/offline/OfflineRuntimeDiagnostics";
import { buildDownloadGrouping } from "@/features/download/download.grouping";
import { getAllFiles } from "@/features/offline/offline.db";
import { openLocalFirst } from "@/features/offline/offline.access";
import type { StorageStats } from "@/features/offline/offline.types";
import type { DownloadTask } from "@/features/download/download.types";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

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

export default function DownloadsPage() {
  const {
    tasks,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeTask,
    clearCompleted,
  } = useDownloadManager();

  const [stats, setStats] = useState<StorageStats | null>(null);

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

  const grouped = useMemo(() => buildDownloadGrouping(tasks), [tasks]);
  const list = grouped.values;

  const downloadingCount = list.filter((task) => task.state === "downloading").length;
  const queuedCount = list.filter((task) => task.state === "queued").length;
  const completedCount = list.filter((task) => task.state === "completed").length;

  useEffect(() => {
    void refreshStats();
  }, [completedCount, refreshStats]);

  const runForAggregateChildren = useCallback(
    (taskId: string, run: (child: DownloadTask) => void) => {
      const children = grouped.childrenByAggregateTaskId.get(taskId);
      if (!children || children.length === 0) {
        return false;
      }

      for (const child of children) {
        run(child);
      }

      return true;
    },
    [grouped.childrenByAggregateTaskId],
  );

  const handlePause = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      if (child.state === "downloading") {
        pauseDownload(child.id);
      }
    });
    if (!didRun) {
      pauseDownload(taskId);
    }
  }, [pauseDownload, runForAggregateChildren]);

  const handleResume = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      if (child.state === "paused" || child.state === "queued") {
        resumeDownload(child.id);
      }
    });
    if (!didRun) {
      resumeDownload(taskId);
    }
  }, [resumeDownload, runForAggregateChildren]);

  const handleCancel = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      if (child.state === "downloading" || child.state === "paused" || child.state === "queued") {
        cancelDownload(child.id);
      }
    });
    if (!didRun) {
      cancelDownload(taskId);
    }
  }, [cancelDownload, runForAggregateChildren]);

  const handleRemove = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      removeTask(child.id);
    });
    if (!didRun) {
      removeTask(taskId);
    }
  }, [removeTask, runForAggregateChildren]);

  const handleRetry = useCallback((task: DownloadTask) => {
    const children = grouped.childrenByAggregateTaskId.get(task.id);
    if (children && children.length > 0) {
      const groupId = task.groupId ?? task.fileId;
      const groupLabel = task.groupLabel ?? task.fileName;
      const groupTotalFiles = task.groupTotalFiles ?? children.length;
      const groupTotalBytes = task.groupTotalBytes;
      for (const child of children) {
        if (child.state !== "failed" && child.state !== "canceled") {
          continue;
        }
        void startDownload(child.fileId, {
          kind: "file",
          hiddenInUi: true,
          groupId,
          groupLabel,
          groupTotalFiles,
          groupTotalBytes,
        });
      }
      return;
    }

    void startDownload(task.fileId);
  }, [grouped.childrenByAggregateTaskId, startDownload]);

  const handleOpenFile = useCallback((task: DownloadTask) => {
    if (task.kind === "folder") {
      return;
    }

    void openLocalFirst(
      task.fileId,
      `/api/file/${encodeURIComponent(task.fileId)}/stream`,
    );
  }, []);

  return (
    <AppShell headerTitle="Downloads" hideHeaderFilters={true}>
      <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 sm:px-5">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="mb-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-card p-3 border-border bg-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Active</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {downloadingCount + queuedCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 border-border bg-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Completed</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {completedCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 border-border bg-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Offline</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {formatBytes(stats?.totalBytes ?? 0)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearCompleted}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <IconTrash className="size-3.5" />
              Clear completed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { void refreshStats(); }}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <IconRefresh className="size-3.5" />
              Refresh
            </Button>
          </div>
        </header>

        {/* ── Downloads List ──────────────────────────────── */}
        <main className="mt-6">
          <div className="mb-4">
            <OfflineRuntimeDiagnostics compact={true} />
          </div>
          <DownloadList
            tasks={list}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
            onRemove={handleRemove}
            onRetry={handleRetry}
            onOpenFile={handleOpenFile}
          />
        </main>
      </div>
    </AppShell>
  );
}
