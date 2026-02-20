import type { DriveItem } from "@/features/drive/drive.types";
import { isDriveFolder, isDriveFolderContents } from "@/features/drive/drive.types";

import { LARGE_FILE_THRESHOLD_BYTES, type ResolvedSelection } from "./bulk.types";

// ─── Selection Resolution ───────────────────────────────────────────────────

/**
 * Separates selected IDs into files and folder IDs using the context items.
 */
export function resolveSelectedItems(
  ids: Set<string>,
  allItems: DriveItem[],
): { files: DriveItem[]; folderIds: string[] } {
  const files: DriveItem[] = [];
  const folderIds: string[] = [];

  for (const item of allItems) {
    if (!ids.has(item.id)) {
      continue;
    }

    if (isDriveFolder(item)) {
      folderIds.push(item.id);
    } else {
      files.push(item);
    }
  }

  return { files, folderIds };
}

/**
 * Fetches the contents of folders and recursively expands subfolders.
 * Returns a flat list of all files found.
 */
export async function expandFolders(
  folderIds: string[],
  maxDepth = 5,
): Promise<DriveItem[]> {
  const allFiles: DriveItem[] = [];
  const visited = new Set<string>();

  async function expand(folderId: string, depth: number): Promise<void> {
    if (depth > maxDepth || visited.has(folderId)) {
      return;
    }

    visited.add(folderId);

    try {
      const response = await fetch(`/api/drive/${encodeURIComponent(folderId)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json() as unknown;
      if (!isDriveFolderContents(data)) {
        return;
      }

      for (const item of data.items) {
        if (isDriveFolder(item)) {
          await expand(item.id, depth + 1);
        } else {
          allFiles.push(item);
        }
      }
    } catch {
      // Skip inaccessible folders.
    }
  }

  await Promise.all(folderIds.map((id) => expand(id, 0)));
  return allFiles;
}

/**
 * Resolves the full set of selected IDs into a deduplicated flat file list,
 * expanding any folders recursively.
 */
export async function resolveAllFiles(
  ids: Set<string>,
  allItems: DriveItem[],
): Promise<ResolvedSelection> {
  const { files: directFiles, folderIds } = resolveSelectedItems(ids, allItems);
  const folderFiles = folderIds.length > 0 ? await expandFolders(folderIds) : [];

  // Deduplicate by ID.
  const seen = new Set<string>();
  const files: DriveItem[] = [];

  for (const file of [...directFiles, ...folderFiles]) {
    if (!seen.has(file.id)) {
      seen.add(file.id);
      files.push(file);
    }
  }

  const totalSize = computeTotalSize(files);
  const largeFiles = files.filter((f) => isLargeFile(f));

  return {
    files,
    totalSize,
    hasLargeFiles: largeFiles.length > 0,
    largeFileCount: largeFiles.length,
    largeFiles,
  };
}

// ─── Size Utilities ─────────────────────────────────────────────────────────

export function computeTotalSize(files: DriveItem[]): number {
  return files.reduce((sum, f) => sum + (f.size ?? 0), 0);
}

export function isLargeFile(
  file: DriveItem,
  threshold = LARGE_FILE_THRESHOLD_BYTES,
): boolean {
  return (file.size ?? 0) > threshold;
}

export function hasLargeFiles(
  files: DriveItem[],
  threshold = LARGE_FILE_THRESHOLD_BYTES,
): boolean {
  return files.some((f) => isLargeFile(f, threshold));
}
