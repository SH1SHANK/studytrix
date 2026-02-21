import type { DriveItem } from "@/features/drive/drive.types";
import { isDriveFolder, isDriveFolderContents } from "@/features/drive/drive.types";

import { LARGE_FILE_THRESHOLD_BYTES, type ResolvedSelection, type ZipSourceFile } from "./bulk.types";

type FolderReference = {
  id: string;
  name: string;
};

type ResolveSelectedResult = {
  files: ZipSourceFile[];
  folders: FolderReference[];
  folderIds: string[];
};

type ExpandFolderOptions = {
  onProgress?: (done: number, total: number) => void;
  chunkSize?: number;
};

type NestedIndexEntry = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  path: string;
};

const NESTED_INDEX_ROOT_CHUNK = 12;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeCourseCode(index: number): string {
  return `FOLDER_${index + 1}`;
}

function toFolderRefs(input: Array<string | FolderReference>): FolderReference[] {
  const refs: FolderReference[] = [];
  const seen = new Set<string>();

  for (const entry of input) {
    const id = typeof entry === "string" ? entry.trim() : entry.id.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    const name = typeof entry === "string"
      ? id
      : (entry.name || "").trim() || id;

    refs.push({ id, name });
    seen.add(id);
  }

  return refs;
}

function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const normalizedChunkSize = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += normalizedChunkSize) {
    chunks.push(items.slice(index, index + normalizedChunkSize));
  }
  return chunks;
}

function parseNestedIndexedPayload(payload: unknown): NestedIndexEntry[] {
  if (!isRecord(payload) || !Array.isArray(payload.files)) {
    return [];
  }

  const files: NestedIndexEntry[] = [];
  for (const entry of payload.files) {
    if (!isRecord(entry)) {
      continue;
    }

    const id = parseString(entry.id);
    const name = parseString(entry.name);
    if (!id || !name) {
      continue;
    }

    files.push({
      id,
      name,
      mimeType: parseString(entry.mimeType) ?? "application/octet-stream",
      size: parseNumber(entry.size),
      modifiedTime: parseString(entry.modifiedTime),
      webViewLink: parseString(entry.webViewLink),
      path: parseString(entry.path) ?? "",
    });
  }

  return files;
}

async function fetchNestedIndexChunk(roots: FolderReference[]): Promise<ZipSourceFile[]> {
  if (roots.length === 0) {
    return [];
  }

  const body = {
    roots: roots.map((root, index) => ({
      folderId: root.id,
      courseCode: sanitizeCourseCode(index),
      courseName: root.name,
    })),
  };

  const response = await fetch("/api/drive/nested-index", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load nested files");
  }

  const payload = (await response.json()) as unknown;
  const entries = parseNestedIndexedPayload(payload);

  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    mimeType: entry.mimeType,
    size: entry.size,
    modifiedTime: entry.modifiedTime,
    isFolder: false,
    webViewLink: entry.webViewLink,
    iconLink: null,
    zipPath: entry.path,
  }));
}

async function listFolderItems(folderId: string): Promise<DriveItem[]> {
  const items: DriveItem[] = [];
  let pageToken: string | undefined;

  do {
    const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const response = await fetch(`/api/drive/${encodeURIComponent(folderId)}${qs}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      break;
    }

    const payload = (await response.json()) as unknown;
    if (!isDriveFolderContents(payload)) {
      break;
    }

    items.push(...payload.items);
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return items;
}

async function expandFolderFallback(root: FolderReference): Promise<ZipSourceFile[]> {
  const files: ZipSourceFile[] = [];
  const queue: Array<{ folderId: string; ancestry: string[] }> = [
    { folderId: root.id, ancestry: [root.name] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.folderId)) {
      continue;
    }
    visited.add(current.folderId);

    const items = await listFolderItems(current.folderId);
    for (const item of items) {
      if (isDriveFolder(item)) {
        queue.push({
          folderId: item.id,
          ancestry: [...current.ancestry, item.name],
        });
        continue;
      }

      files.push({
        ...item,
        zipPath: current.ancestry.join(" / "),
      });
    }
  }

  return files;
}

export function resolveSelectedItems(
  ids: Set<string>,
  allItems: DriveItem[],
): ResolveSelectedResult {
  const files: ZipSourceFile[] = [];
  const folders: FolderReference[] = [];
  const folderIds: string[] = [];

  for (const item of allItems) {
    if (!ids.has(item.id)) {
      continue;
    }

    if (isDriveFolder(item)) {
      folderIds.push(item.id);
      folders.push({
        id: item.id,
        name: item.name,
      });
    } else {
      files.push(item);
    }
  }

  return { files, folders, folderIds };
}

export async function expandFolders(
  folderRefsInput: Array<string | FolderReference>,
  optionsOrLegacyDepth?: number | ExpandFolderOptions,
): Promise<ZipSourceFile[]> {
  const refs = toFolderRefs(folderRefsInput);
  if (refs.length === 0) {
    return [];
  }

  const options = typeof optionsOrLegacyDepth === "object" && optionsOrLegacyDepth !== null
    ? optionsOrLegacyDepth
    : undefined;
  const onProgress = options?.onProgress;
  const chunkSize = options?.chunkSize ?? NESTED_INDEX_ROOT_CHUNK;
  const chunks = splitIntoChunks(refs, chunkSize);

  const collected: ZipSourceFile[] = [];
  let done = 0;

  for (const chunk of chunks) {
    try {
      const nestedFiles = await fetchNestedIndexChunk(chunk);
      collected.push(...nestedFiles);
      done += chunk.length;
      onProgress?.(done, refs.length);
      continue;
    } catch {
      // Fallback path for intermittent API failures.
    }

    for (const ref of chunk) {
      const files = await expandFolderFallback(ref);
      collected.push(...files);
      done += 1;
      onProgress?.(done, refs.length);
    }
  }

  const deduped = new Map<string, ZipSourceFile>();
  for (const file of collected) {
    if (!deduped.has(file.id)) {
      deduped.set(file.id, file);
    }
  }

  return Array.from(deduped.values());
}

export async function resolveAllFiles(
  ids: Set<string>,
  allItems: DriveItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<ResolvedSelection> {
  const { files: directFiles, folders } = resolveSelectedItems(ids, allItems);
  const totalUnits = directFiles.length + folders.length;
  onProgress?.(directFiles.length, totalUnits);

  const folderFiles = folders.length > 0
    ? await expandFolders(folders, {
      onProgress: (done, total) => {
        onProgress?.(directFiles.length + done, directFiles.length + total);
      },
    })
    : [];

  const byId = new Map<string, ZipSourceFile>();

  for (const file of [...directFiles, ...folderFiles]) {
    const existing = byId.get(file.id);
    if (!existing) {
      byId.set(file.id, file);
      continue;
    }

    if (!existing.zipPath && file.zipPath) {
      byId.set(file.id, file);
    }
  }

  const files = Array.from(byId.values());

  const totalSize = computeTotalSize(files);
  const largeFiles = files.filter((file) => isLargeFile(file));

  return {
    files,
    totalSize,
    hasLargeFiles: largeFiles.length > 0,
    largeFileCount: largeFiles.length,
    largeFiles,
  };
}

export function computeTotalSize(files: Array<DriveItem | ZipSourceFile>): number {
  return files.reduce((sum, file) => sum + (file.size ?? 0), 0);
}

export function isLargeFile(
  file: DriveItem | ZipSourceFile,
  threshold = LARGE_FILE_THRESHOLD_BYTES,
): boolean {
  return (file.size ?? 0) > threshold;
}

export function hasLargeFiles(
  files: Array<DriveItem | ZipSourceFile>,
  threshold = LARGE_FILE_THRESHOLD_BYTES,
): boolean {
  return files.some((file) => isLargeFile(file, threshold));
}
