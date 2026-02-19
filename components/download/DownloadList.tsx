"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { DownloadTask } from "@/features/download/download.types";
import { useSettingsStore } from "@/features/settings/settings.store";

import { DownloadItem } from "./DownloadItem";

type DownloadListProps = {
  tasks: DownloadTask[];
  limitCompleted?: number;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onRetry: (task: DownloadTask) => void;
  onOpenFile: (task: DownloadTask) => void;
};

const STATE_PRIORITY: Record<DownloadTask["state"], number> = {
  downloading: 0,
  queued: 1,
  paused: 2,
  failed: 3,
  completed: 4,
  canceled: 5,
};

export function DownloadList({
  tasks,
  limitCompleted,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onRetry,
  onOpenFile,
}: DownloadListProps) {
  const virtualizedListsEnabled = useSettingsStore((state) => {
    const candidate = state.values.virtualized_lists;
    return typeof candidate === "boolean" ? candidate : true;
  });
  const [visibleCount, setVisibleCount] = useState(120);

  const sorted = useMemo(() => {
    const ordered = [...tasks].sort((left, right) => {
      const stateDelta = STATE_PRIORITY[left.state] - STATE_PRIORITY[right.state];
      if (stateDelta !== 0) {
        return stateDelta;
      }

      return right.updatedAt - left.updatedAt;
    });

    if (!limitCompleted || limitCompleted <= 0) {
      return ordered;
    }

    const completed: DownloadTask[] = [];
    const nonCompleted: DownloadTask[] = [];

    for (const task of ordered) {
      if (task.state === "completed") {
        if (completed.length < limitCompleted) {
          completed.push(task);
        }
      } else {
        nonCompleted.push(task);
      }
    }

    return [...nonCompleted, ...completed];
  }, [limitCompleted, tasks]);
  const visibleTasks = useMemo(() => {
    if (!virtualizedListsEnabled) {
      return sorted;
    }

    return sorted.slice(0, visibleCount);
  }, [sorted, virtualizedListsEnabled, visibleCount]);
  if (sorted.length === 0) {
    return <p>No downloads yet.</p>;
  }

  return (
    <section aria-label="Downloads list">
      {visibleTasks.map((task) => (
        <DownloadItem
          key={task.id}
          task={task}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          onRemove={onRemove}
          onRetry={onRetry}
          onOpenFile={onOpenFile}
        />
      ))}
      {virtualizedListsEnabled && sorted.length > visibleTasks.length ? (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setVisibleCount((current) => current + 120);
            }}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </section>
  );
}
