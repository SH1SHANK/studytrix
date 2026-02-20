"use client";

import { toast } from "sonner";

import { downloadAsZip, shareAsZip, type ZipSourceFile } from "@/features/bulk/bulk.share";

type NestedEntry = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  path: string;
};

function sanitizeZipPrefix(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "-")
    .toLowerCase() || "folder";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

function parseNestedFiles(payload: unknown): NestedEntry[] {
  if (!isRecord(payload) || !Array.isArray(payload.files)) {
    return [];
  }

  const entries: NestedEntry[] = [];
  for (const file of payload.files) {
    if (!isRecord(file)) {
      continue;
    }

    const id = parseString(file.id);
    const name = parseString(file.name);
    if (!id || !name) {
      continue;
    }

    entries.push({
      id,
      name,
      mimeType: parseString(file.mimeType) ?? "application/octet-stream",
      size: parseNumber(file.size),
      path: parseString(file.path) ?? "",
    });
  }

  return entries;
}

async function resolveFolderZipFiles(
  folderId: string,
  folderName: string,
): Promise<ZipSourceFile[]> {
  const response = await fetch("/api/drive/nested-index", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      roots: [
        {
          folderId,
          courseCode: "FOLDER",
          courseName: folderName,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to load folder files");
  }

  const payload = (await response.json()) as unknown;
  const entries = parseNestedFiles(payload);

  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    mimeType: entry.mimeType,
    size: entry.size,
    modifiedTime: null,
    isFolder: false,
    webViewLink: null,
    iconLink: null,
    zipPath: entry.path,
  }));
}

export async function downloadFolderAsZip(
  folderId: string,
  folderName: string,
): Promise<void> {
  const files = await resolveFolderZipFiles(folderId, folderName);
  if (files.length === 0) {
    toast.info("No files found in this folder.");
    return;
  }

  await downloadAsZip(
    files,
    undefined,
    `${sanitizeZipPrefix(folderName)}-offline.zip`,
  );
}

export async function shareFolderAsZip(
  folderId: string,
  folderName: string,
): Promise<void> {
  const files = await resolveFolderZipFiles(folderId, folderName);
  if (files.length === 0) {
    toast.info("No files found in this folder.");
    return;
  }

  await shareAsZip(
    files,
    undefined,
    `${sanitizeZipPrefix(folderName)}-share.zip`,
  );
}
