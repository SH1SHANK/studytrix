import { zipSync, type Zippable } from "fflate";
import { toast } from "sonner";

import type { DriveItem } from "@/features/drive/drive.types";

import type { BulkShareMode } from "./bulk.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchFileBlob(
  fileId: string,
  fileName: string,
  onProgress?: (loaded: number) => void,
): Promise<Blob> {
  const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch ${fileName}`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded);
  }

  return new Blob(chunks as BlobPart[]);
}

function sanitizeFileName(name: string, index: number): string {
  // Ensure unique names in the archive by appending index if needed.
  const safe = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  return safe || `file_${index}`;
}

// ─── Zip Mode ───────────────────────────────────────────────────────────────

export async function shareAsZip(
  files: DriveItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = files.length;

  const archive: Zippable = {};
  const usedNames = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let name = sanitizeFileName(file.name, i);

    // Deduplicate names within the zip.
    if (usedNames.has(name)) {
      const ext = name.lastIndexOf(".");
      const base = ext > 0 ? name.slice(0, ext) : name;
      const suffix = ext > 0 ? name.slice(ext) : "";
      name = `${base}_${i}${suffix}`;
    }
    usedNames.add(name);

    try {
      const blob = await fetchFileBlob(file.id, file.name);
      const arrayBuffer = await blob.arrayBuffer();
      archive[name] = new Uint8Array(arrayBuffer);
    } catch {
      // Skip files that fail to fetch, continue with the rest.
      toast.error(`Could not include "${file.name}" in the archive.`);
    }

    onProgress?.(i + 1, total);
  }

  // Build the zip synchronously (fflate is fast for reasonable file counts).
  const zipped = zipSync(archive, { level: 1 });
  const zipBlob = new Blob([zipped] as BlobPart[], { type: "application/zip" });
  const timestamp = new Date().toISOString().slice(0, 10);
  const zipFileName = `studytrix-files-${timestamp}.zip`;

  // Try Web Share, fall back to download.
  if (typeof navigator !== "undefined" && navigator.share) {
    const zipFile = new File([zipBlob], zipFileName, { type: "application/zip" });

    if (navigator.canShare?.({ files: [zipFile] })) {
      try {
        await navigator.share({ title: zipFileName, files: [zipFile] });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return; // User cancelled.
        }
        // Fall through to download.
      }
    }
  }

  // Fallback: trigger browser download.
  downloadBlob(zipBlob, zipFileName);
}

// ─── Individual Mode ────────────────────────────────────────────────────────

export async function shareIndividually(
  files: DriveItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const blob = await fetchFileBlob(file.id, file.name);
      const shareFile = new File([blob], file.name, {
        type: file.mimeType || "application/octet-stream",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [shareFile] })
      ) {
        await navigator.share({ title: file.name, files: [shareFile] });
      } else {
        downloadBlob(blob, file.name);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // User cancelled the share sheet — stop the sequence.
        return;
      }
      toast.error(`Failed to share "${file.name}".`);
    }

    onProgress?.(i + 1, total);
  }
}

// ─── Public Entry Point ─────────────────────────────────────────────────────

export async function bulkShare(
  files: DriveItem[],
  mode: BulkShareMode,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (files.length === 0) {
    toast.info("No files to share.");
    return;
  }

  if (mode === "zip") {
    await shareAsZip(files, onProgress);
  } else {
    await shareIndividually(files, onProgress);
  }
}

// ─── Download Fallback ──────────────────────────────────────────────────────

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}
