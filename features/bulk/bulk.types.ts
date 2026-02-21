import type { DriveItem } from "@/features/drive/drive.types";

export type BulkShareMode = "zip" | "individual";
export type ZipSourceFile = DriveItem & { zipPath?: string };

export interface BulkShareOptions {
  files: ZipSourceFile[];
  mode: BulkShareMode;
  onProgress?: (done: number, total: number) => void;
}

export interface ResolvedSelection {
  files: ZipSourceFile[];
  totalSize: number;
  hasLargeFiles: boolean;
  largeFileCount: number;
  largeFiles: ZipSourceFile[];
}

export const LARGE_FILE_THRESHOLD_BYTES = 25 * 1024 * 1024; // 25 MB
