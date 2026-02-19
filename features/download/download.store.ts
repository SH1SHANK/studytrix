"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { on } from "./download.events";
import type { DownloadTask } from "./download.types";

type DownloadStoreState = {
  tasks: Record<string, DownloadTask>;
  activeCount: number;
  isDrawerOpen: boolean;
  addTask: (task: DownloadTask) => void;
  updateTask: (taskId: string, patch: Partial<DownloadTask>) => void;
  updateProgress: (
    taskId: string,
    payload: {
      progress: number;
      loadedBytes: number;
      totalBytes: number;
    },
  ) => void;
  removeTask: (taskId: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCompleted: () => void;
};

const DOWNLOAD_STORE_PERSIST_KEY = "studytrix-download-store-v1";
const MAX_PERSISTED_TASKS = 300;
const RESTORED_TASK_MESSAGE = "Paused after app restart. Resume to continue.";
const ACTIVE_STATES = new Set<DownloadTask["state"]>(["queued", "downloading", "paused"]);
const TERMINAL_STATES = new Set<DownloadTask["state"]>(["completed", "failed", "canceled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function normalizeByteCount(value: unknown): number | undefined {
  const parsed = normalizeFiniteNumber(value, -1);
  if (parsed < 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function sanitizeTask(task: unknown): DownloadTask | null {
  if (!isRecord(task)) {
    return null;
  }

  const id = typeof task.id === "string" ? task.id.trim() : "";
  const fileId = typeof task.fileId === "string" ? task.fileId.trim() : "";
  const fileName = typeof task.fileName === "string" ? task.fileName.trim() : "";
  if (!id || !fileId || !fileName) {
    return null;
  }

  const createdAt = Math.max(0, Math.floor(normalizeFiniteNumber(task.createdAt, Date.now())));
  const updatedAt = Math.max(createdAt, Math.floor(normalizeFiniteNumber(task.updatedAt, createdAt)));
  const loadedBytes = normalizeByteCount(task.loadedBytes);
  const totalBytes = normalizeByteCount(task.totalBytes);
  const safeProgress = Math.max(0, Math.min(100, normalizeFiniteNumber(task.progress, 0)));

  const state: DownloadTask["state"] =
    task.state === "queued"
    || task.state === "downloading"
    || task.state === "paused"
    || task.state === "completed"
    || task.state === "failed"
    || task.state === "canceled"
      ? task.state
      : "failed";

  const normalizedState =
    state === "queued" || state === "downloading"
      ? "paused"
      : state;

  const speedBytesPerSecond = normalizeFiniteNumber(task.speedBytesPerSecond, 0);
  const etaSeconds = normalizeFiniteNumber(task.etaSeconds, -1);

  return {
    id,
    fileId,
    fileName,
    courseCode: typeof task.courseCode === "string" ? task.courseCode : undefined,
    size: normalizeByteCount(task.size),
    progress: normalizedState === "completed" ? 100 : safeProgress,
    loadedBytes,
    totalBytes,
    speedBytesPerSecond: speedBytesPerSecond > 0 ? speedBytesPerSecond : undefined,
    etaSeconds: etaSeconds > 0 ? Math.floor(etaSeconds) : undefined,
    state: normalizedState,
    error:
      normalizedState === "paused" && (state === "queued" || state === "downloading")
        ? RESTORED_TASK_MESSAGE
        : (typeof task.error === "string" && task.error.trim()) || undefined,
    createdAt,
    updatedAt,
  };
}

function sanitizeTasks(tasks: unknown): Record<string, DownloadTask> {
  if (!isRecord(tasks)) {
    return {};
  }

  const restored = Object.values(tasks)
    .map((task) => sanitizeTask(task))
    .filter((task): task is DownloadTask => task !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_PERSISTED_TASKS);

  const normalized: Record<string, DownloadTask> = {};
  for (const task of restored) {
    normalized[task.id] = task;
  }

  return normalized;
}

function computeActiveCount(tasks: Record<string, DownloadTask>): number {
  let count = 0;
  for (const task of Object.values(tasks)) {
    if (ACTIVE_STATES.has(task.state)) {
      count += 1;
    }
  }
  return count;
}

export const useDownloadStore = create<DownloadStoreState>()(persist(
  (set) => ({
    tasks: {},
    activeCount: 0,
    isDrawerOpen: false,

    addTask: (task) => {
      set((state) => {
        const nextTasks = {
          ...state.tasks,
          [task.id]: task,
        };

        return {
          tasks: nextTasks,
          activeCount: computeActiveCount(nextTasks),
        };
      });
    },

    updateTask: (taskId, patch) => {
      set((state) => {
        const current = state.tasks[taskId];
        if (!current) {
          return state;
        }

        const nextTask: DownloadTask = {
          ...current,
          ...patch,
          id: current.id,
          fileId: current.fileId,
          createdAt: current.createdAt,
          updatedAt: patch.updatedAt ?? Date.now(),
        };

        const nextTasks = {
          ...state.tasks,
          [taskId]: nextTask,
        };

        return {
          tasks: nextTasks,
          activeCount: computeActiveCount(nextTasks),
        };
      });
    },

    updateProgress: (taskId, payload) => {
      set((state) => {
        const current = state.tasks[taskId];
        if (!current || TERMINAL_STATES.has(current.state)) {
          return state;
        }

        const timestamp = Date.now();
        const normalizedLoaded = Math.max(0, Math.floor(normalizeFiniteNumber(payload.loadedBytes, 0)));
        const normalizedTotal = Math.max(0, Math.floor(normalizeFiniteNumber(payload.totalBytes, 0)));
        const safeProgress = Number.isFinite(payload.progress)
          ? Math.max(0, Math.min(100, payload.progress))
          : (normalizedTotal > 0 ? Math.min(100, (normalizedLoaded / normalizedTotal) * 100) : current.progress);

        const previousLoaded = Math.max(0, current.loadedBytes ?? 0);
        const elapsedMs = Math.max(1, timestamp - current.updatedAt);
        const deltaBytes = Math.max(0, normalizedLoaded - previousLoaded);
        const instantaneousSpeed = (deltaBytes * 1000) / elapsedMs;
        const previousSpeed = current.speedBytesPerSecond ?? 0;
        const speedBytesPerSecond = instantaneousSpeed > 0
          ? (previousSpeed > 0 ? (previousSpeed * 0.7) + (instantaneousSpeed * 0.3) : instantaneousSpeed)
          : previousSpeed;
        const remainingBytes =
          normalizedTotal > normalizedLoaded
            ? normalizedTotal - normalizedLoaded
            : 0;
        const etaSeconds =
          speedBytesPerSecond > 0 && remainingBytes > 0
            ? Math.ceil(remainingBytes / speedBytesPerSecond)
            : undefined;

        const nextTask: DownloadTask = {
          ...current,
          progress: safeProgress,
          loadedBytes: normalizedLoaded,
          totalBytes: normalizedTotal > 0 ? normalizedTotal : current.totalBytes,
          speedBytesPerSecond: speedBytesPerSecond > 0 ? speedBytesPerSecond : current.speedBytesPerSecond,
          etaSeconds,
          state: safeProgress >= 100 ? current.state : "downloading",
          error: undefined,
          updatedAt: timestamp,
        };

        const nextTasks = {
          ...state.tasks,
          [taskId]: nextTask,
        };

        return {
          tasks: nextTasks,
          activeCount: computeActiveCount(nextTasks),
        };
      });
    },

    removeTask: (taskId) => {
      set((state) => {
        if (!state.tasks[taskId]) {
          return state;
        }

        const nextTasks = { ...state.tasks };
        delete nextTasks[taskId];

        return {
          tasks: nextTasks,
          activeCount: computeActiveCount(nextTasks),
        };
      });
    },

    openDrawer: () => {
      set({ isDrawerOpen: true });
    },

    closeDrawer: () => {
      set({ isDrawerOpen: false });
    },

    clearCompleted: () => {
      set((state) => {
        const nextTasks: Record<string, DownloadTask> = {};

        for (const task of Object.values(state.tasks)) {
          if (task.state === "completed") {
            continue;
          }

          nextTasks[task.id] = task;
        }

        return {
          tasks: nextTasks,
          activeCount: computeActiveCount(nextTasks),
        };
      });
    },
  }),
  {
    name: DOWNLOAD_STORE_PERSIST_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => {
      const tasks = sanitizeTasks(state.tasks);
      return {
        tasks,
        activeCount: computeActiveCount(tasks),
      };
    },
    merge: (persistedState, currentState) => {
      const persistedTasks = sanitizeTasks((persistedState as { tasks?: unknown } | null)?.tasks ?? {});
      return {
        ...currentState,
        tasks: persistedTasks,
        activeCount: computeActiveCount(persistedTasks),
        isDrawerOpen: false,
      };
    },
  },
));

let subscribed = false;

function ensureEventSubscriptions(): void {
  if (subscribed) {
    return;
  }

  subscribed = true;

  on("download:added", ({ task }) => {
    useDownloadStore.getState().addTask(task);
  });

  on("download:progress", ({ taskId, progress, loadedBytes, totalBytes }) => {
    useDownloadStore.getState().updateProgress(taskId, {
      progress,
      loadedBytes,
      totalBytes,
    });
  });

  on("download:completed", ({ taskId }) => {
    const current = useDownloadStore.getState().tasks[taskId];
    useDownloadStore.getState().updateTask(taskId, {
      progress: 100,
      loadedBytes: current?.totalBytes ?? current?.loadedBytes,
      state: "completed",
      speedBytesPerSecond: undefined,
      etaSeconds: undefined,
      error: undefined,
      updatedAt: Date.now(),
    });
  });

  on("download:failed", ({ taskId, error }) => {
    useDownloadStore.getState().updateTask(taskId, {
      state: "failed",
      speedBytesPerSecond: undefined,
      etaSeconds: undefined,
      error,
      updatedAt: Date.now(),
    });
  });

  on("download:paused", ({ taskId }) => {
    useDownloadStore.getState().updateTask(taskId, {
      state: "paused",
      speedBytesPerSecond: undefined,
      etaSeconds: undefined,
      updatedAt: Date.now(),
    });
  });

  on("download:canceled", ({ taskId }) => {
    useDownloadStore.getState().updateTask(taskId, {
      state: "canceled",
      speedBytesPerSecond: undefined,
      etaSeconds: undefined,
      updatedAt: Date.now(),
    });
  });
}

ensureEventSubscriptions();
