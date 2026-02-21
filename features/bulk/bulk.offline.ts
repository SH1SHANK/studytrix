import { toast } from "sonner";

import type { DriveItem } from "@/features/drive/drive.types";
import { startDownload } from "@/features/download/download.controller";
import { useDownloadStore } from "@/features/download/download.store";

type OfflineBatchGroup = {
  id: string;
  label: string;
};

type MakeFilesOfflineOptions = {
  group?: OfflineBatchGroup;
  preflight?: (files: DriveItem[]) => Promise<boolean> | boolean;
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

  if (options?.preflight) {
    const proceed = await options.preflight(files);
    if (!proceed) {
      return;
    }
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
