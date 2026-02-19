"use client";

import { on } from "./download.events";

export type DownloadDiagnosticEvent = {
  at: number;
  type: string;
  payload: Record<string, unknown>;
};

const MAX_EVENTS = 300;
const events: DownloadDiagnosticEvent[] = [];
let subscribed = false;

function push(type: string, payload: Record<string, unknown>): void {
  events.push({
    at: Date.now(),
    type,
    payload,
  });

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

function ensureSubscriptions(): void {
  if (subscribed) {
    return;
  }

  subscribed = true;

  on("download:added", ({ task }) => {
    push("download:added", {
      taskId: task.id,
      fileId: task.fileId,
      state: task.state,
      progress: task.progress,
    });
  });

  on("download:progress", (payload) => {
    push("download:progress", {
      taskId: payload.taskId,
      progress: payload.progress,
      loadedBytes: payload.loadedBytes,
      totalBytes: payload.totalBytes,
    });
  });

  on("download:completed", (payload) => {
    push("download:completed", {
      taskId: payload.taskId,
    });
  });

  on("download:failed", (payload) => {
    push("download:failed", {
      taskId: payload.taskId,
      error: payload.error,
    });
  });

  on("download:paused", (payload) => {
    push("download:paused", {
      taskId: payload.taskId,
    });
  });

  on("download:canceled", (payload) => {
    push("download:canceled", {
      taskId: payload.taskId,
    });
  });
}

export function getDownloadDiagnostics(): DownloadDiagnosticEvent[] {
  ensureSubscriptions();
  return [...events];
}

export function clearDownloadDiagnostics(): void {
  events.length = 0;
}

ensureSubscriptions();
