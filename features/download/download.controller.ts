"use client";

import { getAllFiles, getFile, putFile, setMetadata } from "@/features/offline/offline.db";
import { isOfflineV3Enabled } from "@/features/offline/offline.flags";
import { generateChecksum } from "@/features/offline/offline.integrity";
import { markOfflineAvailability } from "@/features/offline/offline.index.store";
import { getActiveProvider } from "@/features/offline/offline.storage-location";
import { getAllNestedCommandSnapshots } from "@/features/command/command.localIndex";
import { useSettingsStore } from "@/features/settings/settings.store";
import { storeOfflineFileVerified } from "@/features/storage/storage.service";
import type { OfflineFileRecord } from "@/features/offline/offline.types";
import {
  getFileMetadataWithCache,
  writeDownloadMeta,
} from "@/features/file/file-metadata.client";
import type {
  CachedIndexableFileMessage,
  FilesCachedMessage,
} from "@/features/intelligence/intelligence.sw.types";

import { emit } from "./download.events";
import { useDownloadStore } from "./download.store";
import {
  DownloadQueue,
  type QueueLifecyclePayload,
  type QueueTaskContext,
} from "./download.queue";
import {
  DownloadRequestError,
  classifyDownloadErrorCode,
  computeRetryDelayMs,
  isTransientDownloadError,
  waitForRetryDelay,
} from "./download.resilience";
import type { DownloadTask } from "./download.types";

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const DEFAULT_PRIORITY = 100;
const PROGRESS_INTERVAL_MS = 33;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 3;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_STORAGE_LIMIT_MB = 500;
const MAX_NETWORK_HOLD_TASKS = 25;
const MAX_RETRY_ATTEMPTS = 3;
export const DOWNLOAD_MAX_RETRY_ATTEMPTS = MAX_RETRY_ATTEMPTS;
const METADATA_LOOKUP_TIMEOUT_MS = 2500;
const OFFLINE_RECORD_LOOKUP_TIMEOUT_MS = 2500;
const FINALIZE_STEP_TIMEOUT_MS = 15000;
const NON_CRITICAL_STEP_TIMEOUT_MS = 8000;
const DOWNLOAD_DEBUG_ENABLED = process.env.NODE_ENV !== "production";
const DEFAULT_STORAGE_COURSE_CODE = "GENERAL";

function logDownloadDebug(step: string, details?: Record<string, unknown>): void {
  if (!DOWNLOAD_DEBUG_ENABLED) {
    return;
  }

  if (details) {
    console.debug(`[Offline Debug] ${step}`, details);
    return;
  }

  console.debug(`[Offline Debug] ${step}`);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(onTimeout());
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    settled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    return result;
  } catch (error) {
    settled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

async function withTimeoutOrReject<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutErrorFactory: () => Error,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  return await new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(timeoutErrorFactory());
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
  });
}

export function shouldRetryDownloadAttempt(
  error: unknown,
  attempt: number,
  maxAttempts = DOWNLOAD_MAX_RETRY_ATTEMPTS,
): boolean {
  return attempt + 1 < maxAttempts && isTransientDownloadError(error);
}

function clampConcurrency(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CONCURRENCY;
  }

  return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, Math.floor(value)));
}

function resolveQueueConcurrency(): number {
  if (typeof navigator === "undefined") {
    return DEFAULT_CONCURRENCY;
  }

  const cores =
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 4;
  let concurrency = cores >= 12 ? 3 : cores >= 6 ? 3 : 2;

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  }).connection;
  if (connection?.saveData) {
    concurrency = 1;
  } else if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
    concurrency = 1;
  } else if (connection?.effectiveType === "3g") {
    concurrency = Math.min(concurrency, 2);
  }

  return clampConcurrency(concurrency);
}

type FileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
};

export type StartDownloadOptions = {
  kind?: "file" | "folder";
  hiddenInUi?: boolean;
  groupId?: string;
  groupLabel?: string;
  groupTotalFiles?: number;
  groupTotalBytes?: number;
};

function now(): number {
  return Date.now();
}

function buildTaskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `download_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFileId(fileId: string): string {
  const normalized = fileId.trim();
  if (!FILE_ID_PATTERN.test(normalized)) {
    throw new Error("Invalid file ID");
  }

  return normalized;
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizePositiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const next = Math.floor(value);
  return next > 0 ? next : undefined;
}

function toBreadcrumbPath(path: string, fileName: string): string {
  const normalizedPath = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalizedPath.length === 0) {
    return fileName;
  }

  return [...normalizedPath, fileName].join(" > ");
}

async function buildCachedIndexableFileMessage(params: {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
}): Promise<{ message: CachedIndexableFileMessage; courseCode: string }> {
  const snapshots = await getAllNestedCommandSnapshots().catch(() => []);
  const nestedEntry = snapshots
    .flatMap((snapshot) => snapshot.entries)
    .find((entry) => entry.id === params.fileId);

  if (!nestedEntry) {
    return {
      message: {
        fileId: params.fileId,
        name: params.name,
        fullPath: params.name,
        ancestorIds: [],
        depth: 0,
        repoKind: "global",
        isFolder: false,
        mimeType: params.mimeType,
        size: params.size,
        modifiedTime: params.modifiedTime ?? undefined,
      },
      courseCode: DEFAULT_STORAGE_COURSE_CODE,
    };
  }

  const repoKind = nestedEntry.courseCode.startsWith("PR") ? "personal" : "global";

  return {
    message: {
      fileId: params.fileId,
      name: params.name,
      fullPath: toBreadcrumbPath(nestedEntry.path, params.name),
      ancestorIds: [...nestedEntry.ancestorFolderIds],
      depth: nestedEntry.ancestorFolderIds.length,
      repoKind,
      isFolder: false,
      mimeType: params.mimeType,
      size: params.size,
      modifiedTime: params.modifiedTime ?? undefined,
      customFolderId: repoKind === "personal" ? nestedEntry.rootFolderId : undefined,
    },
    courseCode: nestedEntry.courseCode || DEFAULT_STORAGE_COURSE_CODE,
  };
}

function postFilesCachedToServiceWorker(files: CachedIndexableFileMessage[]): void {
  if (typeof window === "undefined" || files.length === 0) {
    return;
  }

  const payload: FilesCachedMessage = {
    type: "FILES_CACHED",
    files,
    emittedAt: Date.now(),
  };

  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage(payload);
    return;
  }

  void navigator.serviceWorker?.ready
    .then((registration) => {
      registration.active?.postMessage(payload);
    })
    .catch(() => undefined);
}

function resolveStorageLimitBytes(): number {
  const candidate = useSettingsStore.getState().values.storage_limit_mb;
  const parsed = typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : DEFAULT_STORAGE_LIMIT_MB;

  const normalizedMb = Math.max(100, Math.floor(parsed));
  return normalizedMb * 1024 * 1024;
}

async function enforceStorageLimit(nextFileSizeBytes: number): Promise<void> {
  const files = await getAllFiles();
  const currentUsage = files.reduce((total, file) => total + file.size, 0);
  const limit = resolveStorageLimitBytes();

  if (currentUsage + nextFileSizeBytes > limit) {
    throw new Error("Offline storage limit reached. Increase limit in settings.");
  }
}

async function fetchFileMetadata(fileId: string, signal: AbortSignal): Promise<FileMetadata | null> {
  const resolved = await withTimeout(
    getFileMetadataWithCache(fileId, {
      allowNetwork: true,
      signal,
    }),
    METADATA_LOOKUP_TIMEOUT_MS,
    () => {
      logDownloadDebug("Metadata lookup timed out; proceeding without metadata", {
        fileId,
        timeoutMs: METADATA_LOOKUP_TIMEOUT_MS,
      });
      return {
        metadata: null,
        source: "none" as const,
        isStale: true,
      };
    },
  );
  if (!resolved.metadata) {
    return null;
  }

  return {
    id: resolved.metadata.id,
    name: resolved.metadata.name,
    mimeType: resolved.metadata.mimeType,
    size: resolved.metadata.size,
    modifiedTime: resolved.metadata.modifiedTime,
  };
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function readContentLength(headers: Headers): number {
  const header = headers.get("content-length");
  if (!header) {
    return 0;
  }

  const parsed = Number.parseInt(header, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function parseTotalFromContentRange(header: string | null): number {
  if (!header) {
    return 0;
  }

  const slashIndex = header.lastIndexOf("/");
  if (slashIndex <= -1 || slashIndex >= header.length - 1) {
    return 0;
  }

  const parsed = Number.parseInt(header.slice(slashIndex + 1), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function mergeChunks(chunks: Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((size, chunk) => size + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output.buffer;
}

function concatArrayBuffers(left: ArrayBuffer, right: ArrayBuffer): ArrayBuffer {
  const output = new Uint8Array(left.byteLength + right.byteLength);
  output.set(new Uint8Array(left), 0);
  output.set(new Uint8Array(right), left.byteLength);
  return output.buffer;
}

function mapErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Download interrupted";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Download failed";
}

async function readResponseErrorPayload(
  response: Response,
): Promise<{ message: string; remoteErrorCode?: string }> {
  const fallback = `Download failed (${response.status})`;

  try {
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) {
      return { message: fallback };
    }

    const message = parseString(payload.message);
    const errorCode = parseString(payload.errorCode);
    if (message && errorCode) {
      return { message, remoteErrorCode: errorCode };
    }
    if (message) {
      return { message };
    }
    if (errorCode) {
      return {
        message: `${fallback}: ${errorCode}`,
        remoteErrorCode: errorCode,
      };
    }
    return { message: fallback };
  } catch {
    return { message: fallback };
  }
}

class DownloadController {
  private readonly queue = new DownloadQueue(resolveQueueConcurrency());

  private readonly tasks = new Map<string, DownloadTask>();

  private readonly lastProgressAt = new Map<string, number>();

  private readonly partialBuffers = new Map<string, ArrayBuffer>();

  private readonly taskMetadata = new Map<string, FileMetadata | null>();

  constructor() {
    this.syncFromStore(useDownloadStore.getState().tasks);
    useDownloadStore.subscribe((state) => {
      this.syncFromStore(state.tasks);
    });

    this.queue.onProgress((payload) => {
      const task = this.tasks.get(payload.taskId) ?? useDownloadStore.getState().tasks[payload.taskId];
      if (!task) {
        return;
      }

      const timestamp = now();
      const current = this.lastProgressAt.get(payload.taskId) ?? 0;
      if (timestamp - current < PROGRESS_INTERVAL_MS && payload.progress < 100) {
        return;
      }

      this.lastProgressAt.set(payload.taskId, timestamp);

      const nextTask: DownloadTask = {
        ...task,
        progress: payload.progress,
        loadedBytes: payload.loadedBytes,
        totalBytes: payload.totalBytes > 0 ? payload.totalBytes : task.totalBytes,
        progressMode: payload.totalBytes > 0 ? "determinate" : "indeterminate",
        state: payload.progress >= 100 ? task.state : "downloading",
        updatedAt: timestamp,
      };

      this.tasks.set(payload.taskId, nextTask);
    });

    this.queue.onLifecycle((payload) => {
      this.handleLifecycle(payload);
    });
  }

  private syncFromStore(storeTasks: Record<string, DownloadTask>): void {
    const activeIds = new Set<string>();
    for (const task of Object.values(storeTasks)) {
      activeIds.add(task.id);
      this.tasks.set(task.id, task);
      if (!this.taskMetadata.has(task.id)) {
        this.taskMetadata.set(task.id, null);
      }
    }

    for (const taskId of Array.from(this.tasks.keys())) {
      if (activeIds.has(taskId) || this.queue.hasTask(taskId)) {
        continue;
      }

      this.tasks.delete(taskId);
      this.lastProgressAt.delete(taskId);
      this.taskMetadata.delete(taskId);
    }

    this.refreshQueuePositions();
  }

  private refreshQueuePositions(): void {
    const queueLike = Array.from(this.tasks.values())
      .filter((task) => task.state === "queued" || task.state === "waiting")
      .sort((left, right) => left.createdAt - right.createdAt);

    const queuedById = new Map(queueLike.map((task, index) => [task.id, index + 1]));

    for (const task of Array.from(this.tasks.values())) {
      const queuePosition = queuedById.get(task.id);
      if (task.queuePosition === queuePosition) {
        continue;
      }

      const next: DownloadTask = {
        ...task,
        queuePosition,
      };
      this.tasks.set(task.id, next);
      useDownloadStore.getState().updateTask(task.id, {
        queuePosition,
        updatedAt: task.updatedAt,
      });
    }
  }

  private handleLifecycle(payload: QueueLifecyclePayload): void {
    const task = this.tasks.get(payload.taskId);
    if (!task) {
      return;
    }

    const timestamp = now();

    if (payload.state === "queued") {
      logDownloadDebug("Download lifecycle queued", {
        taskId: payload.taskId,
        fileId: task.fileId,
      });
      const nextTask: DownloadTask = {
        ...task,
        state: "queued",
        networkHold: false,
        error: undefined,
        errorCode: undefined,
        progressMode: "determinate",
        updatedAt: timestamp,
      };
      this.tasks.set(payload.taskId, nextTask);
      this.refreshQueuePositions();
      emit("download:added", { task: this.tasks.get(payload.taskId) ?? nextTask });
      return;
    }

    if (payload.state === "running") {
      logDownloadDebug("Download lifecycle running", {
        taskId: payload.taskId,
        fileId: task.fileId,
      });
      const nextTask: DownloadTask = {
        ...task,
        state: "downloading",
        networkHold: false,
        queuePosition: undefined,
        progressMode: task.progressMode ?? "determinate",
        error: undefined,
        errorCode: undefined,
        updatedAt: timestamp,
      };
      this.tasks.set(payload.taskId, nextTask);
      this.refreshQueuePositions();
      emit("download:added", { task: this.tasks.get(payload.taskId) ?? nextTask });
      return;
    }

    if (payload.state === "paused") {
      logDownloadDebug("Download lifecycle paused", {
        taskId: payload.taskId,
        fileId: task.fileId,
      });
      this.tasks.set(payload.taskId, {
        ...task,
        state: "paused",
        networkHold: false,
        queuePosition: undefined,
        updatedAt: timestamp,
      });
      this.refreshQueuePositions();
      emit("download:paused", { taskId: payload.taskId });
      return;
    }

    if (payload.state === "completed") {
      logDownloadDebug("Download lifecycle completed", {
        taskId: payload.taskId,
        fileId: task.fileId,
      });
      this.tasks.set(payload.taskId, {
        ...task,
        state: "completed",
        networkHold: false,
        queuePosition: undefined,
        progress: 100,
        progressMode: "determinate",
        speedBytesPerSecond: undefined,
        etaSeconds: undefined,
        errorCode: undefined,
        updatedAt: timestamp,
      });
      this.refreshQueuePositions();
      this.lastProgressAt.delete(payload.taskId);
      emit("download:completed", { taskId: payload.taskId });
      return;
    }

    if (payload.state === "canceled") {
      logDownloadDebug("Download lifecycle canceled", {
        taskId: payload.taskId,
        fileId: task.fileId,
      });
      this.tasks.set(payload.taskId, {
        ...task,
        state: "canceled",
        networkHold: false,
        queuePosition: undefined,
        speedBytesPerSecond: undefined,
        etaSeconds: undefined,
        errorCode: undefined,
        updatedAt: timestamp,
      });
      this.refreshQueuePositions();
      this.lastProgressAt.delete(payload.taskId);
      emit("download:canceled", { taskId: payload.taskId });
      return;
    }

    if (payload.state === "failed") {
      logDownloadDebug("Download lifecycle failed", {
        taskId: payload.taskId,
        fileId: task.fileId,
        error: payload.error ?? task.error ?? "Download failed",
      });
      const resolvedError = payload.error ?? task.error ?? "Download failed";
      const resolvedErrorCode = task.errorCode ?? classifyDownloadErrorCode(
        payload.error ?? new Error(resolvedError),
      );
      this.tasks.set(payload.taskId, {
        ...task,
        state: "failed",
        networkHold: false,
        queuePosition: undefined,
        error: resolvedError,
        errorCode: resolvedErrorCode,
        speedBytesPerSecond: undefined,
        etaSeconds: undefined,
        retryCount: task.retryCount ?? 0,
        updatedAt: timestamp,
      });
      this.refreshQueuePositions();
      this.lastProgressAt.delete(payload.taskId);
      emit("download:failed", {
        taskId: payload.taskId,
        error: resolvedError,
      });
    }
  }

  private updateTask(taskId: string, patch: Partial<DownloadTask>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.tasks.set(taskId, {
      ...task,
      ...patch,
      id: task.id,
      fileId: task.fileId,
      createdAt: task.createdAt,
      updatedAt: patch.updatedAt ?? now(),
    });
  }

  private setRetryProgress(taskId: string, retryCount: number, message?: string): void {
    const task = this.tasks.get(taskId) ?? useDownloadStore.getState().tasks[taskId];
    if (retryCount > 0 || message) {
      logDownloadDebug("Download retry progress", {
        taskId,
        fileId: task?.fileId ?? null,
        retryCount,
        message: message ?? null,
      });
    }
    this.updateTask(taskId, {
      retryCount,
      state: "downloading",
      queuePosition: undefined,
      error: message,
      errorCode: undefined,
      networkHold: false,
      updatedAt: now(),
    });
  }

  private setRetryFailure(taskId: string, retryCount: number, error: unknown): void {
    const task = this.tasks.get(taskId) ?? useDownloadStore.getState().tasks[taskId];
    logDownloadDebug("Download retry failure", {
      taskId,
      fileId: task?.fileId ?? null,
      retryCount,
      error: mapErrorMessage(error),
      errorCode: classifyDownloadErrorCode(error),
    });
    this.updateTask(taskId, {
      retryCount,
      error: mapErrorMessage(error),
      errorCode: classifyDownloadErrorCode(error),
      networkHold: false,
      updatedAt: now(),
    });
  }

  private async downloadAndPersist(
    taskId: string,
    fileId: string,
    context: QueueTaskContext,
    initialMetadata?: FileMetadata | null,
  ): Promise<void> {
    const metadata = initialMetadata
      ?? this.taskMetadata.get(taskId)
      ?? await fetchFileMetadata(fileId, context.signal);
    this.taskMetadata.set(taskId, metadata ?? null);
    logDownloadDebug("Resolved file metadata for download", {
      taskId,
      fileId,
      fileName: metadata?.name ?? null,
      size: metadata?.size ?? null,
      mimeType: metadata?.mimeType ?? null,
    });
    const existingTask = this.tasks.get(taskId);

    if (metadata) {
      await writeDownloadMeta(fileId, {
        id: metadata.id,
        name: metadata.name,
        mimeType: metadata.mimeType,
        size: metadata.size,
        modifiedTime: metadata.modifiedTime,
        providerKind: getActiveProvider()?.kind ?? "indexeddb",
      });
    }

    if (existingTask && metadata) {
      const updatedTask: DownloadTask = {
        ...existingTask,
        fileName: metadata.name,
        mimeType: metadata.mimeType,
        size: metadata.size > 0 ? metadata.size : undefined,
        updatedAt: now(),
      };
      this.tasks.set(taskId, updatedTask);
      emit("download:added", { task: updatedTask });
    }

    if (metadata?.size && metadata.size > 0) {
      await enforceStorageLimit(metadata.size);
      logDownloadDebug("Storage preflight passed", {
        taskId,
        fileId,
        size: metadata.size,
      });
    }

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
      this.setRetryProgress(taskId, attempt);
      logDownloadDebug("Download attempt started", {
        taskId,
        fileId,
        attempt: attempt + 1,
        maxAttempts: MAX_RETRY_ATTEMPTS,
      });

      try {
        await this.downloadAndPersistAttempt(taskId, fileId, context, metadata, existingTask);
        logDownloadDebug("Download attempt completed", {
          taskId,
          fileId,
          attempt: attempt + 1,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }

        this.setRetryFailure(taskId, attempt, error);

        const canRetry = shouldRetryDownloadAttempt(error, attempt, MAX_RETRY_ATTEMPTS);
        if (!canRetry) {
          throw error;
        }

        const nextAttempt = attempt + 1;
        const delayMs = computeRetryDelayMs(nextAttempt);
        logDownloadDebug("Scheduling download retry", {
          taskId,
          fileId,
          attemptFailed: attempt + 1,
          nextAttempt: nextAttempt + 1,
          delayMs,
        });
        this.setRetryProgress(
          taskId,
          nextAttempt,
          `Retrying (${nextAttempt + 1}/${MAX_RETRY_ATTEMPTS})...`,
        );
        await waitForRetryDelay(delayMs, context.signal);
      }
    }
  }

  private async downloadAndPersistAttempt(
    taskId: string,
    fileId: string,
    context: QueueTaskContext,
    metadata: FileMetadata | null,
    existingTask?: DownloadTask,
  ): Promise<void> {
    logDownloadDebug("Starting stream request", {
      taskId,
      fileId,
      hasMetadata: Boolean(metadata),
    });
    let startByte = this.partialBuffers.get(fileId)?.byteLength ?? 0;
    let existingPartial = startByte > 0 ? this.partialBuffers.get(fileId) ?? null : null;
    const buildHeaders = (rangeStart: number): HeadersInit => {
      if (rangeStart > 0) {
        return {
          Range: `bytes=${Math.floor(rangeStart)}-`,
        };
      }

      return {};
    };

    let response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
      method: "GET",
      signal: context.signal,
      cache: "no-store",
      headers: buildHeaders(startByte),
    });

    if (startByte > 0 && response.status !== 206) {
      startByte = 0;
      existingPartial = null;
      this.partialBuffers.delete(fileId);
      response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
        method: "GET",
        signal: context.signal,
        cache: "no-store",
      });
    }

    if (!response.ok) {
      const errorPayload = await readResponseErrorPayload(response);
      logDownloadDebug("Stream request failed", {
        taskId,
        fileId,
        status: response.status,
        error: errorPayload.message,
        remoteErrorCode: errorPayload.remoteErrorCode ?? null,
      });
      throw new DownloadRequestError(errorPayload.message, {
        status: response.status,
        remoteErrorCode: errorPayload.remoteErrorCode,
      });
    }

    logDownloadDebug("Stream response received", {
      taskId,
      fileId,
      status: response.status,
      contentLength: response.headers.get("content-length"),
      contentRange: response.headers.get("content-range"),
      contentType: response.headers.get("content-type"),
    });

    if (!response.body) {
      logDownloadDebug("Stream response missing body", {
        taskId,
        fileId,
        status: response.status,
      });
      throw new DownloadRequestError("Streaming not supported", {
        status: response.status || 500,
        remoteErrorCode: "DRIVE_STREAM_UNAVAILABLE",
      });
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    const rangeTotal = parseTotalFromContentRange(response.headers.get("content-range"));
    const contentLength = readContentLength(response.headers);
    const totalBytes = metadata?.size && metadata.size > 0
      ? metadata.size
      : rangeTotal > 0
        ? rangeTotal
        : contentLength > 0
          ? contentLength + startByte
          : 0;
    const hasReliableTotal = totalBytes > 0;

    let loadedBytes = startByte;
    context.emitProgress(loadedBytes, totalBytes);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        loadedBytes += value.byteLength;
        chunks.push(value);
        context.emitProgress(loadedBytes, totalBytes);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const streamedPartial = mergeChunks(chunks);
        if (streamedPartial.byteLength > 0 || startByte > 0) {
          const mergedPartial =
            startByte > 0 && existingPartial && existingPartial.byteLength === startByte
              ? concatArrayBuffers(existingPartial, streamedPartial)
              : streamedPartial;
          this.partialBuffers.set(fileId, mergedPartial);
        }
      }

      throw error;
    } finally {
      reader.releaseLock();
    }

    const streamedBuffer = mergeChunks(chunks);
    const mergedBuffer =
      startByte > 0 && existingPartial && existingPartial.byteLength === startByte
        ? concatArrayBuffers(existingPartial, streamedBuffer)
        : streamedBuffer;
    this.partialBuffers.delete(fileId);
    logDownloadDebug("Stream read completed", {
      taskId,
      fileId,
      loadedBytes,
      totalBytes,
      resumedFromBytes: startByte,
      chunkCount: chunks.length,
    });

    const mimeType = response.headers.get("content-type") ?? metadata?.mimeType ?? "application/octet-stream";
    const blob = new Blob([mergedBuffer], { type: mimeType });
    if (!(metadata?.size && metadata.size > 0)) {
      await withTimeout(
        enforceStorageLimit(blob.size),
        NON_CRITICAL_STEP_TIMEOUT_MS,
        () => {
          logDownloadDebug("Post-stream storage check timed out; proceeding", {
            taskId,
            fileId,
            timeoutMs: NON_CRITICAL_STEP_TIMEOUT_MS,
          });
        },
      );
    }
    const currentTask = this.tasks.get(taskId);
    if (currentTask) {
      const finalizedTask: DownloadTask = {
        ...currentTask,
        mimeType,
        size: blob.size > 0 ? blob.size : currentTask.size,
        loadedBytes: blob.size,
        totalBytes: blob.size,
        progressMode: hasReliableTotal ? "determinate" : "indeterminate",
        queuePosition: undefined,
        networkHold: false,
        error: undefined,
        errorCode: undefined,
        retryCount: currentTask.retryCount ?? 0,
        updatedAt: now(),
      };
      this.tasks.set(taskId, finalizedTask);
      emit("download:added", { task: finalizedTask });
    }

    await withTimeout(
      writeDownloadMeta(fileId, {
        id: metadata?.id ?? fileId,
        name: metadata?.name ?? (existingTask?.fileName ?? fileId),
        mimeType,
        size: blob.size,
        modifiedTime: metadata?.modifiedTime ?? null,
        downloadedAt: Date.now(),
        providerKind: getActiveProvider()?.kind ?? "indexeddb",
      }),
      NON_CRITICAL_STEP_TIMEOUT_MS,
      () => {
        logDownloadDebug("writeDownloadMeta timed out; proceeding", {
          taskId,
          fileId,
          timeoutMs: NON_CRITICAL_STEP_TIMEOUT_MS,
        });
      },
    );

    const checksum = await generateChecksum(blob);
    const timestamp = now();

    const record: OfflineFileRecord = {
      fileId,
      blob,
      size: blob.size,
      mimeType,
      modifiedTime: metadata?.modifiedTime ?? null,
      checksum,
      cachedAt: timestamp,
      lastAccessedAt: timestamp,
    };

    let persisted = false;
    let persistenceError: unknown = null;
    try {
      await withTimeoutOrReject(
        storeOfflineFileVerified(record),
        FINALIZE_STEP_TIMEOUT_MS,
        () => new Error("Timed out while verifying offline file persistence."),
      );
      persisted = true;
    } catch (error) {
      persistenceError = error;
      logDownloadDebug("Verified persistence failed; attempting direct write fallback", {
        taskId,
        fileId,
        error: mapErrorMessage(error),
      });
    }

    if (!persisted) {
      const activeProvider = getActiveProvider();
      if (activeProvider?.kind === "filesystem") {
        throw (
          persistenceError
          ?? new Error("Could not write file to selected offline folder.")
        );
      }

      await withTimeoutOrReject(
        putFile(record),
        FINALIZE_STEP_TIMEOUT_MS,
        () => new Error("Timed out while writing offline file."),
      );
    }

    markOfflineAvailability(fileId);
    logDownloadDebug("Persisted offline file", {
      taskId,
      fileId,
      size: blob.size,
      mimeType,
    });

    void withTimeout(
      setMetadata({
        key: `integrity:${fileId}`,
        value: JSON.stringify({
          checksum,
          modifiedTime: metadata?.modifiedTime ?? null,
          cachedAt: timestamp,
        }),
      }),
      NON_CRITICAL_STEP_TIMEOUT_MS,
      () => {
        logDownloadDebug("Integrity metadata write timed out; continuing", {
          taskId,
          fileId,
          timeoutMs: NON_CRITICAL_STEP_TIMEOUT_MS,
        });
      },
    ).catch((error) => {
      logDownloadDebug("Integrity metadata write failed; continuing", {
        taskId,
        fileId,
        error: mapErrorMessage(error),
      });
    });

    const cachedContext = await buildCachedIndexableFileMessage({
      fileId,
      name: metadata?.name ?? existingTask?.fileName ?? fileId,
      mimeType,
      size: blob.size,
      modifiedTime: metadata?.modifiedTime ?? null,
    }).catch(() => null);

    void withTimeout(
      setMetadata({
        key: `storage-meta:${fileId}`,
        value: JSON.stringify({
          entityId: fileId,
          courseCode: cachedContext?.courseCode ?? DEFAULT_STORAGE_COURSE_CODE,
          source: "manual",
          downloadedAt: timestamp,
          status: "complete",
        }),
      }),
      NON_CRITICAL_STEP_TIMEOUT_MS,
      () => {
        logDownloadDebug("Storage metadata write timed out; continuing", {
          taskId,
          fileId,
          timeoutMs: NON_CRITICAL_STEP_TIMEOUT_MS,
        });
      },
    ).catch((error) => {
      logDownloadDebug("Storage metadata write failed; continuing", {
        taskId,
        fileId,
        error: mapErrorMessage(error),
      });
    });

    if (cachedContext) {
      postFilesCachedToServiceWorker([cachedContext.message]);
    }

    logDownloadDebug("Download finalize stage completed", {
      taskId,
      fileId,
    });
  }

  private findActiveTaskByFileId(fileId: string): string | null {
    const tasks = useDownloadStore.getState().tasks;

    for (const task of Object.values(tasks)) {
      if (
        task.fileId === fileId
        && (task.state === "queued" || task.state === "waiting" || task.state === "downloading" || task.state === "paused")
      ) {
        return task.id;
      }
    }

    return null;
  }

  private enqueueTask(taskId: string, fileId: string, metadata?: FileMetadata | null): boolean {
    return this.queue.enqueue(
      taskId,
      async (context) => {
        await this.downloadAndPersist(taskId, fileId, context, metadata);
      },
      DEFAULT_PRIORITY,
    );
  }

  async startDownload(fileId: string, options?: StartDownloadOptions): Promise<string> {
    const normalizedFileId = normalizeFileId(fileId);
    logDownloadDebug("startDownload called", {
      fileId: normalizedFileId,
      kind: options?.kind ?? "file",
      hiddenInUi: Boolean(options?.hiddenInUi),
      groupId: options?.groupId ?? null,
    });

    const activeTaskId = this.findActiveTaskByFileId(normalizedFileId);
    if (activeTaskId) {
      const existing = useDownloadStore.getState().tasks[activeTaskId];
      if (existing) {
        let changed = false;
        let nextTask = existing;

        if (options?.groupId) {
          const nextHiddenInUi = Boolean(options.hiddenInUi);
          const nextGroupId = parseString(options.groupId);
          const nextGroupLabel = parseString(options.groupLabel);
          const nextGroupTotalFiles = normalizePositiveInt(options.groupTotalFiles);
          const nextGroupTotalBytes = normalizePositiveInt(options.groupTotalBytes);

          if (
            existing.hiddenInUi !== nextHiddenInUi
            || existing.groupId !== nextGroupId
            || existing.groupLabel !== nextGroupLabel
            || existing.groupTotalFiles !== nextGroupTotalFiles
            || existing.groupTotalBytes !== nextGroupTotalBytes
          ) {
            nextTask = {
              ...existing,
              hiddenInUi: nextHiddenInUi,
              groupId: nextGroupId,
              groupLabel: nextGroupLabel,
              groupTotalFiles: nextGroupTotalFiles,
              groupTotalBytes: nextGroupTotalBytes,
              updatedAt: now(),
            };
            changed = true;
          }
        } else if (existing.hiddenInUi || existing.groupId || existing.groupLabel) {
          nextTask = {
            ...existing,
            hiddenInUi: false,
            groupId: undefined,
            groupLabel: undefined,
            groupTotalFiles: undefined,
            groupTotalBytes: undefined,
            updatedAt: now(),
          };
          changed = true;
        }

        if (changed) {
          this.tasks.set(activeTaskId, nextTask);
          emit("download:added", { task: nextTask });
        }
      }

      if (existing?.state === "paused") {
        this.resumeDownload(activeTaskId);
      }
      logDownloadDebug("Reused active download task", {
        fileId: normalizedFileId,
        taskId: activeTaskId,
        state: existing?.state ?? "unknown",
      });
      return activeTaskId;
    }

    const [offlineRecord, metadata] = await Promise.all([
      withTimeout(
        getFile(normalizedFileId),
        OFFLINE_RECORD_LOOKUP_TIMEOUT_MS,
        () => {
          logDownloadDebug("Offline record lookup timed out; treating as not cached", {
            fileId: normalizedFileId,
            timeoutMs: OFFLINE_RECORD_LOOKUP_TIMEOUT_MS,
          });
          return undefined;
        },
      ),
      fetchFileMetadata(normalizedFileId, new AbortController().signal),
    ]);
    const alreadyOffline = Boolean(offlineRecord);
    const online = isOnline();
    const timestamp = now();
    const taskId = buildTaskId();

    if (!alreadyOffline && !online && isOfflineV3Enabled()) {
      const existingNetworkHold = Object.values(useDownloadStore.getState().tasks)
        .filter((task) => task.networkHold && (task.state === "queued" || task.state === "waiting"))
        .length;

      if (existingNetworkHold >= MAX_NETWORK_HOLD_TASKS) {
        logDownloadDebug("Queue blocked: offline hold limit reached", {
          fileId: normalizedFileId,
          limit: MAX_NETWORK_HOLD_TASKS,
        });
        throw new Error(`Offline queue full (${MAX_NETWORK_HOLD_TASKS}).`);
      }
    }

    const task: DownloadTask = {
      id: taskId,
      fileId: normalizedFileId,
      fileName: metadata?.name ?? normalizedFileId,
      kind: options?.kind === "folder" ? "folder" : "file",
      mimeType: metadata?.mimeType ?? offlineRecord?.mimeType,
      size:
        metadata?.size && metadata.size > 0
          ? metadata.size
          : offlineRecord?.size,
      hiddenInUi: Boolean(options?.hiddenInUi),
      groupId: parseString(options?.groupId),
      groupLabel: parseString(options?.groupLabel),
      groupTotalFiles: normalizePositiveInt(options?.groupTotalFiles),
      groupTotalBytes: normalizePositiveInt(options?.groupTotalBytes),
      progress: alreadyOffline ? 100 : 0,
      loadedBytes: alreadyOffline ? (offlineRecord?.size ?? metadata?.size ?? 0) : 0,
      totalBytes:
        metadata?.size && metadata.size > 0
          ? metadata.size
          : offlineRecord?.size,
      progressMode: "determinate",
      state: alreadyOffline
        ? "completed"
        : (!online && isOfflineV3Enabled() ? "waiting" : "queued"),
      networkHold: !alreadyOffline && !online && isOfflineV3Enabled(),
      retryCount: 0,
      error:
        !alreadyOffline && !online && isOfflineV3Enabled()
          ? "Waiting for connection"
          : undefined,
      errorCode:
        !alreadyOffline && !online && isOfflineV3Enabled()
          ? "NETWORK_ERROR"
          : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.tasks.set(taskId, task);
    this.refreshQueuePositions();
    this.taskMetadata.set(taskId, metadata ?? null);
    emit("download:added", { task: this.tasks.get(taskId) ?? task });
    logDownloadDebug("Task created", {
      fileId: normalizedFileId,
      taskId,
      state: task.state,
      online,
      alreadyOffline,
      networkHold: task.networkHold,
    });

    if (alreadyOffline) {
      await writeDownloadMeta(normalizedFileId, {
        id: metadata?.id ?? normalizedFileId,
        name: metadata?.name ?? task.fileName,
        mimeType: metadata?.mimeType ?? offlineRecord?.mimeType ?? "application/octet-stream",
        size: offlineRecord?.size ?? metadata?.size ?? 0,
        modifiedTime: metadata?.modifiedTime ?? offlineRecord?.modifiedTime ?? null,
        downloadedAt: Date.now(),
        providerKind: getActiveProvider()?.kind ?? "indexeddb",
      });
      emit("download:completed", { taskId });
      logDownloadDebug("Task already offline; marked completed", {
        fileId: normalizedFileId,
        taskId,
      });
      return taskId;
    }

    if (!online && isOfflineV3Enabled()) {
      logDownloadDebug("Task queued in network-hold mode", {
        fileId: normalizedFileId,
        taskId,
      });
      return taskId;
    }

    if (!online) {
      logDownloadDebug("Queue blocked: user offline and v3 disabled", {
        fileId: normalizedFileId,
      });
      throw new Error("You are offline.");
    }

    const queued = this.enqueueTask(taskId, normalizedFileId, metadata);

    if (!queued) {
      logDownloadDebug("Queue enqueue failed", {
        fileId: normalizedFileId,
        taskId,
      });
      this.tasks.set(taskId, {
        ...task,
        state: "failed",
        error: "Task already queued",
        errorCode: "UNKNOWN",
        queuePosition: undefined,
        retryCount: task.retryCount ?? 0,
        updatedAt: now(),
      });
      this.refreshQueuePositions();
      emit("download:failed", { taskId, error: "Task already queued" });
    } else {
      this.refreshQueuePositions();
      logDownloadDebug("Queue enqueue succeeded", {
        fileId: normalizedFileId,
        taskId,
      });
    }

    return taskId;
  }

  pauseDownload(taskId: string): void {
    this.queue.pause(taskId);
  }

  resumeDownload(taskId: string): void {
    const resumed = this.queue.resume(taskId);
    if (resumed) {
      return;
    }

    const fallback = this.tasks.get(taskId) ?? useDownloadStore.getState().tasks[taskId];
    if (!fallback) {
      return;
    }

    if (fallback.networkHold) {
      if (!isOnline()) {
        return;
      }

      this.tasks.set(taskId, {
        ...fallback,
        state: "queued",
        queuePosition: undefined,
        networkHold: false,
        error: undefined,
        errorCode: undefined,
        updatedAt: now(),
      });
      emit("download:added", {
        task: {
          ...fallback,
          state: "queued",
          queuePosition: undefined,
          networkHold: false,
          error: undefined,
          errorCode: undefined,
          updatedAt: now(),
        },
      });
      this.refreshQueuePositions();
      const queued = this.enqueueTask(taskId, fallback.fileId, this.taskMetadata.get(taskId) ?? null);
      if (!queued) {
        emit("download:failed", {
          taskId,
          error: "Could not resume download",
        });
      }
      return;
    }

    if (fallback.state !== "paused") {
      return;
    }

    this.tasks.set(taskId, {
      ...fallback,
      state: "queued",
      queuePosition: undefined,
      error: undefined,
      errorCode: undefined,
      updatedAt: now(),
    });
    this.refreshQueuePositions();
    const queued = this.enqueueTask(taskId, fallback.fileId);
    if (!queued) {
      this.tasks.set(taskId, {
        ...fallback,
        state: "failed",
        error: "Could not resume download",
        errorCode: "UNKNOWN",
        queuePosition: undefined,
        retryCount: fallback.retryCount ?? 0,
        updatedAt: now(),
      });
      emit("download:failed", { taskId, error: "Could not resume download" });
    }
  }

  cancelDownload(taskId: string): void {
    this.queue.cancel(taskId);
    this.lastProgressAt.delete(taskId);
    const task = this.tasks.get(taskId) ?? useDownloadStore.getState().tasks[taskId];
    if (task) {
      this.partialBuffers.delete(task.fileId);
    }
  }

  removeTask(taskId: string): void {
    this.lastProgressAt.delete(taskId);
    this.taskMetadata.delete(taskId);
    const task = this.tasks.get(taskId) ?? useDownloadStore.getState().tasks[taskId];
    if (task) {
      this.partialBuffers.delete(task.fileId);
    }
    this.tasks.delete(taskId);
    this.refreshQueuePositions();
  }

}

export const downloadController = new DownloadController();

export async function startDownload(fileId: string, options?: StartDownloadOptions): Promise<string> {
  return downloadController.startDownload(fileId, options);
}

export function pauseDownload(taskId: string): void {
  downloadController.pauseDownload(taskId);
}

export function resumeDownload(taskId: string): void {
  downloadController.resumeDownload(taskId);
}

export function cancelDownload(taskId: string): void {
  downloadController.cancelDownload(taskId);
}

export function removeDownloadTask(taskId: string): void {
  downloadController.removeTask(taskId);
}

export function listNetworkHoldTaskIds(): string[] {
  return Object.values(useDownloadStore.getState().tasks)
    .filter((task) => task.networkHold && (task.state === "queued" || task.state === "waiting"))
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((task) => task.id);
}
