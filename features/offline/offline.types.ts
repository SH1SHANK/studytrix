export interface OfflineFileRecord {
  fileId: string;
  blob: Blob;
  size: number;
  mimeType: string;
  modifiedTime: string | null;
  checksum?: string;
  cachedAt: number;
  lastAccessedAt: number;
}

export interface DownloadTask {
  fileId: string;
  priority: number;
  startByte?: number;
}

export type DownloadStatus =
  | "idle"
  | "queued"
  | "downloading"
  | "paused"
  | "cached"
  | "error";

export interface DownloadProgress {
  fileId: string;
  loaded: number;
  total: number;
  status: DownloadStatus;
  errorMessage?: string;
  bytesReceived?: number;
  // -1 means indeterminate progress (content-length is unknown).
  percent: number;
}

export interface OfflineDownloadRecord {
  fileId: string;
  name: string;
  mimeType: string;
  size?: number;
  status: DownloadStatus;
  progress: number;
  bytesReceived: number;
  downloadUrl: string;
  cachedAt?: number;
  error?: string;
}

export type OfflineErrorCode =
  | "FETCH_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "BODY_NULL"
  | "ABORT"
  | "QUEUE_TIMEOUT";

export class OfflineError extends Error {
  constructor(
    public code: OfflineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OfflineError";
  }
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  quota: number | null;
  usage: number | null;
}

export interface DownloadRules {
  allowMimeTypes?: string[];
  maxFileSizeBytes?: number;
  excludeMimeTypes?: string[];
}

export interface SearchIndexRecord {
  fileId: string;
  text: string;
  updatedAt: number;
}

export interface MetadataRecord {
  key: string;
  value: string;
}

export interface CacheFileMetadata {
  mimeType: string;
  size: number;
  modifiedTime: string | null;
  name?: string;
  priority?: number;
  entityId?: string;
  courseCode?: string;
  source?: "manual" | "prefetch";
}

export type FetchStreamFn = (
  fileId: string,
  signal?: AbortSignal,
  startByte?: number,
) => Promise<Response>;

export type StorageEstimate = {
  usage: number;
  quota: number;
  usageByFile?: Record<string, number>;
};

export type OfflineFile = OfflineFileRecord;
