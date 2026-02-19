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
    <section className="mt-2 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/70 px-4 text-center dark:border-stone-800 dark:bg-stone-900/40">
      <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-stone-900">
        <IconDownloadOff className="size-5 text-stone-500 dark:text-stone-400" />
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
  tasks: DownloadTask[];
  limitCompleted?: number;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onRetry: (task: DownloadTask) => void;
  onOpenFile: (task: DownloadTask) => void;
}) {
  const sectionId = `downloads-${title.toLowerCase().replace(/\\s+/g, "-")}-title`;

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={sectionId}>
      <h3 id={sectionId}>{title}</h3>
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
        {hasTasks ? (
          <>
            <Section
              title="Downloading"
              tasks={grouped.downloading}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRemove={removeTask}
              onRetry={handleRetry}
              onOpenFile={handleOpenFile}
            />

            <Section
              title="Queued"
              tasks={grouped.queued}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRemove={removeTask}
              onRetry={handleRetry}
              onOpenFile={handleOpenFile}
            />

            <Section
              title="Paused"
              tasks={grouped.paused}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRemove={removeTask}
              onRetry={handleRetry}
              onOpenFile={handleOpenFile}
            />

            <Section
              title="Failed"
              tasks={grouped.failed}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRemove={removeTask}
              onRetry={handleRetry}
              onOpenFile={handleOpenFile}
            />

            <Section
              title="Canceled"
              tasks={grouped.canceled}
              limitCompleted={20}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRemove={removeTask}
              onRetry={handleRetry}
              onOpenFile={handleOpenFile}
            />

            <Section
              title="Completed"
              tasks={grouped.completed}
              limitCompleted={20}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRemove={removeTask}
              onRetry={handleRetry}
              onOpenFile={handleOpenFile}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </DialogContent>
    </Dialog>
  );
}
