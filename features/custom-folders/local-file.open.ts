"use client";

import {
  loadDirectoryHandle,
  requestHandlePermission,
  verifyHandlePermission,
} from "@/features/custom-folders/local-handle.db";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";

type OpenIndexedLocalFileInput = {
  customFolderId: string;
  fullPath: string;
  fileName: string;
};

type OpenIndexedLocalFileResult =
  | { ok: true }
  | { ok: false; message: string };

type DirectoryEntriesHandle = {
  entries: () => AsyncIterable<[string, FileSystemHandle]>;
};

function normalizePathSegments(input: OpenIndexedLocalFileInput, rootLabel: string): string[] {
  const fromPath = input.fullPath
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (fromPath.length === 0) {
    return [input.fileName.trim()].filter(Boolean);
  }

  if (fromPath[0]?.toLowerCase() === rootLabel.trim().toLowerCase()) {
    return fromPath.slice(1);
  }

  return fromPath;
}

async function resolveDirectoryHandle(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(name);
  } catch {
    // Fall through to a case-insensitive scan.
  }

  for await (const [, entry] of (parent as unknown as DirectoryEntriesHandle).entries()) {
    if (entry.kind !== "directory") {
      continue;
    }
    if (entry.name.toLowerCase() !== name.toLowerCase()) {
      continue;
    }

    return entry as FileSystemDirectoryHandle;
  }

  return null;
}

async function resolveFileHandle(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await parent.getFileHandle(name);
  } catch {
    // Fall through to a case-insensitive scan.
  }

  for await (const [, entry] of (parent as unknown as DirectoryEntriesHandle).entries()) {
    if (entry.kind !== "file") {
      continue;
    }
    if (entry.name.toLowerCase() !== name.toLowerCase()) {
      continue;
    }

    return entry as FileSystemFileHandle;
  }

  return null;
}

function openBlobInNewTab(blob: Blob): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    URL.revokeObjectURL(url);
    return false;
  }

  const timer = window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
  if (typeof timer === "object" && timer !== null && "unref" in timer) {
    (timer as { unref: () => void }).unref();
  }

  return true;
}

export async function openIndexedLocalFile(
  input: OpenIndexedLocalFileInput,
): Promise<OpenIndexedLocalFileResult> {
  const customFolderId = input.customFolderId.trim();
  if (!customFolderId) {
    return { ok: false, message: "Missing local folder context." };
  }

  const folder = useCustomFoldersStore.getState().folders.find((entry) => entry.id === customFolderId) ?? null;
  if (!folder || folder.sourceKind !== "local") {
    return { ok: false, message: "This file is not linked to a local folder." };
  }

  const handleKey = folder.localHandleKey?.trim();
  if (!handleKey) {
    return { ok: false, message: "Local folder permission is missing. Reconnect this folder first." };
  }

  const handle = await loadDirectoryHandle(handleKey);
  if (!handle) {
    return { ok: false, message: "Local folder handle was not found. Reconnect this folder first." };
  }

  const permission = await verifyHandlePermission(handle);
  if (permission !== "granted") {
    const granted = await requestHandlePermission(handle);
    if (!granted) {
      return { ok: false, message: "Local folder permission was denied." };
    }
  }

  const pathSegments = normalizePathSegments(input, folder.label);
  const fileSegment = pathSegments[pathSegments.length - 1]?.trim() || input.fileName.trim();
  const directorySegments = pathSegments
    .slice(0, -1)
    .map((segment) => segment.trim())
    .filter(Boolean);

  try {
    let cursor = handle;
    for (const segment of directorySegments) {
      const nextDirectory = await resolveDirectoryHandle(cursor, segment);
      if (!nextDirectory) {
        return { ok: false, message: "The local file path no longer exists." };
      }
      cursor = nextDirectory;
    }

    const fileHandle = await resolveFileHandle(cursor, fileSegment);
    if (!fileHandle) {
      return { ok: false, message: "The local file was not found. It may have been moved or renamed." };
    }

    const file = await fileHandle.getFile();
    const opened = openBlobInNewTab(file);
    if (!opened) {
      return { ok: false, message: "The browser blocked opening the local file in a new tab." };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Failed to open this local file." };
  }
}
