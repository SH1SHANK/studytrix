"use client";

import { getAllFiles, setMetadata } from "@/features/offline/offline.db";
import { generateChecksum } from "@/features/offline/offline.integrity";
import { has } from "@/features/offline/offline.access";
import { markOfflineAvailability } from "@/features/offline/offline.index.store";
import { useSettingsStore } from "@/features/settings/settings.store";
import { storeOfflineFileVerified } from "@/features/storage/storage.service";
import type { OfflineFileRecord } from "@/features/offline/offline.types";

import { emit } from "./download.events";
import { useDownloadStore } from "./download.store";
import {
  DownloadQueue,
  type QueueLifecyclePayload,
  type QueueTaskContext,
} from "./download.queue";
import type { DownloadTask } from "./download.types";

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const DEFAULT_PRIORITY = 100;
const PROGRESS_INTERVAL_MS = 33;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 4;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_STORAGE_LIMIT_MB = 500;

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
  let concurrency = cores >= 12 ? 4 : cores >= 6 ? 3 : 2;

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

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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
  try {
    const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/metadata`, {
      method: "GET",
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as unknown;
    if (!isRecord(json) || !isRecord(json.metadata)) {
      return null;
    }

    const metadata = json.metadata;

    const name = parseString(metadata.name);
    const mimeType = parseString(metadata.mimeType);

    return {
      id: parseString(metadata.id) ?? fileId,
      name: name ?? fileId,
      mimeType: mimeType ?? "application/octet-stream",
      size: parseNumber(metadata.size) ?? 0,
      modifiedTime: parseString(metadata.modifiedTime) ?? null,
    };
  } catch {
    return null;
  }
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

async function readResponseErrorMessage(response: Response): Promise<string> {
  const fallback = `Download failed (${response.status})`;

  try {
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) {
      return fallback;
    }

    const message = parseString(payload.message);
    if (message) {
      return message;
    }

    const errorCode = parseString(payload.errorCode);
    return errorCode ? `${fallback}: ${errorCode}` : fallback;
  } catch {
    return fallback;
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
  }

  private handleLifecycle(payload: QueueLifecyclePayload): void {
    const task = this.tasks.get(payload.taskId);
    if (!task) {
      return;
    }

    const timestamp = now();

    if (payload.state === "queued") {
      const nextTask: DownloadTask = {
        ...task,
        state: "queued",
        error: undefined,
        updatedAt: timestamp,
      };
      this.tasks.set(payload.taskId, nextTask);
      emit("download:added", { task: nextTask });
      return;
    }

    if (payload.state === "running") {
      const nextTask: DownloadTask = {
        ...task,
        state: "downloading",
        error: undefined,
        updatedAt: timestamp,
      };
      this.tasks.set(payload.taskId, nextTask);
      emit("download:added", { task: nextTask });
      return;
    }

    if (payload.state === "paused") {
      this.tasks.set(payload.taskId, {
        ...task,
        state: "paused",
        updatedAt: timestamp,
      });
      emit("download:paused", { taskId: payload.taskId });
      return;
    }

    if (payload.state === "completed") {
      this.tasks.set(payload.taskId, {
        ...task,
        state: "completed",
        progress: 100,
        speedBytesPerSecond: undefined,
        etaSeconds: undefined,
        updatedAt: timestamp,
      });
      this.lastProgressAt.delete(payload.taskId);
      emit("download:completed", { taskId: payload.taskId });
      return;
    }

    if (payload.state === "canceled") {
      this.tasks.set(payload.taskId, {
        ...task,
        state: "canceled",
        speedBytesPerSecond: undefined,
        etaSeconds: undefined,
        updatedAt: timestamp,
      });
      this.lastProgressAt.delete(payload.taskId);
      emit("download:canceled", { taskId: payload.taskId });
      return;
    }

    if (payload.state === "failed") {
      this.tasks.set(payload.taskId, {
        ...task,
        state: "failed",
        error: payload.error,
        speedBytesPerSecond: undefined,
        etaSeconds: undefined,
        updatedAt: timestamp,
      });
      this.lastProgressAt.delete(payload.taskId);
      emit("download:failed", {
        taskId: payload.taskId,
        error: payload.error ?? "Download failed",
      });
    }
  }

  private async downloadAndPersist(
    taskId: string,
    fileId: string,
    context: QueueTaskContext,
    initialMetadata?: FileMetadata | null,
  ): Promise<void> {
    const metadata = initialMetadata ?? this.taskMetadata.get(taskId) ?? await fetchFileMetadata(fileId, context.signal);
    this.taskMetadata.set(taskId, metadata ?? null);
    const existingTask = this.tasks.get(taskId);

    if (existingTask && metadata) {
      const updatedTask: DownloadTask = {
        ...existingTask,
        fileName: metadata.name,
        size: metadata.size > 0 ? metadata.size : undefined,
        updatedAt: now(),
      };
      this.tasks.set(taskId, updatedTask);
      emit("download:added", { task: updatedTask });
    }

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
      throw new Error(await readResponseErrorMessage(response));
    }

    if (!response.body) {
      throw new Error("Streaming not supported");
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

    const mimeType = response.headers.get("content-type") ?? metadata?.mimeType ?? "application/octet-stream";
    const blob = new Blob([mergedBuffer], { type: mimeType });
    await enforceStorageLimit(blob.size);

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

    await storeOfflineFileVerified(record);

    await setMetadata({
      key: `integrity:${fileId}`,
      value: JSON.stringify({
        checksum,
        modifiedTime: metadata?.modifiedTime ?? null,
        cachedAt: timestamp,
      }),
    });

    await setMetadata({
      key: `storage-meta:${fileId}`,
      value: JSON.stringify({
        entityId: fileId,
        courseCode: metadata?.id ?? "GENERAL",
        source: "manual",
        downloadedAt: timestamp,
        status: "complete",
      }),
    });

    markOfflineAvailability(fileId);
  }

  private findActiveTaskByFileId(fileId: string): string | null {
    const tasks = useDownloadStore.getState().tasks;

    for (const task of Object.values(tasks)) {
      if (
        task.fileId === fileId
        && (task.state === "queued" || task.state === "downloading" || task.state === "paused")
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

  async startDownload(fileId: string): Promise<string> {
    const normalizedFileId = normalizeFileId(fileId);

    const activeTaskId = this.findActiveTaskByFileId(normalizedFileId);
    if (activeTaskId) {
      const existing = useDownloadStore.getState().tasks[activeTaskId];
      if (existing?.state === "paused") {
        this.resumeDownload(activeTaskId);
      }
      return activeTaskId;
    }

    const [alreadyOffline, metadata] = await Promise.all([
      has(normalizedFileId),
      fetchFileMetadata(normalizedFileId, new AbortController().signal),
    ]);
    const timestamp = now();
    const taskId = buildTaskId();

    const task: DownloadTask = {
      id: taskId,
      fileId: normalizedFileId,
      fileName: metadata?.name ?? normalizedFileId,
      size: metadata?.size ? metadata.size : undefined,
      progress: alreadyOffline ? 100 : 0,
      loadedBytes: alreadyOffline ? metadata?.size ?? 0 : 0,
      totalBytes: metadata?.size && metadata.size > 0 ? metadata.size : undefined,
      state: alreadyOffline ? "completed" : "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.tasks.set(taskId, task);
    this.taskMetadata.set(taskId, metadata ?? null);
    emit("download:added", { task });

    if (alreadyOffline) {
      emit("download:completed", { taskId });
      return taskId;
    }

    const queued = this.enqueueTask(taskId, normalizedFileId, metadata);

    if (!queued) {
      this.tasks.set(taskId, {
        ...task,
        state: "failed",
        error: "Task already queued",
        updatedAt: now(),
      });
      emit("download:failed", { taskId, error: "Task already queued" });
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
    if (!fallback || fallback.state !== "paused") {
      return;
    }

    this.tasks.set(taskId, fallback);
    const queued = this.enqueueTask(taskId, fallback.fileId);
    if (!queued) {
      this.tasks.set(taskId, {
        ...fallback,
        state: "failed",
        error: "Could not resume download",
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

  reorderDownload(taskId: string, newPriority: number): void {
    this.queue.reorder(taskId, newPriority);
  }

  removeTask(taskId: string): void {
    this.lastProgressAt.delete(taskId);
    this.taskMetadata.delete(taskId);
    const task = this.tasks.get(taskId) ?? useDownloadStore.getState().tasks[taskId];
    if (task) {
      this.partialBuffers.delete(task.fileId);
    }
    this.tasks.delete(taskId);
  }

  getTaskSnapshot(taskId: string): DownloadTask | null {
    return this.tasks.get(taskId) ?? null;
  }

  getErrorMessage(error: unknown): string {
    return mapErrorMessage(error);
  }
}

export const downloadController = new DownloadController();

export async function startDownload(fileId: string): Promise<string> {
  return downloadController.startDownload(fileId);
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
