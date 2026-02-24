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

function logOfflineDebug(step: string): void {
  console.debug(`[Offline Debug] ${step}`);
}

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
  logOfflineDebug(`Queueing ${total} file(s) for offline download...`);
  let done = 0;
  let queued = 0;
  let failed = 0;

  for (const file of files) {
    logOfflineDebug(`Queue request for file: ${file.name} (${file.id})`);
    try {
      const taskId = await startDownload(file.id, options?.group
        ? {
          kind: "file",
          hiddenInUi: true,
          groupId: options.group.id,
          groupLabel: options.group.label,
          groupTotalFiles: total,
          groupTotalBytes: totalBytes > 0 ? totalBytes : undefined,
        }
        : undefined);
      if (taskId) {
        queued += 1;
        logOfflineDebug(`Queued file download: ${file.name} (${file.id}) -> task ${taskId}`);
      } else {
        failed += 1;
        logOfflineDebug(`Queue returned empty task for file: ${file.name} (${file.id})`);
      }
    } catch (error) {
      failed += 1;
      logOfflineDebug(
        `Queue failed for file: ${file.name} (${file.id}) - ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      toast.error(`Failed to queue "${file.name}" for offline.`);
    }

    done += 1;
    onProgress?.(done, total);
  }

  if (queued <= 0) {
    logOfflineDebug("Queueing failed: no files were queued.");
    throw new Error("Could not queue offline downloads.");
  }

  logOfflineDebug(`Queue summary: queued=${queued}, failed=${failed}`);
  toast.success(`${queued} file${queued > 1 ? "s" : ""} queued for offline download.`);
  if (failed > 0) {
    toast.warning(`${failed} file${failed > 1 ? "s were" : " was"} skipped due queue errors.`);
  }
}
