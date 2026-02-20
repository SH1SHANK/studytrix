export type DownloadState =
  | "queued"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

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
  state: DownloadState;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
