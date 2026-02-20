import { toast } from "sonner";

import type { DriveItem } from "@/features/drive/drive.types";
import { startDownload } from "@/features/download/download.controller";
import { useDownloadStore } from "@/features/download/download.store";
import { formatFileSize } from "@/features/drive/drive.types";

import { LARGE_FILE_THRESHOLD_BYTES } from "./bulk.types";

type OfflineBatchGroup = {
  id: string;
  label: string;
};

type MakeFilesOfflineOptions = {
  group?: OfflineBatchGroup;
};

/**
 * Queues all files for offline download via the existing DownloadController.
 * Opens the Download Drawer to show progress.
 */
export async function makeFilesOffline(
  files: DriveItem[],
  options?: MakeFilesOfflineOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (files.length === 0) {
    toast.info("No files to make offline.");
    return;
  }

  // Show large-file notice if applicable.
  const largeFiles = files.filter(
    (f) => (f.size ?? 0) > LARGE_FILE_THRESHOLD_BYTES,
  );

  if (largeFiles.length > 0) {
    const names = largeFiles
      .slice(0, 3)
      .map((f) => `"${f.name}" (${formatFileSize(f.size)})`)
      .join(", ");
    const suffix = largeFiles.length > 3 ? ` and ${largeFiles.length - 3} more` : "";

    toast.warning(
      `${largeFiles.length} large file${largeFiles.length > 1 ? "s" : ""} detected: ${names}${suffix}. These may take longer to download.`,
      { duration: 6000 },
    );
  }

  // Open the download drawer so the user sees progress.
  useDownloadStore.getState().openDrawer();

  const total = files.length;
  const totalBytes = files.reduce((sum, file) => sum + (file.size ?? 0), 0);
  let done = 0;

  for (const file of files) {
    try {
      await startDownload(file.id, options?.group
        ? {
          kind: "file",
          hiddenInUi: true,
          groupId: options.group.id,
          groupLabel: options.group.label,
          groupTotalFiles: total,
          groupTotalBytes: totalBytes > 0 ? totalBytes : undefined,
        }
        : undefined);
    } catch {
      toast.error(`Failed to queue "${file.name}" for offline.`);
    }

    done++;
    onProgress?.(done, total);
  }

  toast.success(
    `${done} file${done > 1 ? "s" : ""} queued for offline download.`,
  );
}
