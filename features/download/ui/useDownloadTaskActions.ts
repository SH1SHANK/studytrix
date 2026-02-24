"use client";

import { useCallback, useMemo } from "react";

import { buildDownloadGrouping } from "@/features/download/download.grouping";
import type { DownloadTask } from "@/features/download/download.types";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";

type DownloadTaskSource = Record<string, DownloadTask> | DownloadTask[];

type UseDownloadTaskActionsParams = {
  tasks: DownloadTaskSource;
  startDownload: (fileId: string, options?: {
    kind?: "file" | "folder";
    hiddenInUi?: boolean;
    groupId?: string;
    groupLabel?: string;
    groupTotalFiles?: number;
    groupTotalBytes?: number;
  }) => Promise<string>;
  pauseDownload: (taskId: string) => void;
  resumeDownload: (taskId: string) => void;
  cancelDownload: (taskId: string) => void;
  removeTask: (taskId: string) => void;
};

export function useDownloadTaskActions({
  tasks,
  startDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  removeTask,
}: UseDownloadTaskActionsParams) {
  const gateDownloadRisk = useDownloadRiskGate();
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

  const onPause = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      if (child.state === "downloading") {
        pauseDownload(child.id);
      }
    });
    if (!didRun) {
      pauseDownload(taskId);
    }
  }, [pauseDownload, runForAggregateChildren]);

  const onResume = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      if (child.state === "paused" || child.state === "queued" || child.state === "waiting") {
        resumeDownload(child.id);
      }
    });
    if (!didRun) {
      resumeDownload(taskId);
    }
  }, [resumeDownload, runForAggregateChildren]);

  const onCancel = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      if (
        child.state === "downloading"
        || child.state === "paused"
        || child.state === "queued"
        || child.state === "waiting"
      ) {
        cancelDownload(child.id);
      }
    });
    if (!didRun) {
      cancelDownload(taskId);
    }
  }, [cancelDownload, runForAggregateChildren]);

  const onRemove = useCallback((taskId: string) => {
    const didRun = runForAggregateChildren(taskId, (child) => {
      removeTask(child.id);
    });
    if (!didRun) {
      removeTask(taskId);
    }
  }, [removeTask, runForAggregateChildren]);

  const onRetry = useCallback((task: DownloadTask) => {
    void (async () => {
      const children = grouped.childrenByAggregateTaskId.get(task.id);
      if (children && children.length > 0) {
        const retryableChildren = children.filter((child) => child.state === "failed" || child.state === "canceled");
        const proceed = await gateDownloadRisk(
          retryableChildren.map((child) => ({
            id: child.fileId,
            name: child.fileName,
            sizeBytes: child.size ?? child.totalBytes ?? null,
            kind: "file" as const,
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

  const onOpenFile = useCallback((task: DownloadTask) => {
    if (task.kind === "folder") {
      return;
    }

    void openLocalFirst(
      task.fileId,
      `/api/file/${encodeURIComponent(task.fileId)}/stream`,
    );
  }, []);

  return {
    grouped,
    onPause,
    onResume,
    onCancel,
    onRemove,
    onRetry,
    onOpenFile,
  };
}
