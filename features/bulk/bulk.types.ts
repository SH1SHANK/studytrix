import type { DriveItem } from "@/features/drive/drive.types";

export type BulkShareMode = "zip" | "individual";

export interface BulkShareOptions {
  files: DriveItem[];
  mode: BulkShareMode;
  onProgress?: (done: number, total: number) => void;
}

export interface ResolvedSelection {
  files: DriveItem[];
  totalSize: number;
  hasLargeFiles: boolean;
  largeFileCount: number;
  largeFiles: DriveItem[];
}

export const LARGE_FILE_THRESHOLD_BYTES = 25 * 1024 * 1024; // 25 MB
