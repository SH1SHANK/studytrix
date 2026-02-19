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
} from "@tabler/icons-react";

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

function DownloadItemComponent({
  task,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onRetry,
  onOpenFile,
}: DownloadItemProps) {
  const statusLabel =
    task.state === "queued"
      ? "Queued"
      : task.state === "downloading"
        ? "Downloading"
        : task.state === "paused"
          ? "Paused"
          : task.state === "completed"
            ? "Completed"
            : task.state === "canceled"
              ? "Canceled"
              : "Failed";
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

  return (
    <article>
      <div>
        <h3>{task.fileName}</h3>
        <p>{task.courseCode ?? "General"}</p>
      </div>

      <div>
        <span>{statusLabel}</span>
        <span>{Math.round(task.progress)}%</span>
      </div>

      <Progress value={task.progress} />

      {byteLabel || speedLabel || etaLabel ? (
        <p>
          {[byteLabel, speedLabel, etaLabel].filter(Boolean).join(" • ")}
        </p>
      ) : null}

      {task.error ? <p>{task.error}</p> : null}

      <div>
        {task.state === "downloading" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onPause(task.id)}>
            <IconPlayerPause />
            Pause
          </Button>
        ) : null}

        {task.state === "queued" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onCancel(task.id)}>
            <IconX />
            Cancel
          </Button>
        ) : null}

        {task.state === "paused" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onResume(task.id)}>
            <IconPlayerPlay />
            Resume
          </Button>
        ) : null}

        {task.state === "failed" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onRetry(task)}>
            <IconPlayerPlay />
            Retry
          </Button>
        ) : null}

        {task.state === "downloading" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onCancel(task.id)}>
            <IconX />
            Cancel
          </Button>
        ) : null}

        {task.state === "completed" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenFile(task)}>
            <IconCheck />
            Open
          </Button>
        ) : null}

        {task.state === "canceled" || task.state === "completed" || task.state === "failed" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onRemove(task.id)}>
            <IconTrash />
            Remove
          </Button>
        ) : null}

        {task.state === "queued" || task.state === "downloading" ? (
          <span aria-hidden="true">
            <IconLoader2 className="animate-spin" />
          </span>
        ) : null}

        {task.state === "failed" ? (
          <span aria-hidden="true">
            <IconAlertTriangle />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export const DownloadItem = memo(DownloadItemComponent);
DownloadItem.displayName = "DownloadItem";
