import type { DownloadTask } from "@/features/download/download.types";

type DownloadTaskState = DownloadTask["state"];

type GroupedByState = Record<DownloadTaskState, DownloadTask[]>;

export type DownloadGrouping = {
  values: DownloadTask[];
  byState: GroupedByState;
  hasTasks: boolean;
  childrenByAggregateTaskId: Map<string, DownloadTask[]>;
};

function deriveAggregateState(children: DownloadTask[], totalFiles: number): DownloadTaskState {
  const completedFiles = children.filter((task) => task.state === "completed").length;
  if (completedFiles >= totalFiles && totalFiles > 0) {
    return "completed";
  }

  if (children.some((task) => task.state === "downloading")) {
    return "downloading";
  }

  if (children.some((task) => task.state === "queued")) {
    return "queued";
  }

  if (children.some((task) => task.state === "paused")) {
    return "paused";
  }

  if (children.some((task) => task.state === "failed")) {
    return "failed";
  }

  if (children.some((task) => task.state === "canceled")) {
    return "canceled";
  }

  return "queued";
}

export function buildDownloadGrouping(
  source: Record<string, DownloadTask> | DownloadTask[],
): DownloadGrouping {
  const values = Array.isArray(source) ? source : Object.values(source);
  const visibleTasks: DownloadTask[] = [];
  const groupedChildren = new Map<string, DownloadTask[]>();

  for (const task of values) {
    if (task.hiddenInUi && task.groupId) {
      const bucket = groupedChildren.get(task.groupId);
      if (bucket) {
        bucket.push(task);
      } else {
        groupedChildren.set(task.groupId, [task]);
      }
      continue;
    }

    if (!task.hiddenInUi) {
      visibleTasks.push(task);
    }
  }

  const folderAggregateTasks: DownloadTask[] = [];
  const childrenByAggregateTaskId = new Map<string, DownloadTask[]>();

  for (const [groupId, children] of groupedChildren.entries()) {
    if (children.length === 0) {
      continue;
    }

    const syntheticId = `folder-group:${groupId}`;
    const first = children[0];
    const label = first.groupLabel || "Folder";
    const totalFiles = Math.max(first.groupTotalFiles ?? children.length, children.length);
    const completedFiles = children.filter((task) => task.state === "completed").length;
    const failedFiles = children.filter((task) => task.state === "failed").length;
    const partialProgress = children
      .filter((task) => task.state === "downloading" || task.state === "queued" || task.state === "paused")
      .reduce((sum, task) => sum + (task.progress / 100), 0);
    const fileProgress = totalFiles > 0
      ? Math.min(100, ((completedFiles + partialProgress) / totalFiles) * 100)
      : 0;

    const aggregateState = deriveAggregateState(children, totalFiles);

    const totalBytesEstimate =
      first.groupTotalBytes
      ?? children.reduce((sum, task) => sum + (task.totalBytes ?? task.size ?? 0), 0);

    const loadedBytes = children.reduce((sum, task) => {
      if (typeof task.loadedBytes === "number" && Number.isFinite(task.loadedBytes)) {
        return sum + Math.max(0, task.loadedBytes);
      }

      if (task.state === "completed") {
        return sum + Math.max(0, task.totalBytes ?? task.size ?? 0);
      }

      return sum;
    }, 0);

    const newestUpdatedAt = children.reduce((max, task) => Math.max(max, task.updatedAt), first.updatedAt);
    const oldestCreatedAt = children.reduce((min, task) => Math.min(min, task.createdAt), first.createdAt);

    folderAggregateTasks.push({
      id: syntheticId,
      fileId: groupId,
      fileName: label,
      kind: "folder",
      groupId,
      groupLabel: label,
      groupTotalFiles: totalFiles,
      groupCompletedFiles: completedFiles,
      groupTotalBytes: totalBytesEstimate > 0 ? totalBytesEstimate : undefined,
      progress: fileProgress,
      loadedBytes: loadedBytes > 0 ? loadedBytes : undefined,
      totalBytes: totalBytesEstimate > 0 ? totalBytesEstimate : undefined,
      state: aggregateState,
      error: failedFiles > 0 ? `${failedFiles} file${failedFiles === 1 ? "" : "s"} failed` : undefined,
      createdAt: oldestCreatedAt,
      updatedAt: newestUpdatedAt,
    });

    childrenByAggregateTaskId.set(syntheticId, children);
  }

  const displayValues = [...visibleTasks, ...folderAggregateTasks];

  const byState: GroupedByState = {
    downloading: displayValues.filter((task) => task.state === "downloading"),
    queued: displayValues.filter((task) => task.state === "queued"),
    paused: displayValues.filter((task) => task.state === "paused"),
    failed: displayValues.filter((task) => task.state === "failed"),
    completed: displayValues.filter((task) => task.state === "completed"),
    canceled: displayValues.filter((task) => task.state === "canceled"),
  };

  return {
    values: displayValues,
    byState,
    hasTasks: displayValues.length > 0,
    childrenByAggregateTaskId,
  };
}
