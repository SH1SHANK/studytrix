import {
  clearFiles,
  clearMetadata,
  clearSearchIndex,
  deleteFile,
  deleteSearchIndex,
  getAllFiles,
  getFile,
  putFile,
  setMetadata,
  updateLastAccess,
} from "./offline.db";
import { generateChecksum } from "./offline.integrity";
import { DownloadQueue, type QueueFetchFn } from "./offline.queue";
import { shouldDownload } from "./offline.rules";
import { extractTextForSearch, indexFileText } from "./offline.search";
import type {
  CacheFileMetadata,
  DownloadProgress,
  DownloadRules,
  FetchStreamFn,
  OfflineFileRecord,
  StorageStats,
} from "./offline.types";

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const DEFAULT_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

type PendingJob = {
  resolve: () => void;
  reject: (error: Error) => void;
  promise: Promise<void>;
};

type CompletionListener = (
  fileId: string,
  success: boolean,
  error?: Error,
) => void;

type ProgressListener = (progress: DownloadProgress) => void;

function normalizeFileId(fileId: string): string {
  const normalized = fileId.trim();

  if (!normalized || !FILE_ID_PATTERN.test(normalized) || normalized.length > 256) {
    throw new Error("Invalid file ID");
  }

  return normalized;
}

function normalizeMaxFileSize(rules: DownloadRules): number {
  if (
    typeof rules.maxFileSizeBytes === "number" &&
    Number.isFinite(rules.maxFileSizeBytes) &&
    rules.maxFileSizeBytes > 0
  ) {
    return rules.maxFileSizeBytes;
  }

  return DEFAULT_MAX_FILE_SIZE_BYTES;
}

function parseContentLength(headers: Headers): number {
  const raw = headers.get("content-length");
  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

async function streamToBlob(
  response: Response,
  mimeType: string,
  expectedTotal: number,
  maxAllowedSize: number,
  emitProgress: (loaded: number, total: number) => void,
): Promise<Blob> {
  if (!response.body) {
    throw new Error("Stream unavailable");
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];

  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    loaded += value.byteLength;

    if (loaded > maxAllowedSize) {
      throw new Error("File exceeds maximum size");
    }

    chunks.push(new Uint8Array(value));
    emitProgress(loaded, expectedTotal);
  }

  const blob = new Blob(chunks, {
    type: mimeType || "application/octet-stream",
  });

  emitProgress(blob.size, expectedTotal > 0 ? expectedTotal : blob.size);

  return blob;
}

export class OfflineService {
  private readonly queue = new DownloadQueue();

  private readonly pendingJobs = new Map<string, PendingJob>();

  private readonly progressListeners = new Set<ProgressListener>();

  private readonly completionListeners = new Set<CompletionListener>();

  constructor() {
    this.queue.onProgress((progress) => {
      for (const listener of this.progressListeners) {
        listener(progress);
      }
    });

    this.queue.onComplete((fileId, success, error) => {
      const pending = this.pendingJobs.get(fileId);

      if (pending) {
        this.pendingJobs.delete(fileId);

        if (success) {
          pending.resolve();
        } else {
          pending.reject(error ?? new Error("Download failed"));
        }
      }

      for (const listener of this.completionListeners) {
        listener(fileId, success, error);
      }
    });

    this.queue.start();
  }

  onProgress(callback: ProgressListener): () => void {
    this.progressListeners.add(callback);
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  onComplete(callback: CompletionListener): () => void {
    this.completionListeners.add(callback);
    return () => {
      this.completionListeners.delete(callback);
    };
  }

  pauseQueue(): void {
    this.queue.pause();
  }

  resumeQueue(): void {
    this.queue.resume();
  }

  async cacheFile(
    fileId: string,
    metadata: CacheFileMetadata,
    fetchStream: FetchStreamFn,
    rules: DownloadRules,
  ): Promise<void> {
    const normalizedFileId = normalizeFileId(fileId);

    const existing = await getFile(normalizedFileId);
    if (existing) {
      await updateLastAccess(normalizedFileId);
      return;
    }

    if (!shouldDownload(metadata.mimeType, metadata.size, rules)) {
      throw new Error("File does not match download rules");
    }

    const activeJob = this.pendingJobs.get(normalizedFileId);
    if (activeJob) {
      return activeJob.promise;
    }

    let resolvePromise: (() => void) | null = null;
    let rejectPromise: ((error: Error) => void) | null = null;

    const promise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    if (!resolvePromise || !rejectPromise) {
      throw new Error("Failed to initialize download task");
    }

    this.pendingJobs.set(normalizedFileId, {
      resolve: resolvePromise,
      reject: rejectPromise,
      promise,
    });

    const maxAllowedSize = normalizeMaxFileSize(rules);

    const fetchFn: QueueFetchFn = async (_task, emitProgress) => {
      const response = await fetchStream(normalizedFileId);

      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

      const responseMime = response.headers.get("content-type")?.trim();
      const resolvedMime = responseMime || metadata.mimeType;
      const totalFromHeader = parseContentLength(response.headers);
      const total = metadata.size > 0 ? metadata.size : totalFromHeader;

      const blob = await streamToBlob(
        response,
        resolvedMime,
        total,
        maxAllowedSize,
        emitProgress,
      );

      const checksum = await generateChecksum(blob);

      const record: OfflineFileRecord = {
        fileId: normalizedFileId,
        blob,
        size: blob.size,
        mimeType: resolvedMime,
        modifiedTime: metadata.modifiedTime,
        checksum,
        cachedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await putFile(record);

      const searchText =
        typeof metadata.extractedText === "string"
          ? metadata.extractedText
          : await extractTextForSearch(blob, resolvedMime, metadata.name);

      await indexFileText(normalizedFileId, searchText);

      await setMetadata({
        key: `integrity:${normalizedFileId}`,
        value: JSON.stringify({
          checksum,
          modifiedTime: metadata.modifiedTime,
          cachedAt: record.cachedAt,
        }),
      });
    };

    this.queue.enqueue(
      {
        fileId: normalizedFileId,
        priority:
          typeof metadata.priority === "number" && Number.isFinite(metadata.priority)
            ? metadata.priority
            : 100,
      },
      fetchFn,
    );

    return promise;
  }

  async removeFile(fileId: string): Promise<void> {
    const normalizedFileId = normalizeFileId(fileId);
    await deleteFile(normalizedFileId);
    await deleteSearchIndex(normalizedFileId);
  }

  async getStorageStats(): Promise<StorageStats> {
    const files = await getAllFiles();

    const totalFiles = files.length;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    let usage: number | null = null;
    let quota: number | null = null;

    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      typeof navigator.storage.estimate === "function"
    ) {
      try {
        const estimate = await navigator.storage.estimate();
        usage = typeof estimate.usage === "number" ? estimate.usage : null;
        quota = typeof estimate.quota === "number" ? estimate.quota : null;
      } catch {
        usage = null;
        quota = null;
      }
    }

    return {
      totalFiles,
      totalBytes,
      usage,
      quota,
    };
  }

  async clearAll(): Promise<void> {
    await clearFiles();
    await clearSearchIndex();
    await clearMetadata();
  }

  async getOfflineStatus(fileId: string): Promise<boolean> {
    const normalizedFileId = normalizeFileId(fileId);
    const cached = await getFile(normalizedFileId);

    if (!cached) {
      return false;
    }

    await updateLastAccess(normalizedFileId);
    return true;
  }

  async listCachedFiles(): Promise<OfflineFileRecord[]> {
    return getAllFiles();
  }
}

export const offlineService = new OfflineService();

export async function isOffline(fileId: string): Promise<boolean> {
  return offlineService.getOfflineStatus(fileId);
}
