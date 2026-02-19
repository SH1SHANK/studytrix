"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { DownloadList } from "@/components/download/DownloadList";
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

  const list = useMemo(() => Object.values(tasks), [tasks]);

  const downloadingCount = list.filter((task) => task.state === "downloading").length;
  const queuedCount = list.filter((task) => task.state === "queued").length;
  const completedCount = list.filter((task) => task.state === "completed").length;

  const handleOpenFile = useCallback((task: DownloadTask) => {
    void openLocalFirst(
      task.fileId,
      `/api/file/${encodeURIComponent(task.fileId)}/stream`,
    );
  }, []);

  return (
    <AppShell>
      <main className="space-y-4 px-4 py-4">
        <header>
          <h1>Downloads</h1>
          <p>Manage queue, progress, and completed files.</p>
        </header>

        <section aria-label="Storage summary">
          <p>Offline files: {stats?.totalFiles ?? 0}</p>
          <p>Offline size: {formatBytes(stats?.totalBytes ?? 0)}</p>
          <p>Quota used: {formatBytes(stats?.usage ?? 0)} / {formatBytes(stats?.quota ?? 0)}</p>
        </section>

        <section aria-label="Download summary">
          <p>Downloading: {downloadingCount}</p>
          <p>Queued: {queuedCount}</p>
          <p>Completed: {completedCount}</p>
        </section>

        <section aria-label="Download actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearCompleted();
            }}
          >
            Clear completed
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refreshStats();
            }}
          >
            Refresh stats
          </Button>
        </section>

        <DownloadList
          tasks={list}
          onPause={pauseDownload}
          onResume={resumeDownload}
          onCancel={cancelDownload}
          onRemove={removeTask}
          onRetry={(task) => {
            void startDownload(task.fileId);
          }}
          onOpenFile={handleOpenFile}
        />
      </main>
    </AppShell>
  );
}
