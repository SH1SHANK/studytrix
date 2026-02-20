import { emit } from "./download.events";

export interface QueueProgressPayload {
  taskId: string;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface QueueTaskContext {
  signal: AbortSignal;
  emitProgress: (loadedBytes: number, totalBytes: number) => void;
}

export type QueueTaskHandler = (context: QueueTaskContext) => Promise<void>;

export type QueueTaskState =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export interface QueueLifecyclePayload {
  taskId: string;
  state: QueueTaskState;
  error?: string;
}

type AbortReason = "pause" | "cancel" | null;

type QueueTaskEntry = {
  taskId: string;
  priority: number;
  createdAt: number;
  state: QueueTaskState;
  handler: QueueTaskHandler;
  controller: AbortController | null;
  abortReason: AbortReason;
};

type ProgressListener = (payload: QueueProgressPayload) => void;
type LifecycleListener = (payload: QueueLifecyclePayload) => void;

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return value;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Download failed";
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException
    && error.name === "AbortError"
  );
}

export class DownloadQueue {
  private readonly maxConcurrency: number;

  private readonly entries = new Map<string, QueueTaskEntry>();

  private readonly progressListeners = new Set<ProgressListener>();

  private readonly lifecycleListeners = new Set<LifecycleListener>();

  private runningCount = 0;

  private isFlushing = false;

  constructor(concurrency = 3) {
    this.maxConcurrency = Math.max(1, Math.floor(concurrency));
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);

    return () => {
      this.progressListeners.delete(listener);
    };
  }

  onLifecycle(listener: LifecycleListener): () => void {
    this.lifecycleListeners.add(listener);

    return () => {
      this.lifecycleListeners.delete(listener);
    };
  }

  hasTask(taskId: string): boolean {
    return this.entries.has(taskId);
  }

  enqueue(taskId: string, handler: QueueTaskHandler, priority = 0): boolean {
    const normalizedTaskId = taskId.trim();
    if (!normalizedTaskId || this.entries.has(normalizedTaskId)) {
      return false;
    }

    this.entries.set(normalizedTaskId, {
      taskId: normalizedTaskId,
      priority,
      createdAt: Date.now(),
      state: "queued",
      handler,
      controller: null,
      abortReason: null,
    });

    this.notifyLifecycle({ taskId: normalizedTaskId, state: "queued" });
    this.flush();
    return true;
  }

  pause(taskId: string): boolean {
    const entry = this.entries.get(taskId);
    if (!entry) {
      return false;
    }

    if (entry.state === "queued") {
      entry.state = "paused";
      this.notifyLifecycle({ taskId, state: "paused" });
      return true;
    }

    if (entry.state === "running" && entry.controller) {
      entry.abortReason = "pause";
      entry.controller.abort();
      return true;
    }

    return false;
  }

  resume(taskId: string): boolean {
    const entry = this.entries.get(taskId);
    if (!entry || entry.state !== "paused") {
      return false;
    }

    entry.abortReason = null;
    entry.state = "queued";
    this.notifyLifecycle({ taskId, state: "queued" });
    this.flush();
    return true;
  }

  cancel(taskId: string): boolean {
    const entry = this.entries.get(taskId);
    if (!entry) {
      return false;
    }

    if (entry.state === "queued" || entry.state === "paused") {
      entry.state = "canceled";
      this.notifyLifecycle({ taskId, state: "canceled" });
      this.entries.delete(taskId);
      return true;
    }

    if (entry.state === "running" && entry.controller) {
      entry.abortReason = "cancel";
      entry.controller.abort();
      return true;
    }

    return false;
  }

  reorder(taskId: string, newPriority: number): void {
    const entry = this.entries.get(taskId);
    if (!entry) {
      return;
    }

    if (!Number.isFinite(newPriority)) {
      return;
    }

    entry.priority = Math.floor(newPriority);
    this.flush();
  }

  private notifyProgress(payload: QueueProgressPayload): void {
    for (const listener of this.progressListeners) {
      listener(payload);
    }

    emit("download:progress", payload);
  }

  private notifyLifecycle(payload: QueueLifecyclePayload): void {
    for (const listener of this.lifecycleListeners) {
      listener(payload);
    }
  }

  private nextQueuedTask(): QueueTaskEntry | null {
    let best: QueueTaskEntry | null = null;

    for (const entry of this.entries.values()) {
      if (entry.state !== "queued") {
        continue;
      }

      if (!best) {
        best = entry;
        continue;
      }

      if (entry.priority > best.priority) {
        best = entry;
        continue;
      }

      if (entry.priority === best.priority && entry.createdAt < best.createdAt) {
        best = entry;
      }
    }

    return best;
  }

  private flush(): void {
    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    queueMicrotask(() => {
      try {
        while (this.runningCount < this.maxConcurrency) {
          const next = this.nextQueuedTask();
          if (!next) {
            break;
          }

          void this.runTask(next);
        }
      } finally {
        this.isFlushing = false;
      }
    });
  }

  private async runTask(entry: QueueTaskEntry): Promise<void> {
    entry.state = "running";
    entry.abortReason = null;

    const controller = new AbortController();
    entry.controller = controller;

    this.runningCount += 1;
    this.notifyLifecycle({ taskId: entry.taskId, state: "running" });
    let lastLoadedBytes = 0;
    let lastTotalBytes = 0;

    try {
      await entry.handler({
        signal: controller.signal,
        emitProgress: (loadedBytes: number, totalBytes: number) => {
          const total = Math.max(totalBytes, 0);
          const loaded = Math.max(loadedBytes, 0);
          lastLoadedBytes = loaded;
          lastTotalBytes = total;
          const progress = total > 0
            ? clampProgress((loaded / total) * 100)
            : 0;

          this.notifyProgress({
            taskId: entry.taskId,
            progress,
            loadedBytes: loaded,
            totalBytes: total,
          });
        },
      });

      if (entry.abortReason === "pause") {
        entry.state = "paused";
        this.notifyLifecycle({ taskId: entry.taskId, state: "paused" });
        return;
      }

      if (entry.abortReason === "cancel") {
        entry.state = "canceled";
        this.notifyLifecycle({ taskId: entry.taskId, state: "canceled" });
        this.entries.delete(entry.taskId);
        return;
      }

      entry.state = "completed";
      const completedTotalBytes =
        lastTotalBytes > 0 ? lastTotalBytes : Math.max(lastLoadedBytes, 0);
      this.notifyProgress({
        taskId: entry.taskId,
        progress: 100,
        loadedBytes: lastLoadedBytes,
        totalBytes: completedTotalBytes,
      });
      this.notifyLifecycle({ taskId: entry.taskId, state: "completed" });
      this.entries.delete(entry.taskId);
    } catch (error) {
      if (entry.abortReason === "pause" || isAbortError(error)) {
        entry.state = "paused";
        this.notifyLifecycle({ taskId: entry.taskId, state: "paused" });
        return;
      }

      if (entry.abortReason === "cancel") {
        entry.state = "canceled";
        this.notifyLifecycle({ taskId: entry.taskId, state: "canceled" });
        this.entries.delete(entry.taskId);
        return;
      }

      entry.state = "failed";
      this.notifyLifecycle({
        taskId: entry.taskId,
        state: "failed",
        error: toErrorMessage(error),
      });
      this.entries.delete(entry.taskId);
    } finally {
      entry.controller = null;
      entry.abortReason = null;
      this.runningCount = Math.max(0, this.runningCount - 1);
      this.flush();
    }
  }
}
