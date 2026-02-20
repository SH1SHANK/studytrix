"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

    return sorted.slice(0, 120);
  }, [sorted, virtualizedListsEnabled]);

  if (sorted.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground/80">
        No downloads in this section.
      </p>
    );
  }

  return (
    <section aria-label="Downloads list" className="space-y-2">
      <AnimatePresence initial={false}>
        {visibleTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <DownloadItem
              task={task}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRemove={onRemove}
              onRetry={onRetry}
              onOpenFile={onOpenFile}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {virtualizedListsEnabled && sorted.length > visibleTasks.length ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs">
            Load more ({sorted.length - visibleTasks.length} remaining)
          </Button>
        </div>
      ) : null}
    </section>
  );
}
