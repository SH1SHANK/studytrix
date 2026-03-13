export type DownloadState =
  | "queued"
  | "waiting"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "canceled"
  | "evicted";

export type DownloadErrorCode =
  | "NETWORK_ERROR"
  | "OFFLINE"
  | "RATE_LIMITED"
  | "QUOTA"
  | "QUOTA_EXCEEDED"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";
export type DownloadTaskKind = "file" | "folder";
export type DownloadProgressMode = "determinate" | "indeterminate";

export interface DownloadTask {
  id: string;
  fileId: string;
  fileName: string;
  kind?: DownloadTaskKind;
  courseCode?: string;
  mimeType?: string;
  size?: number;
  hiddenInUi?: boolean;
  groupId?: string;
  groupLabel?: string;
  groupTotalFiles?: number;
  groupCompletedFiles?: number;
  groupTotalBytes?: number;
  progress: number;
  loadedBytes?: number;
  totalBytes?: number;
  speedBytesPerSecond?: number;
  etaSeconds?: number;
  queuePosition?: number;
  progressMode?: DownloadProgressMode;
  networkHold?: boolean;
  retryCount?: number;
  state: DownloadState;
  error?: string;
  errorCode?: DownloadErrorCode;
  createdAt: number;
  updatedAt: number;
}
