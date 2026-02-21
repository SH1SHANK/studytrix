"use client";

import { useCallback, useMemo } from "react";
import { IconDownloadOff } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildDownloadGrouping } from "@/features/download/download.grouping";
import type { DownloadTask } from "@/features/download/download.types";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";

import { DownloadList } from "./DownloadList";

function EmptyState() {
  return (
    <section className="mt-2 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/70 px-4 text-center border-border bg-card/40">
      <div className="flex size-10 items-center justify-center rounded-full bg-card shadow-sm bg-muted">
        <IconDownloadOff className="size-5 text-muted-foreground/80" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground/90 text-foreground">
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
        <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground bg-muted text-muted-foreground">
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
  const gateDownloadRisk = useDownloadRiskGate();
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

  const grouped = useMemo(() => buildDownloadGrouping(tasks), [tasks]);

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
    void (async () => {
      const children = grouped.childrenByAggregateTaskId.get(task.id);
      if (children && children.length > 0) {
        const retryableChildren = children.filter((child) => child.state === "failed" || child.state === "canceled");
        const proceed = await gateDownloadRisk(
          retryableChildren.map((child) => ({
            id: child.fileId,
            name: child.fileName,
            sizeBytes: child.size ?? child.totalBytes ?? null,
            kind: "file",
          })),
          {
            actionLabel: "retry download",
            confirmButtonLabel: "Retry",
          },
        );
        if (!proceed) {
          return;
        }

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

      const proceed = await gateDownloadRisk(
        [
          {
            id: task.fileId,
            name: task.fileName,
            sizeBytes: task.size ?? task.totalBytes ?? null,
            kind: task.kind === "folder" ? "folder" : "file",
          },
        ],
        {
          actionLabel: "retry download",
          confirmButtonLabel: "Retry",
        },
      );
      if (!proceed) {
        return;
      }

      void startDownload(task.fileId);
    })();
  }, [gateDownloadRisk, grouped.childrenByAggregateTaskId, startDownload]);

  const handleOpenFile = useCallback((task: DownloadTask) => {
    if (task.kind === "folder") {
      return;
    }

    void openLocalFirst(
      task.fileId,
      `/api/file/${encodeURIComponent(task.fileId)}/stream`,
    );
  }, []);

  const sharedProps = {
    onPause: handlePause,
    onResume: handleResume,
    onCancel: handleCancel,
    onRemove: handleRemove,
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
          {grouped.hasTasks ? (
            <>
              <Section title="Downloading" count={grouped.byState.downloading.length} tasks={grouped.byState.downloading} {...sharedProps} />
              <Section title="Queued" count={grouped.byState.queued.length} tasks={grouped.byState.queued} {...sharedProps} />
              <Section title="Paused" count={grouped.byState.paused.length} tasks={grouped.byState.paused} {...sharedProps} />
              <Section title="Failed" count={grouped.byState.failed.length} tasks={grouped.byState.failed} {...sharedProps} />
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
