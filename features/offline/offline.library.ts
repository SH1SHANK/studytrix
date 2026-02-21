"use client";

import { getAllFileIds, getFile, getMetadataByPrefix } from "@/features/offline/offline.db";
import { getAllNestedCommandSnapshots } from "@/features/command/command.localIndex";

const DOWNLOAD_META_PREFIX = "download-meta:";
const STORAGE_META_PREFIX = "storage-meta:";

export type OfflineLibraryFile = {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  cachedAt: number;
  folderId: string;
  folderName: string;
  folderPath: string;
  courseCode: string;
  ancestorFolderIds: string[];
  ancestorFolderNames: string[];
};

export type OfflineLibraryFolder = {
  folderId: string;
  name: string;
  path: string;
  fileCount: number;
  totalBytes: number;
};

export type OfflineLibrarySnapshot = {
  files: OfflineLibraryFile[];
  folders: OfflineLibraryFolder[];
  totalBytes: number;
};

type OfflineLibraryLoadOptions = {
  force?: boolean;
  maxAgeMs?: number;
};

type DownloadMetaPayload = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  modifiedTime?: string | null;
  updatedAt?: number;
};

type StorageMetaPayload = {
  entityId?: string;
  courseCode?: string;
  downloadedAt?: number;
};

type NestedMapValue = {
  name: string;
  parentFolderId: string;
  parentFolderName: string;
  ancestorFolderIds: string[];
  ancestorFolderNames: string[];
  path: string;
  courseCode: string;
  mimeType: string;
  size: number;
};

type FileBaseInfo = {
  fileId: string;
  size: number;
  mimeType: string;
  cachedAt: number;
};

const DEFAULT_MAX_AGE_MS = 20_000;
const DOWNLOAD_STORE_PERSIST_KEY = "studytrix-download-store-v1";

let snapshotCache: OfflineLibrarySnapshot | null = null;
let snapshotCachedAt = 0;
let snapshotInFlight: Promise<OfflineLibrarySnapshot> | null = null;

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

function parseDownloadMeta(raw: string): DownloadMetaPayload {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    return {
      id: parseString(parsed.id) ?? undefined,
      name: parseString(parsed.name) ?? undefined,
      mimeType: parseString(parsed.mimeType) ?? undefined,
      size: parseNumber(parsed.size) ?? undefined,
      modifiedTime:
        parsed.modifiedTime === null
          ? null
          : parseString(parsed.modifiedTime) ?? undefined,
      updatedAt: parseNumber(parsed.updatedAt) ?? undefined,
    };
  } catch {
    return {};
  }
}

function parseStorageMeta(raw: string): StorageMetaPayload {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    return {
      entityId: parseString(parsed.entityId) ?? undefined,
      courseCode: parseString(parsed.courseCode) ?? undefined,
      downloadedAt: parseNumber(parsed.downloadedAt) ?? undefined,
    };
  } catch {
    return {};
  }
}

function dedupeAndNormalizeFileIds(fileIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const fileId of fileIds) {
    const next = fileId.trim();
    if (!next || seen.has(next)) {
      continue;
    }

    seen.add(next);
    normalized.push(next);
  }

  return normalized;
}

function loadCompletedDownloadTaskFileIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DOWNLOAD_STORE_PERSIST_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return [];
    }

    const state = isRecord(parsed.state) ? parsed.state : parsed;
    if (!isRecord(state)) {
      return [];
    }

    const tasks = state.tasks;
    if (!isRecord(tasks)) {
      return [];
    }

    const fileIds: string[] = [];
    for (const task of Object.values(tasks)) {
      if (!isRecord(task)) {
        continue;
      }

      const stateValue = parseString(task.state);
      if (stateValue !== "completed") {
        continue;
      }

      const fileId = parseString(task.fileId);
      if (!fileId) {
        continue;
      }

      fileIds.push(fileId);
    }

    return dedupeAndNormalizeFileIds(fileIds);
  } catch {
    return [];
  }
}

function cloneSnapshot(snapshot: OfflineLibrarySnapshot): OfflineLibrarySnapshot {
  return {
    files: snapshot.files.map((file) => ({ ...file })),
    folders: snapshot.folders.map((folder) => ({ ...folder })),
    totalBytes: snapshot.totalBytes,
  };
}

async function computeOfflineLibrarySnapshot(): Promise<OfflineLibrarySnapshot> {
  const [fileIds, completedTaskFileIds] = await Promise.all([
    getAllFileIds(),
    Promise.resolve(loadCompletedDownloadTaskFileIds()),
  ]);
  const indexedIds = dedupeAndNormalizeFileIds(fileIds);
  const mergedCandidateIds = dedupeAndNormalizeFileIds([...indexedIds, ...completedTaskFileIds]);
  if (mergedCandidateIds.length === 0) {
    return {
      files: [],
      folders: [],
      totalBytes: 0,
    };
  }

  const indexedIdSet = new Set(indexedIds);
  const taskOnlyIds = mergedCandidateIds.filter((fileId) => !indexedIdSet.has(fileId));
  const providerRecordByFileId = new Map<string, {
    size: number;
    mimeType: string;
    cachedAt: number;
  }>();

  if (taskOnlyIds.length > 0) {
    const resolved = await Promise.all(
      taskOnlyIds.map(async (fileId) => {
        try {
          const record = await getFile(fileId);
          if (!record) {
            return null;
          }
          return {
            fileId,
            size: record.size,
            mimeType: record.mimeType || record.blob.type || "application/octet-stream",
            cachedAt: record.cachedAt,
          };
        } catch {
          return null;
        }
      }),
    );

    for (const entry of resolved) {
      if (!entry) {
        continue;
      }

      providerRecordByFileId.set(entry.fileId, {
        size: entry.size,
        mimeType: entry.mimeType,
        cachedAt: entry.cachedAt,
      });
    }
  }

  const normalizedFileIds = dedupeAndNormalizeFileIds([
    ...indexedIds,
    ...Array.from(providerRecordByFileId.keys()),
  ]);
  if (normalizedFileIds.length === 0) {
    return {
      files: [],
      folders: [],
      totalBytes: 0,
    };
  }

  const [downloadMetaRecords, storageMetaRecords, snapshots] = await Promise.all([
    getMetadataByPrefix(DOWNLOAD_META_PREFIX),
    getMetadataByPrefix(STORAGE_META_PREFIX),
    getAllNestedCommandSnapshots(),
  ]);

  const fileIdSet = new Set(normalizedFileIds);

  const downloadMetaByFileId = new Map<string, DownloadMetaPayload>();
  const storageMetaByFileId = new Map<string, StorageMetaPayload>();
  const fileBaseById = new Map<string, FileBaseInfo>();

  for (const record of downloadMetaRecords) {
    if (record.key.startsWith(DOWNLOAD_META_PREFIX)) {
      const fileId = record.key.slice(DOWNLOAD_META_PREFIX.length).trim();
      if (!fileId || !fileIdSet.has(fileId)) {
        continue;
      }
      const parsed = parseDownloadMeta(record.value);
      downloadMetaByFileId.set(fileId, parsed);
      fileBaseById.set(fileId, {
        fileId,
        size: parsed.size ?? 0,
        mimeType: parsed.mimeType ?? "application/octet-stream",
        cachedAt: parsed.updatedAt ?? 0,
      });
      continue;
    }
  }

  for (const record of storageMetaRecords) {
    if (record.key.startsWith(STORAGE_META_PREFIX)) {
      const fileId = record.key.slice(STORAGE_META_PREFIX.length).trim();
      if (!fileId || !fileIdSet.has(fileId)) {
        continue;
      }
      storageMetaByFileId.set(fileId, parseStorageMeta(record.value));
    }
  }

  const nestedByFileId = new Map<string, NestedMapValue>();
  for (const snapshot of snapshots) {
    for (const entry of snapshot.entries) {
      if (!fileIdSet.has(entry.id)) {
        continue;
      }

      if (nestedByFileId.has(entry.id)) {
        continue;
      }

      nestedByFileId.set(entry.id, {
        name: entry.name,
        parentFolderId: entry.parentFolderId,
        parentFolderName: entry.parentFolderName,
        ancestorFolderIds: entry.ancestorFolderIds,
        ancestorFolderNames: entry.ancestorFolderNames,
        path: entry.path,
        courseCode: entry.courseCode,
        mimeType: entry.mimeType,
        size: entry.size ?? 0,
      });

      if (nestedByFileId.size >= fileIdSet.size) {
        break;
      }
    }

    if (nestedByFileId.size >= fileIdSet.size) {
      break;
    }
  }

  const files: OfflineLibraryFile[] = normalizedFileIds.map((fileId) => {
    const downloadMeta = downloadMetaByFileId.get(fileId);
    const storageMeta = storageMetaByFileId.get(fileId);
    const nested = nestedByFileId.get(fileId);
    const fileBase = fileBaseById.get(fileId);
    const providerRecord = providerRecordByFileId.get(fileId);

    const folderId = nested?.parentFolderId ?? "ungrouped";
    const folderName =
      nested?.parentFolderName
      ?? storageMeta?.courseCode
      ?? "Ungrouped";
    const folderPath = nested?.path ?? folderName;
    const ancestorFolderIds = nested?.ancestorFolderIds ?? [];
    const ancestorFolderNames = nested?.ancestorFolderNames ?? [];

    return {
      fileId,
      name: downloadMeta?.name ?? nested?.name ?? fileId,
      mimeType:
        fileBase?.mimeType
        ?? providerRecord?.mimeType
        ?? nested?.mimeType
        ?? "application/octet-stream",
      size: fileBase?.size ?? providerRecord?.size ?? nested?.size ?? 0,
      cachedAt: fileBase?.cachedAt ?? providerRecord?.cachedAt ?? storageMeta?.downloadedAt ?? 0,
      folderId,
      folderName,
      folderPath,
      courseCode: nested?.courseCode ?? storageMeta?.courseCode ?? "GENERAL",
      ancestorFolderIds,
      ancestorFolderNames,
    };
  });

  files.sort((left, right) => {
    if (left.folderPath !== right.folderPath) {
      return left.folderPath.localeCompare(right.folderPath);
    }

    return left.name.localeCompare(right.name);
  });

  const folderMap = new Map<string, OfflineLibraryFolder>();

  const upsertFolder = (
    folderId: string,
    name: string,
    path: string,
    size: number,
  ) => {
    const normalizedFolderId = folderId.trim();
    if (!normalizedFolderId) {
      return;
    }

    const normalizedName = name.trim() || normalizedFolderId;
    const normalizedPath = path.trim() || normalizedName;
    const current = folderMap.get(normalizedFolderId);
    if (!current) {
      folderMap.set(normalizedFolderId, {
        folderId: normalizedFolderId,
        name: normalizedName,
        path: normalizedPath,
        fileCount: 1,
        totalBytes: size,
      });
      return;
    }

    current.fileCount += 1;
    current.totalBytes += size;
    if (current.path.length === 0 && normalizedPath.length > 0) {
      current.path = normalizedPath;
    }
    if (current.name.length === 0 && normalizedName.length > 0) {
      current.name = normalizedName;
    }
  };

  for (const file of files) {
    if (file.ancestorFolderIds.length > 0) {
      const ancestorNames = file.ancestorFolderIds.map((_, index) =>
        file.ancestorFolderNames[index] ?? file.folderName,
      );

      for (let index = 0; index < file.ancestorFolderIds.length; index += 1) {
        const ancestorId = file.ancestorFolderIds[index];
        const ancestorName = ancestorNames[index] ?? ancestorId;
        const ancestorPath = ancestorNames.slice(0, index + 1).join(" / ");
        upsertFolder(ancestorId, ancestorName, ancestorPath, file.size);
      }
      continue;
    }

    upsertFolder(file.folderId, file.folderName, file.folderPath, file.size);
  }

  const folders = Array.from(folderMap.values()).sort((left, right) =>
    left.path.localeCompare(right.path),
  );

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return {
    files,
    folders,
    totalBytes,
  };
}

export async function loadOfflineLibrarySnapshot(
  options: OfflineLibraryLoadOptions = {},
): Promise<OfflineLibrarySnapshot> {
  const maxAgeMs = Number.isFinite(options.maxAgeMs) && (options.maxAgeMs ?? 0) > 0
    ? (options.maxAgeMs as number)
    : DEFAULT_MAX_AGE_MS;
  const now = Date.now();
  const shouldUseCache = !options.force
    && snapshotCache !== null
    && (now - snapshotCachedAt) <= maxAgeMs;

  if (shouldUseCache && snapshotCache) {
    return cloneSnapshot(snapshotCache);
  }

  if (snapshotInFlight) {
    return snapshotInFlight.then(cloneSnapshot);
  }

  snapshotInFlight = (async () => {
    const computed = await computeOfflineLibrarySnapshot();
    snapshotCache = computed;
    snapshotCachedAt = Date.now();
    return computed;
  })();

  try {
    const snapshot = await snapshotInFlight;
    return cloneSnapshot(snapshot);
  } catch (error) {
    if (snapshotCache) {
      return cloneSnapshot(snapshotCache);
    }
    throw error;
  } finally {
    snapshotInFlight = null;
  }
}
