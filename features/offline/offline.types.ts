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
}

export interface DownloadProgress {
  fileId: string;
  loaded: number;
  total: number;
  percent: number;
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
  extractedText?: string;
}

export type FetchStreamFn = (fileId: string) => Promise<Response>;

export type StorageEstimate = {
  usage: number;
  quota: number;
  usageByFile?: Record<string, number>;
};

export type OfflineFile = OfflineFileRecord;
