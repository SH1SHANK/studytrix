"use client";

import { memo } from "react";
import {
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DownloadTask } from "@/features/download/download.types";

type DownloadItemProps = {
  task: DownloadTask;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onRetry: (task: DownloadTask) => void;
  onOpenFile: (task: DownloadTask) => void;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
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

function formatEta(seconds: number): string {
  const normalized = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(normalized / 60);
  const secs = normalized % 60;

  if (mins <= 0) {
    return `${secs}s left`;
  }

  if (mins < 60) {
    return `${mins}m ${secs}s left`;
  }

  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${hours}h ${minutes}m left`;
}

const STATUS_CONFIG: Record<
  DownloadTask["state"],
  { label: string; className: string }
> = {
  downloading: {
    label: "Downloading",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  queued: {
    label: "Queued",
    className: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  canceled: {
    label: "Canceled",
    className: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

function DownloadItemComponent({
  task,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onRetry,
  onOpenFile,
}: DownloadItemProps) {
  const status = STATUS_CONFIG[task.state];
  const isActive = task.state === "downloading" || task.state === "queued";

  const hasKnownTotal =
    typeof task.totalBytes === "number"
    && Number.isFinite(task.totalBytes)
    && task.totalBytes > 0;
  const hasLoadedBytes =
    typeof task.loadedBytes === "number"
    && Number.isFinite(task.loadedBytes)
    && task.loadedBytes > 0;
  const hasSpeed =
    typeof task.speedBytesPerSecond === "number"
    && Number.isFinite(task.speedBytesPerSecond)
    && task.speedBytesPerSecond > 0;
  const hasEta =
    typeof task.etaSeconds === "number"
    && Number.isFinite(task.etaSeconds)
    && task.etaSeconds > 0;

  const byteLabel = hasKnownTotal
    ? `${formatBytes(task.loadedBytes ?? 0)} / ${formatBytes(task.totalBytes ?? 0)}`
    : hasLoadedBytes
      ? `${formatBytes(task.loadedBytes ?? 0)} downloaded`
      : null;
  const speedLabel = hasSpeed ? `${formatBytes(task.speedBytesPerSecond ?? 0)}/s` : null;
  const etaLabel = hasEta ? formatEta(task.etaSeconds ?? 0) : null;

  const metaParts = [byteLabel, speedLabel, etaLabel].filter(Boolean);

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm transition-all duration-200 dark:border-stone-800 dark:bg-stone-900">
      {/* Top row: filename + status badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
            {task.fileName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
            {task.courseCode ?? "General"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isActive && (
            <IconLoader2 className="size-3.5 animate-spin text-sky-500" />
          )}
          {task.state === "failed" && (
            <IconAlertTriangle className="size-3.5 text-rose-500" />
          )}
          <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold", status.className)}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {(task.state === "downloading" || task.state === "paused" || task.state === "queued") && (
        <div className="mt-2.5">
          <Progress value={task.progress} className="h-1.5" />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] font-medium tabular-nums text-stone-500 dark:text-stone-400">
              {Math.round(task.progress)}%
            </span>
            {metaParts.length > 0 && (
              <span className="text-[11px] text-stone-400 dark:text-stone-500">
                {metaParts.join(" · ")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Completed meta */}
      {task.state === "completed" && hasKnownTotal && (
        <p className="mt-1.5 text-[11px] text-stone-400 dark:text-stone-500">
          {formatBytes(task.totalBytes ?? 0)}
        </p>
      )}

      {/* Error message */}
      {task.error && (
        <p className="mt-1.5 rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
          {task.error}
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {task.state === "downloading" && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => onPause(task.id)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px]">
              <IconPlayerPause className="size-3" />
              Pause
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onCancel(task.id)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px] text-stone-500">
              <IconX className="size-3" />
              Cancel
            </Button>
          </>
        )}

        {task.state === "queued" && (
          <Button type="button" variant="outline" size="sm" onClick={() => onCancel(task.id)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px] text-stone-500">
            <IconX className="size-3" />
            Cancel
          </Button>
        )}

        {task.state === "paused" && (
          <Button type="button" variant="outline" size="sm" onClick={() => onResume(task.id)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px]">
            <IconPlayerPlay className="size-3" />
            Resume
          </Button>
        )}

        {task.state === "failed" && (
          <Button type="button" variant="outline" size="sm" onClick={() => onRetry(task)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px]">
            <IconRefresh className="size-3" />
            Retry
          </Button>
        )}

        {task.state === "completed" && (
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenFile(task)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px]">
            <IconCheck className="size-3" />
            Open
          </Button>
        )}

        {(task.state === "canceled" || task.state === "completed" || task.state === "failed") && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(task.id)} className="h-7 gap-1 rounded-lg px-2.5 text-[11px] text-stone-400 hover:text-rose-500">
            <IconTrash className="size-3" />
            Remove
          </Button>
        )}
      </div>
    </article>
  );
}

export const DownloadItem = memo(DownloadItemComponent);
DownloadItem.displayName = "DownloadItem";
