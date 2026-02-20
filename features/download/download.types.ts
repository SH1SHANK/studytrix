export type DownloadState =
  | "queued"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export type DownloadErrorCode = "OFFLINE" | "NETWORK" | "QUOTA" | "UNKNOWN";

export interface DownloadTask {
  id: string;
  fileId: string;
  fileName: string;
  courseCode?: string;
  mimeType?: string;
  size?: number;
  progress: number;
  loadedBytes?: number;
  totalBytes?: number;
  speedBytesPerSecond?: number;
  etaSeconds?: number;
  networkHold?: boolean;
  retryCount?: number;
  state: DownloadState;
  error?: string;
  errorCode?: DownloadErrorCode;
  createdAt: number;
  updatedAt: number;
}
