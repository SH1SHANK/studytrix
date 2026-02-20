"use client";

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { runOfflineV2Migration } from "@/features/offline/offline.migration";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import { getFile } from "@/features/offline/offline.db";
import { useSettingsStore } from "@/features/settings/settings.store";
import { getFileMetadataWithCache } from "@/features/file/file-metadata.client";
import "@/features/download/download.diagnostics";
import {
  cancelDownload,
  pauseDownload,
  removeDownloadTask,
  resumeDownload,
  startDownload,
} from "@/features/download/download.controller";
import { animateToDownloadButton } from "@/features/download/download.animation";
import { on } from "@/features/download/download.events";
import { useDownloadStore } from "@/features/download/download.store";

export const DOWNLOAD_BUTTON_ELEMENT_ID = "download-manager-button";
const LEGACY_DOWNLOAD_SW_PATH = "/service-worker.js";
let feedbackSubscribed = false;
const announcedDownloads = new Set<string>();

function isLegacyDownloadRegistration(
  registration: ServiceWorkerRegistration,
): boolean {
  const candidate = registration.active ?? registration.installing ?? registration.waiting;
  if (!candidate) {
    return false;
  }

  try {
    const scriptUrl = new URL(candidate.scriptURL);
    return scriptUrl.pathname === LEGACY_DOWNLOAD_SW_PATH;
  } catch {
    return false;
  }
}

async function cleanupLegacyDownloadServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => isLegacyDownloadRegistration(registration))
        .map(async (registration) => {
          await registration.unregister();
        }),
    );
  } catch {
    // Best effort cleanup: SW removal should never block download UI.
  }
}

async function repairCompletedTaskMetadata(): Promise<void> {
  const snapshot = useDownloadStore.getState().tasks;
  const entries = Object.values(snapshot);

  for (const task of entries) {
    if (task.state !== "completed") {
      continue;
    }

    const knownSize = task.totalBytes ?? task.size ?? task.loadedBytes ?? 0;
    const requiresRepair = knownSize <= 1 || !task.mimeType;
    if (!requiresRepair) {
      continue;
    }

    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    const resolved = await getFileMetadataWithCache(task.fileId, {
      allowNetwork: online,
    });

    if (resolved.metadata) {
      const nextSize =
        resolved.metadata.size > 0
          ? resolved.metadata.size
          : knownSize;
      useDownloadStore.getState().updateTask(task.id, {
        fileName: resolved.metadata.name || task.fileName,
        mimeType: resolved.metadata.mimeType || task.mimeType,
        size: nextSize > 0 ? nextSize : task.size,
        loadedBytes: nextSize > 0 ? nextSize : task.loadedBytes,
        totalBytes: nextSize > 0 ? nextSize : task.totalBytes,
        updatedAt: Date.now(),
      });
      continue;
    }

    const record = await getFile(task.fileId);
    if (!record || record.size <= 0) {
      continue;
    }

    useDownloadStore.getState().updateTask(task.id, {
      mimeType: record.mimeType || record.blob.type || "application/octet-stream",
      size: record.size,
      loadedBytes: record.size,
      totalBytes: record.size,
      updatedAt: Date.now(),
    });
  }
}

function vibrate(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

function ensureFeedbackSubscriptions(): void {
  if (feedbackSubscribed) {
    return;
  }

  feedbackSubscribed = true;

  on("download:added", ({ task }) => {
    if (announcedDownloads.has(task.id)) {
      return;
    }

    announcedDownloads.add(task.id);
    toast.message(`Queued: ${task.fileName}`);
  });

  on("download:completed", ({ taskId }) => {
    const task = useDownloadStore.getState().tasks[taskId];
    toast.success(`Offline ready: ${task?.fileName ?? "File"}`);
    vibrate(10);
  });

  on("download:failed", ({ taskId, error }) => {
    const task = useDownloadStore.getState().tasks[taskId];
    toast.error(`${task?.fileName ?? "Download"} failed: ${error}`);
    vibrate(14);
  });

  on("download:paused", ({ taskId }) => {
    const task = useDownloadStore.getState().tasks[taskId];
    toast.message(`Paused: ${task?.fileName ?? "Download"}`);
  });

  on("download:canceled", ({ taskId }) => {
    const task = useDownloadStore.getState().tasks[taskId];
    toast.message(`Canceled: ${task?.fileName ?? "Download"}`);
  });
}

export function useDownloadManager() {
  const tasks = useDownloadStore((state) => state.tasks);
  const activeCount = useDownloadStore((state) => state.activeCount);
  const isDrawerOpen = useDownloadStore((state) => state.isDrawerOpen);
  const openDrawer = useDownloadStore((state) => state.openDrawer);
  const closeDrawer = useDownloadStore((state) => state.closeDrawer);
  const clearCompletedInStore = useDownloadStore((state) => state.clearCompleted);
  const removeTaskInStore = useDownloadStore((state) => state.removeTask);

  useEffect(() => {
    void cleanupLegacyDownloadServiceWorker();
    ensureFeedbackSubscriptions();
    void useSettingsStore.getState().initialize();
    void repairCompletedTaskMetadata();
    void (async () => {
      const didMigrate = await runOfflineV2Migration();
      if (didMigrate) {
        await useOfflineIndexStore.getState().hydrate();
      }
    })();
  }, []);

  const start = useCallback(async (fileId: string) => {
    vibrate(8);
    try {
      return await startDownload(fileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start download";
      toast.error(message);
      return "";
    }
  }, []);

  const pause = useCallback((taskId: string) => {
    pauseDownload(taskId);
  }, []);

  const resume = useCallback((taskId: string) => {
    resumeDownload(taskId);
  }, []);

  const cancel = useCallback((taskId: string) => {
    cancelDownload(taskId);
  }, []);

  const removeTask = useCallback((taskId: string) => {
    removeDownloadTask(taskId);
    removeTaskInStore(taskId);
  }, [removeTaskInStore]);

  const clearCompleted = useCallback(() => {
    const snapshot = useDownloadStore.getState().tasks;
    for (const task of Object.values(snapshot)) {
      if (task.state === "completed") {
        removeDownloadTask(task.id);
      }
    }
    clearCompletedInStore();
  }, [clearCompletedInStore]);

  const animateDownload = useCallback((sourceElement: HTMLElement | null) => {
    if (!sourceElement) {
      return;
    }

    const target = document.getElementById(DOWNLOAD_BUTTON_ELEMENT_ID);
    if (!target) {
      return;
    }

    animateToDownloadButton(sourceElement, target);
  }, []);

  return useMemo(
    () => ({
      tasks,
      activeCount,
      isDrawerOpen,
      startDownload: start,
      pauseDownload: pause,
      resumeDownload: resume,
      cancelDownload: cancel,
      openDrawer,
      closeDrawer,
      clearCompleted,
      removeTask,
      animateDownload,
    }),
    [
      tasks,
      activeCount,
      isDrawerOpen,
      start,
      pause,
      resume,
      cancel,
      openDrawer,
      closeDrawer,
      clearCompleted,
      removeTask,
      animateDownload,
    ],
  );
}
