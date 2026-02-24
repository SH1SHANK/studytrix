"use client";

import { IconDownloadOff } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DownloadTask } from "@/features/download/download.types";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

import { DownloadList } from "./DownloadList";
import { useDownloadTaskActions } from "./useDownloadTaskActions";

function EmptyState() {
  return (
    <section className="mt-2 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-4 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted shadow-sm">
        <IconDownloadOff className="size-5 text-muted-foreground/80" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">
        No downloads yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </h3>
        <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
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

  const sharedProps = {
    onPause,
    onResume,
    onCancel,
    onRemove,
    onRetry,
    onOpenFile,
  };

  return (
    <Dialog
      open={isDrawerOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDrawer();
        }
      }}
    >
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Downloads</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60dvh] space-y-4 overflow-y-auto pr-1">
          {grouped.hasTasks ? (
            <>
              <Section title="Downloading" count={grouped.byState.downloading.length} tasks={grouped.byState.downloading} {...sharedProps} />
              <Section title="Waiting" count={grouped.byState.waiting.length} tasks={grouped.byState.waiting} {...sharedProps} />
              <Section title="Queued" count={grouped.byState.queued.length} tasks={grouped.byState.queued} {...sharedProps} />
              <Section title="Paused" count={grouped.byState.paused.length} tasks={grouped.byState.paused} {...sharedProps} />
              <Section title="Failed" count={grouped.byState.failed.length} tasks={grouped.byState.failed} {...sharedProps} />
              <Section title="Evicted" count={grouped.byState.evicted.length} tasks={grouped.byState.evicted} {...sharedProps} />
              <Section title="Canceled" count={grouped.byState.canceled.length} tasks={grouped.byState.canceled} limitCompleted={20} {...sharedProps} />
              <Section title="Completed" count={grouped.byState.completed.length} tasks={grouped.byState.completed} limitCompleted={20} {...sharedProps} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
