import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import type { DriveFileDocType } from "@/db/types";

interface NestedFileApiResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  courseCode: string;
  courseName: string;
  rootFolderId: string;
  parentFolderId: string;
  parentFolderName: string;
  ancestorFolderIds: string[];
  ancestorFolderNames: string[];
  path: string;
}

interface NestedIndexResponse {
  files?: NestedFileApiResponse[];
  indexedAt?: number;
  truncated?: boolean;
  error?: string;
}

const SCAN_TIMEOUT_MS = 60_000;

export class DriveScanner {
  private activeScans = new Set<string>();

  isScanning(sourceId: string): boolean {
    return this.activeScans.has(sourceId);
  }

  /**
   * Scans a single public Drive source using the server-side crawl endpoint.
   * Compares remote results with local RxDB storage and applies an incremental diff.
   *
   * Deletion Safety Gating:
   * 1. If crawl fails (network, 403, 404, 500), local files are NEVER deleted.
   * 2. If crawl was truncated (hit limits), deletion diff is skipped to prevent accidental deletions.
   * 3. If payload is malformed/empty without files array, deletion diff is skipped.
   */
  async scanSource(sourceId: string): Promise<void> {
    if (this.activeScans.has(sourceId)) {
      return;
    }

    const source = await driveSourceRepository.getById(sourceId);
    if (!source) {
      return;
    }

    this.activeScans.add(sourceId);
    await driveSourceRepository.updateStatus(sourceId, "scanning");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const response = await fetch("/api/drive/nested-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          roots: [
            {
              folderId: source.id,
              courseCode: "ROOT",
              courseName: source.name || "Drive Root",
            },
          ],
        }),
      });

      if (!response.ok) {
        let errorMsg = `Server returned status ${response.status}`;
        try {
          const errData = (await response.json()) as { error?: string };
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // ignore json parse error
        }

        const isUnavailable = response.status === 403 || response.status === 404;
        await driveSourceRepository.updateStatus(
          sourceId,
          isUnavailable ? "unavailable" : "error",
          {
            errorMessage: errorMsg,
          },
        );
        return;
      }

      const data = (await response.json()) as NestedIndexResponse;

      if (!data || !Array.isArray(data.files)) {
        throw new Error("Invalid response format from server crawler");
      }

      const remoteFiles = data.files;

      // Load all current local files for this source
      const localFiles = await driveFileRepository.getAllFilesForSource(sourceId);
      const localFileMap = new Map<string, DriveFileDocType>();
      for (const f of localFiles) {
        localFileMap.set(f.driveFileId, f);
      }

      const remoteFileIds = new Set<string>();
      const filesToUpsert: DriveFileDocType[] = [];
      const now = Date.now();

      for (const rf of remoteFiles) {
        if (!rf || !rf.id) continue;

        remoteFileIds.add(rf.id);
        const existing = localFileMap.get(rf.id);
        const id = `${sourceId}:${rf.id}`;

        if (!existing) {
          // New file discovered
          filesToUpsert.push({
            id,
            sourceId,
            driveFileId: rf.id,
            parentFolderId: rf.parentFolderId || source.id,
            name: rf.name,
            mimeType: rf.mimeType,
            size: rf.size,
            modifiedTime: rf.modifiedTime,
            webViewUrl: rf.webViewLink,
            path: rf.path || rf.name,
            remoteStatus: "available",
            contentStatus: "not-downloaded",
            workspaceId: source.workspaceId || "",
            localFolderId: "",
            errorMessage: null,
            indexedAt: null,
            downloadedAt: null,
            lastOpenedAt: 0,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Existing file: check if remote modifiedTime or metadata changed
          const isModified = rf.modifiedTime && rf.modifiedTime !== existing.modifiedTime;
          const wasDeleted = existing.remoteStatus === "deleted";
          const needsWorkspaceSync = !existing.workspaceId && Boolean(source.workspaceId);

          if (isModified || wasDeleted || existing.name !== rf.name || existing.path !== rf.path || needsWorkspaceSync) {
            filesToUpsert.push({
              ...existing,
              name: rf.name,
              mimeType: rf.mimeType,
              size: rf.size,
              modifiedTime: rf.modifiedTime,
              webViewUrl: rf.webViewLink,
              path: rf.path || rf.name,
              workspaceId: existing.workspaceId || source.workspaceId || "",
              remoteStatus: "available",
              contentStatus: isModified ? "not-downloaded" : existing.contentStatus,
              updatedAt: now,
            });
          }
        }
      }

      // Deletion Gating: Only mark missing files as deleted if the crawl was complete and non-truncated
      const isCompleteCrawl = !data.truncated;
      const deletedDriveFileIds: string[] = [];

      if (isCompleteCrawl) {
        for (const localFile of localFiles) {
          if (!remoteFileIds.has(localFile.driveFileId) && localFile.remoteStatus !== "deleted") {
            deletedDriveFileIds.push(localFile.driveFileId);
          }
        }
      }

      // Apply changes to RxDB
      if (filesToUpsert.length > 0) {
        await driveFileRepository.bulkUpsert(filesToUpsert);
      }

      if (deletedDriveFileIds.length > 0) {
        await driveFileRepository.markFilesDeleted(sourceId, deletedDriveFileIds);
      }

      // Mark source scan complete
      await driveSourceRepository.updateStatus(sourceId, "ready", {
        fileCount: remoteFiles.length,
        lastScannedAt: now,
        errorMessage: data.truncated
          ? "Scan reached folder limit (truncated). Some nested files may be omitted."
          : null,
      });
    } catch (error) {
      console.error(`[DriveScanner] Failed to scan source ${sourceId}:`, error);
      const isAbort = error instanceof Error && error.name === "AbortError";
      await driveSourceRepository.updateStatus(sourceId, "error", {
        errorMessage: isAbort
          ? "Scan timed out. Please try again later."
          : error instanceof Error
            ? error.message
            : "Failed to scan Google Drive folder",
      });
    } finally {
      clearTimeout(timeoutId);
      this.activeScans.delete(sourceId);
    }
  }

  /**
   * Scans all registered public Drive sources with controlled concurrency (max 2 concurrent).
   */
  async scanAll(concurrency = 2): Promise<void> {
    const sources = await driveSourceRepository.getAll();
    if (sources.length === 0) return;

    // Process sources in chunks of `concurrency` to avoid network storms
    for (let i = 0; i < sources.length; i += concurrency) {
      const chunk = sources.slice(i, i + concurrency);
      await Promise.allSettled(chunk.map((s) => this.scanSource(s.id)));
    }
  }
}

export const driveScanner = new DriveScanner();
