import type { DownloadProgress, DownloadTask } from "./offline.types";

export type QueueFetchFn = (
  task: DownloadTask,
  emitProgress: (loaded: number, total: number) => void,
) => Promise<void>;

type InternalTask = {
  task: DownloadTask;
  fetchFn: QueueFetchFn;
  attempts: number;
  insertedAt: number;
};

type CompleteCallback = (
  fileId: string,
  success: boolean,
  error?: Error,
) => void;

type ProgressCallback = (progress: DownloadProgress) => void;

const MAX_RETRIES = 1;

export class DownloadQueue {
  private readonly concurrency = 3;

  private readonly queued: InternalTask[] = [];

  private readonly activeFileIds = new Set<string>();

  private readonly queuedFileIds = new Set<string>();

  private readonly progressCallbacks = new Set<ProgressCallback>();

  private readonly completeCallbacks = new Set<CompleteCallback>();

  private activeWorkers = 0;

  private started = false;

  private paused = false;

  enqueue(task: DownloadTask, fetchFn: QueueFetchFn): void {
    if (this.queuedFileIds.has(task.fileId) || this.activeFileIds.has(task.fileId)) {
      return;
    }

    const normalizedTask: InternalTask = {
      task: {
        fileId: task.fileId,
        priority: Number.isFinite(task.priority) ? task.priority : 0,
      },
      fetchFn,
      attempts: 0,
      insertedAt: Date.now(),
    };

    this.queued.push(normalizedTask);
    this.queuedFileIds.add(task.fileId);
    this.sortQueue();

    this.emitProgress({
      fileId: task.fileId,
      loaded: 0,
      total: 0,
      percent: 0,
    });

    if (this.started && !this.paused) {
      this.schedulePump();
    }
  }

  onProgress(cb: ProgressCallback): () => void {
    this.progressCallbacks.add(cb);
    return () => {
      this.progressCallbacks.delete(cb);
    };
  }

  onComplete(cb: CompleteCallback): () => void {
    this.completeCallbacks.add(cb);
    return () => {
      this.completeCallbacks.delete(cb);
    };
  }

  start(): void {
    this.started = true;
    this.paused = false;
    this.schedulePump();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.started) {
      this.started = true;
    }

    this.paused = false;
    this.schedulePump();
  }

  private schedulePump(): void {
    queueMicrotask(() => {
      this.pump();
    });
  }

  private pump(): void {
    while (
      this.started &&
      !this.paused &&
      this.activeWorkers < this.concurrency &&
      this.queued.length > 0
    ) {
      const next = this.queued.shift();
      if (!next) {
        return;
      }

      this.queuedFileIds.delete(next.task.fileId);
      this.activeFileIds.add(next.task.fileId);
      this.activeWorkers += 1;

      void this.runTask(next);
    }
  }

  private async runTask(item: InternalTask): Promise<void> {
    let releasedWorker = false;

    const emitProgress = (loaded: number, total: number): void => {
      const normalizedLoaded = Number.isFinite(loaded) ? Math.max(0, loaded) : 0;
      const normalizedTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
      const percent =
        normalizedTotal > 0
          ? Math.min(100, (normalizedLoaded / normalizedTotal) * 100)
          : 0;

      this.emitProgress({
        fileId: item.task.fileId,
        loaded: normalizedLoaded,
        total: normalizedTotal,
        percent,
      });
    };

    try {
      await item.fetchFn(item.task, emitProgress);
      emitProgress(1, 1);
      this.emitComplete(item.task.fileId, true);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));

      if (item.attempts < MAX_RETRIES) {
        this.activeFileIds.delete(item.task.fileId);
        this.activeWorkers -= 1;
        releasedWorker = true;

        const retryTask: InternalTask = {
          ...item,
          attempts: item.attempts + 1,
          insertedAt: Date.now(),
        };

        this.queued.push(retryTask);
        this.queuedFileIds.add(item.task.fileId);
        this.sortQueue();
        this.schedulePump();
        return;
      }

      this.emitComplete(item.task.fileId, false, normalizedError);
    } finally {
      if (this.activeFileIds.has(item.task.fileId)) {
        this.activeFileIds.delete(item.task.fileId);
      }

      if (!releasedWorker) {
        this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      }
      this.schedulePump();
    }
  }

  private sortQueue(): void {
    this.queued.sort((a, b) => {
      if (a.task.priority === b.task.priority) {
        return a.insertedAt - b.insertedAt;
      }

      return b.task.priority - a.task.priority;
    });
  }

  private emitProgress(progress: DownloadProgress): void {
    for (const callback of this.progressCallbacks) {
      callback(progress);
    }
  }

  private emitComplete(fileId: string, success: boolean, error?: Error): void {
    for (const callback of this.completeCallbacks) {
      callback(fileId, success, error);
    }
  }
}
