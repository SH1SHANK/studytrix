"use client";

import { listNetworkHoldTaskIds, resumeDownload } from "@/features/download/download.controller";
import { useDownloadStore } from "@/features/download/download.store";
import { isOfflineV3Enabled } from "@/features/offline/offline.flags";
import { prune } from "@/features/offline/offline.query-cache.db";
import { useOfflineConnectivityStore } from "@/features/offline/offline.connectivity.store";

const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;
const RESUME_CONCURRENCY = 2;
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1500;

let intervalId: number | null = null;
let cleanupVisibility: (() => void) | null = null;
let started = false;
const inFlight = new Set<string>();
const attemptsByTask = new Map<string, number>();

function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function withJitter(ms: number): number {
  const jitter = 0.2 * ms;
  const offset = (Math.random() * (jitter * 2)) - jitter;
  return Math.max(100, Math.floor(ms + offset));
}

function retryDelay(attempt: number): number {
  return withJitter(BASE_RETRY_DELAY_MS * (2 ** Math.max(0, attempt - 1)));
}

function markSynced(): void {
  useOfflineConnectivityStore.getState().markSync(Date.now());
}

function scheduleRetry(taskId: string): void {
  const attempt = (attemptsByTask.get(taskId) ?? 0) + 1;
  attemptsByTask.set(taskId, attempt);

  if (attempt > MAX_ATTEMPTS) {
    const task = useDownloadStore.getState().tasks[taskId];
    if (task) {
      useDownloadStore.getState().updateTask(taskId, {
        networkHold: false,
        state: "failed",
        error: "Could not resume after reconnect",
        errorCode: "NETWORK",
        updatedAt: Date.now(),
      });
    }
    return;
  }

  const delay = retryDelay(attempt);
  window.setTimeout(() => {
    if (!isOnline()) {
      scheduleRetry(taskId);
      return;
    }

    void tryResumeTask(taskId);
  }, delay);
}

async function tryResumeTask(taskId: string): Promise<void> {
  if (!isOfflineV3Enabled() || !isOnline()) {
    return;
  }

  if (inFlight.has(taskId)) {
    return;
  }

  inFlight.add(taskId);
  try {
    resumeDownload(taskId);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 250);
    });

    const task = useDownloadStore.getState().tasks[taskId];
    if (!task) {
      attemptsByTask.delete(taskId);
      return;
    }

    if (!task.networkHold) {
      attemptsByTask.delete(taskId);
      return;
    }

    scheduleRetry(taskId);
  } finally {
    inFlight.delete(taskId);
  }
}

async function drainNetworkHoldQueue(): Promise<void> {
  if (!isOfflineV3Enabled() || !isOnline()) {
    return;
  }

  const candidates = listNetworkHoldTaskIds()
    .filter((taskId) => !inFlight.has(taskId))
    .slice(0, RESUME_CONCURRENCY);

  await Promise.all(candidates.map((taskId) => tryResumeTask(taskId)));
}

async function runSyncCycle(): Promise<void> {
  if (!isOfflineV3Enabled() || !isOnline()) {
    return;
  }

  await Promise.all([
    drainNetworkHoldQueue(),
    prune(),
  ]);
  markSynced();
}

export function startOfflineSyncScheduler(): () => void {
  if (started) {
    return stopOfflineSyncScheduler;
  }

  started = true;

  void runSyncCycle();
  intervalId = window.setInterval(() => {
    void runSyncCycle();
  }, SCHEDULER_INTERVAL_MS);

  const onOnline = () => {
    void runSyncCycle();
  };
  window.addEventListener("online", onOnline);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void runSyncCycle();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  cleanupVisibility = () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibility);
  };

  return stopOfflineSyncScheduler;
}

export function stopOfflineSyncScheduler(): void {
  if (!started) {
    return;
  }

  started = false;
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  cleanupVisibility?.();
  cleanupVisibility = null;
}

export function triggerOfflineSyncCycle(): void {
  if (!started) {
    return;
  }

  void runSyncCycle();
}
