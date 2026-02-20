"use client";

import { useMemo } from "react";
import { IconDownloadOff } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DownloadTask } from "@/features/download/download.types";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

import { DownloadList } from "./DownloadList";

function EmptyState() {
  return (
    <section className="mt-2 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-4 text-center dark:border-stone-800 dark:bg-stone-900/40">
      <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-stone-800">
        <IconDownloadOff className="size-5 text-stone-400 dark:text-stone-500" />
      </div>
      <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-100">
        No downloads yet
      </p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Downloaded files will appear here.
      </p>
    </section>
  );
}

function Section({
  title,
  count,
  tasks,
  limitCompleted,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onRetry,
  onOpenFile,
}: {
  title: string;
  count: number;
  tasks: DownloadTask[];
  limitCompleted?: number;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onRetry: (task: DownloadTask) => void;
  onOpenFile: (task: DownloadTask) => void;
}) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {title}
        </h3>
        <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-stone-100 px-1.5 text-[10px] font-semibold tabular-nums text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          {count}
        </span>
      </div>
      <DownloadList
        tasks={tasks}
        limitCompleted={limitCompleted}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        onRemove={onRemove}
        onRetry={onRetry}
        onOpenFile={onOpenFile}
      />
    </section>
  );
}

export function DownloadDrawer() {
  const {
    tasks,
    isDrawerOpen,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    closeDrawer,
    removeTask,
  } = useDownloadManager();

  const grouped = useMemo(() => {
    const values = Object.values(tasks);

    return {
      downloading: values.filter((task) => task.state === "downloading"),
      queued: values.filter((task) => task.state === "queued"),
      paused: values.filter((task) => task.state === "paused"),
      failed: values.filter((task) => task.state === "failed"),
      canceled: values.filter((task) => task.state === "canceled"),
      completed: values.filter((task) => task.state === "completed"),
    };
  }, [tasks]);
  const hasTasks = Object.keys(tasks).length > 0;

  const handleRetry = (task: DownloadTask) => {
    void startDownload(task.fileId);
  };

  const handleOpenFile = (task: DownloadTask) => {
    void openLocalFirst(
      task.fileId,
      `/api/file/${encodeURIComponent(task.fileId)}/stream`,
    );
  };

  const sharedProps = {
    onPause: pauseDownload,
    onResume: resumeDownload,
    onCancel: cancelDownload,
    onRemove: removeTask,
    onRetry: handleRetry,
    onOpenFile: handleOpenFile,
  };

  return (
    <Dialog open={isDrawerOpen} onOpenChange={(open) => {
      if (!open) {
        closeDrawer();
      }
    }}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Downloads</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60dvh] space-y-4 overflow-y-auto pr-1">
          {hasTasks ? (
            <>
              <Section title="Downloading" count={grouped.downloading.length} tasks={grouped.downloading} {...sharedProps} />
              <Section title="Queued" count={grouped.queued.length} tasks={grouped.queued} {...sharedProps} />
              <Section title="Paused" count={grouped.paused.length} tasks={grouped.paused} {...sharedProps} />
              <Section title="Failed" count={grouped.failed.length} tasks={grouped.failed} {...sharedProps} />
              <Section title="Canceled" count={grouped.canceled.length} tasks={grouped.canceled} limitCompleted={20} {...sharedProps} />
              <Section title="Completed" count={grouped.completed.length} tasks={grouped.completed} limitCompleted={20} {...sharedProps} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
