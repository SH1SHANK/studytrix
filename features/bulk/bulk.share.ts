import { zip, type FlateError, type Zippable } from "fflate";

import { getBlob } from "@/features/offline/offline.access";

import type { BulkShareMode, ZipSourceFile } from "./bulk.types";

export class BulkShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BulkShareError";
  }
}

export interface BulkShareSummary {
  mode: BulkShareMode;
  requestedCount: number;
  includedCount: number;
  failedFiles: string[];
}

type ZipBuildResult = {
  zipBlob: Blob;
  requestedCount: number;
  includedCount: number;
  failedFiles: string[];
};

const ZIP_FETCH_CONCURRENCY = 4;

async function fetchFileBlob(fileId: string, fileName: string): Promise<Blob> {
  const localBlob = await getBlob(fileId);
  if (localBlob) {
    return localBlob;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new BulkShareError(`${fileName} is not available offline yet.`);
  }

  const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    let reason = `Failed to fetch ${fileName}`;
    try {
      const payload = (await response.json()) as unknown;
      if (
        payload
        && typeof payload === "object"
        && "message" in payload
        && typeof (payload as { message?: unknown }).message === "string"
      ) {
        reason = (payload as { message: string }).message;
      }
    } catch {
      // keep generic message
    }
    throw new BulkShareError(reason);
  }

  return await response.blob();
}

function sanitizeFileName(name: string, index: number): string {
  const safe = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  return safe || `file_${index}`;
}

function sanitizePath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "_"))
    .filter(Boolean)
    .join("/");
}

function buildZipEntryName(file: ZipSourceFile, index: number): string {
  const fileName = sanitizeFileName(file.name, index);
  const safePath = typeof file.zipPath === "string" ? sanitizePath(file.zipPath) : "";

  if (!safePath) {
    return fileName;
  }

  return `${safePath}/${fileName}`;
}

function dedupeZipEntryName(name: string, index: number, usedNames: Set<string>): string {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const ext = name.lastIndexOf(".");
  const base = ext > 0 ? name.slice(0, ext) : name;
  const suffix = ext > 0 ? name.slice(ext) : "";
  let candidate = `${base}_${index}${suffix}`;
  let counter = 1;
  while (usedNames.has(candidate)) {
    candidate = `${base}_${index}_${counter}${suffix}`;
    counter += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function compressArchive(archive: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(archive, { level: 3 }, (error: FlateError | null, data: Uint8Array) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}

async function buildZipBlob(
  files: ZipSourceFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<ZipBuildResult> {
  const total = files.length;
  const archiveEntries: Array<{ entryName: string; data: Uint8Array } | null> =
    new Array(total).fill(null);
  const failedFiles: string[] = [];
  const usedNames = new Set<string>();
  const entryNames = files.map((file, index) => {
    const nextName = buildZipEntryName(file, index);
    return dedupeZipEntryName(nextName, index, usedNames);
  });
  let includedCount = 0;
  let done = 0;
  let cursor = 0;

  const workers = Array.from({ length: Math.min(ZIP_FETCH_CONCURRENCY, total) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= total) {
        return;
      }

      const file = files[index];
      const entryName = entryNames[index];

      try {
        const blob = await fetchFileBlob(file.id, file.name);
        const arrayBuffer = await blob.arrayBuffer();
        archiveEntries[index] = {
          entryName,
          data: new Uint8Array(arrayBuffer),
        };
        includedCount += 1;
      } catch {
        failedFiles.push(file.name);
      } finally {
        done += 1;
        onProgress?.(done, total);
      }
    }
  });

  await Promise.all(workers);

  if (includedCount === 0) {
    throw new BulkShareError("Could not build archive. No files were available.");
  }

  const archive: Zippable = {};
  for (const entry of archiveEntries) {
    if (!entry) {
      continue;
    }
    archive[entry.entryName] = entry.data;
  }

  const zipped = await compressArchive(archive);
  return {
    zipBlob: new Blob([zipped] as BlobPart[], { type: "application/zip" }),
    requestedCount: total,
    includedCount,
    failedFiles,
  };
}

function defaultZipName(prefix = "studytrix-files"): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${timestamp}.zip`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1000);
}

export async function shareAsZip(
  files: ZipSourceFile[],
  onProgress?: (done: number, total: number) => void,
  zipFileName = defaultZipName("studytrix-files"),
): Promise<BulkShareSummary> {
  if (files.length === 0) {
    throw new BulkShareError("No files were selected.");
  }

  const result = await buildZipBlob(files, onProgress);
  const zipFile = new File([result.zipBlob], zipFileName, { type: "application/zip" });

  if (typeof navigator !== "undefined" && navigator.share) {
    if (navigator.canShare?.({ files: [zipFile] })) {
      try {
        await navigator.share({ title: zipFileName, files: [zipFile] });
        return {
          mode: "zip",
          requestedCount: result.requestedCount,
          includedCount: result.includedCount,
          failedFiles: result.failedFiles,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return {
            mode: "zip",
            requestedCount: result.requestedCount,
            includedCount: result.includedCount,
            failedFiles: result.failedFiles,
          };
        }
      }
    }
  }

  downloadBlob(result.zipBlob, zipFileName);
  return {
    mode: "zip",
    requestedCount: result.requestedCount,
    includedCount: result.includedCount,
    failedFiles: result.failedFiles,
  };
}

export async function downloadAsZip(
  files: ZipSourceFile[],
  onProgress?: (done: number, total: number) => void,
  zipFileName = defaultZipName("studytrix-files"),
): Promise<BulkShareSummary> {
  if (files.length === 0) {
    throw new BulkShareError("No files were selected.");
  }

  const result = await buildZipBlob(files, onProgress);
  downloadBlob(result.zipBlob, zipFileName);

  return {
    mode: "zip",
    requestedCount: result.requestedCount,
    includedCount: result.includedCount,
    failedFiles: result.failedFiles,
  };
}

export async function shareIndividually(
  files: ZipSourceFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<BulkShareSummary> {
  if (files.length === 0) {
    throw new BulkShareError("No files were selected.");
  }

  const total = files.length;
  const failedFiles: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    try {
      const blob = await fetchFileBlob(file.id, file.name);
      const shareFile = new File([blob], file.name, {
        type: file.mimeType || "application/octet-stream",
      });

      if (
        typeof navigator !== "undefined"
        && navigator.share
        && navigator.canShare?.({ files: [shareFile] })
      ) {
        await navigator.share({ title: file.name, files: [shareFile] });
      } else {
        downloadBlob(blob, file.name);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          mode: "individual",
          requestedCount: total,
          includedCount: index,
          failedFiles,
        };
      }
      failedFiles.push(file.name);
    } finally {
      onProgress?.(index + 1, total);
    }
  }

  return {
    mode: "individual",
    requestedCount: total,
    includedCount: total - failedFiles.length,
    failedFiles,
  };
}

export async function bulkShare(
  files: ZipSourceFile[],
  mode: BulkShareMode,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkShareSummary> {
  if (mode === "zip") {
    return await downloadAsZip(files, onProgress);
  }

  return await shareIndividually(files, onProgress);
}
