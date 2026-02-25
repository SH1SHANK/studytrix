import { DRIVE_FOLDER_MIME, type DriveItem } from "@/features/drive/drive.types";
import {
  getQueryCacheRecord,
  listQueryCacheRecordsByPrefix,
  putWithPolicy,
} from "@/features/offline/offline.query-cache.db";
import { QUERY_CACHE_KEYS } from "@/features/offline/offline.query-cache.keys";
import type { CustomFolder } from "@/features/custom-folders/custom-folders.types";
import {
  loadDirectoryHandle,
  verifyHandlePermission,
} from "@/features/custom-folders/local-handle.db";

import { getAllQueryCacheKeysForFolder } from "./intelligence.db";
import type { IndexableEntity } from "./intelligence.types";

type CachedCatalogIndex = {
  departments?: Array<{
    id?: string;
    availableSemesters?: number[];
  }>;
};

type CachedCatalogSemester = {
  courses?: Array<{
    driveFolderId?: string;
    courseCode?: string;
    courseName?: string;
  }>;
};

type CachedDriveFolder = {
  items?: DriveItem[];
};

const MAX_NETWORK_PAGES_PER_FOLDER = 120;
const MAX_NETWORK_ITEMS_PER_FOLDER = 20_000;
const LOCAL_FOLDER_MIME = "application/vnd.google-apps.folder";

const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  ts: "text/typescript",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  mov: "video/quicktime",
  zip: "application/zip",
};

type LocalFileEntry = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

type LocalDirectoryEntry = {
  kind: "directory";
  name: string;
  entries: () => AsyncIterable<[string, LocalEntry]>;
};

type LocalEntry = LocalFileEntry | LocalDirectoryEntry;

type LocalDirectoryHandleLike = {
  entries: () => AsyncIterable<[string, LocalEntry]>;
};

function normalizeFolderId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRootLabel(course: { courseCode?: string; courseName?: string }, fallback: string): string {
  const name = typeof course.courseName === "string" ? course.courseName.trim() : "";
  if (name.length > 0) {
    return name;
  }

  const code = typeof course.courseCode === "string" ? course.courseCode.trim() : "";
  if (code.length > 0) {
    return code;
  }

  return fallback;
}

function isDriveItem(value: unknown): value is DriveItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.name === "string"
    && typeof record.mimeType === "string";
}

function normalizePageToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function localStableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function toLocalEntityId(
  customFolderId: string,
  fullPath: string,
  kind: "file" | "folder",
): string {
  return `local_${kind}_${localStableHash(`${customFolderId}|${fullPath}|${kind}`)}`;
}

function guessMimeTypeFromFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    return "application/octet-stream";
  }

  const extension = name.slice(dot + 1).trim().toLowerCase();
  if (!extension) {
    return "application/octet-stream";
  }

  return EXTENSION_MIME_MAP[extension] ?? "application/octet-stream";
}

async function fetchFolderItemsFromNetwork(folderId: string): Promise<DriveItem[]> {
  if (typeof fetch !== "function") {
    return [];
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return [];
  }

  const merged = new Map<string, DriveItem>();
  let pageToken: string | undefined;
  let pageCount = 0;

  while (
    pageCount < MAX_NETWORK_PAGES_PER_FOLDER
    && merged.size < MAX_NETWORK_ITEMS_PER_FOLDER
  ) {
    const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    let response: Response;

    try {
      response = await fetch(`/api/drive/${encodeURIComponent(folderId)}${query}`, {
        cache: "no-store",
      });
    } catch {
      break;
    }

    if (!response.ok) {
      break;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      items?: unknown[];
      nextPageToken?: string;
    };

    const items = Array.isArray(payload.items)
      ? payload.items.filter(isDriveItem)
      : [];

    if (items.length === 0 && !payload.nextPageToken) {
      break;
    }

    const cacheKey = QUERY_CACHE_KEYS.driveFolderPage(folderId, pageToken);
    await putWithPolicy(cacheKey, { items }).catch(() => undefined);

    for (const item of items) {
      if (merged.size >= MAX_NETWORK_ITEMS_PER_FOLDER) {
        break;
      }

      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    }

    pageCount += 1;
    pageToken = normalizePageToken(payload.nextPageToken);

    if (!pageToken) {
      break;
    }
  }

  return Array.from(merged.values());
}

async function listAllCachedFolderItems(folderId: string): Promise<DriveItem[]> {
  const pageKeys = await getAllQueryCacheKeysForFolder(folderId);
  const merged = new Map<string, DriveItem>();

  await Promise.all(pageKeys.map(async (key) => {
    const record = await getQueryCacheRecord<CachedDriveFolder>(key);
    if (!record || !Array.isArray(record.payload?.items)) {
      return;
    }

    for (const item of record.payload.items) {
      if (!isDriveItem(item)) {
        continue;
      }

      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    }
  }));

  if (merged.size > 0) {
    return Array.from(merged.values());
  }

  return fetchFolderItemsFromNetwork(folderId);
}

export async function collectFolderRecursive(
  folderId: string,
  pathSegments: string[],
  ancestorIds: string[],
  depth: number,
  repoKind: "global" | "personal",
  customFolderId?: string,
  visited: Set<string> = new Set(),
): Promise<IndexableEntity[]> {
  if (visited.has(folderId)) {
    return [];
  }

  visited.add(folderId);

  let items: DriveItem[] = [];
  try {
    items = await listAllCachedFolderItems(folderId);
  } catch (error) {
    console.error("[Collector] Failed to read cached folder pages", { folderId, error });
    return [];
  }

  if (items.length === 0) {
    return [];
  }

  const entities: IndexableEntity[] = [];

  for (const item of items) {
    const nextPathSegments = [...pathSegments, item.name];
    const nextAncestorIds = [...ancestorIds, folderId];
    const nextDepth = depth + 1;
    const fullPath = nextPathSegments.join(" > ");
    const isFolder = item.mimeType === DRIVE_FOLDER_MIME || item.isFolder;

    if (isFolder) {
      entities.push({
        fileId: item.id,
        name: item.name,
        fullPath,
        ancestorIds: nextAncestorIds,
        depth: nextDepth,
        mimeType: DRIVE_FOLDER_MIME,
        modifiedTime: item.modifiedTime ?? undefined,
        isFolder: true,
        repoKind,
        customFolderId,
      });

      try {
        const nested = await collectFolderRecursive(
          item.id,
          nextPathSegments,
          nextAncestorIds,
          nextDepth,
          repoKind,
          customFolderId,
          visited,
        );
        entities.push(...nested);
      } catch (error) {
        console.error("[Collector] Failed to recurse folder", { folderId: item.id, error });
      }

      continue;
    }

    entities.push({
      fileId: item.id,
      name: item.name,
      fullPath,
      ancestorIds: nextAncestorIds,
      depth: nextDepth,
      mimeType: item.mimeType,
      size: typeof item.size === "number" ? item.size : undefined,
      modifiedTime: item.modifiedTime ?? undefined,
      isFolder: false,
      repoKind,
      customFolderId,
    });
  }

  return entities;
}

export async function collectGlobalRepository(): Promise<IndexableEntity[]> {
  const roots = new Map<string, string>();

  try {
    const catalogIndexRecord = await getQueryCacheRecord<CachedCatalogIndex>(QUERY_CACHE_KEYS.catalogIndex);
    const departments = Array.isArray(catalogIndexRecord?.payload?.departments)
      ? catalogIndexRecord.payload.departments
      : [];

    for (const department of departments) {
      const departmentId = typeof department?.id === "string"
        ? department.id.trim().toUpperCase()
        : "";
      const semesters = Array.isArray(department?.availableSemesters)
        ? department.availableSemesters
        : [];

      if (!departmentId || semesters.length === 0) {
        continue;
      }

      for (const semester of semesters) {
        const semesterKey = QUERY_CACHE_KEYS.catalogSemester(departmentId, semester);
        const semesterRecord = await getQueryCacheRecord<CachedCatalogSemester>(semesterKey);
        const courses = Array.isArray(semesterRecord?.payload?.courses)
          ? semesterRecord.payload.courses
          : [];

        for (const course of courses) {
          const folderId = normalizeFolderId(course?.driveFolderId);
          if (!folderId) {
            continue;
          }

          if (!roots.has(folderId)) {
            roots.set(folderId, normalizeRootLabel(course ?? {}, folderId));
          }
        }
      }
    }
  } catch (error) {
    console.error("[Collector] Failed to read catalog:index", error);
  }

  if (roots.size === 0) {
    const semesterRecords = await listQueryCacheRecordsByPrefix<CachedCatalogSemester>("catalog:semester:");
    for (const record of semesterRecords) {
      const courses = Array.isArray(record.payload?.courses) ? record.payload.courses : [];
      for (const course of courses) {
        const folderId = normalizeFolderId(course?.driveFolderId);
        if (!folderId) {
          continue;
        }

        if (!roots.has(folderId)) {
          roots.set(folderId, normalizeRootLabel(course ?? {}, folderId));
        }
      }
    }
  }

  const collected = new Map<string, IndexableEntity>();

  await Promise.all(Array.from(roots.entries()).map(async ([rootFolderId, rootLabel]) => {
    try {
      collected.set(rootFolderId, {
        fileId: rootFolderId,
        name: rootLabel,
        fullPath: rootLabel,
        ancestorIds: [],
        depth: 0,
        mimeType: DRIVE_FOLDER_MIME,
        isFolder: true,
        repoKind: "global",
      });

      const entities = await collectFolderRecursive(
        rootFolderId,
        [rootLabel],
        [],
        0,
        "global",
      );

      for (const entity of entities) {
        if (!collected.has(entity.fileId)) {
          collected.set(entity.fileId, entity);
        }
      }
    } catch (error) {
      console.error("[Collector] Failed to collect global root", { rootFolderId, error });
    }
  }));

  return Array.from(collected.values());
}

export async function collectPersonalRepository(
  customFolders: CustomFolder[],
): Promise<IndexableEntity[]> {
  const collected = new Map<string, IndexableEntity>();

  await Promise.all(customFolders.map(async (folder) => {
    try {
      const sourceKind = folder.sourceKind ?? "drive";
      collected.set(folder.id, {
        fileId: folder.id,
        name: folder.label,
        fullPath: folder.label,
        ancestorIds: [],
        depth: 0,
        mimeType: DRIVE_FOLDER_MIME,
        isFolder: true,
        repoKind: "personal",
        customFolderId: folder.id,
      });

      let entities: IndexableEntity[] = [];
      if (sourceKind === "local") {
        const handleKey = folder.localHandleKey?.trim();
        if (handleKey) {
          const handle = await loadDirectoryHandle(handleKey);
          if (handle) {
            const permission = await verifyHandlePermission(handle);
            if (permission === "granted") {
              entities = await collectLocalFolder(handle, folder.label, folder.id);
            }
          }
        }
      } else {
        entities = await collectFolderRecursive(
          folder.id,
          [folder.label],
          [],
          0,
          "personal",
          folder.id,
        );
      }

      for (const entity of entities) {
        if (!collected.has(entity.fileId)) {
          collected.set(entity.fileId, entity);
        }
      }
    } catch (error) {
      console.error("[Collector] Failed to collect personal root", { folderId: folder.id, error });
    }
  }));

  return Array.from(collected.values());
}

export async function collectLocalFolder(
  handle: FileSystemDirectoryHandle,
  label: string,
  customFolderId: string,
  visited: Set<string> = new Set(),
): Promise<IndexableEntity[]> {
  const rootLabel = label.trim() || "Local Folder";
  const entities: IndexableEntity[] = [];

  const walk = async (
    dirHandle: FileSystemDirectoryHandle,
    parentPath: string,
    ancestorIds: string[],
    parentDepth: number,
  ): Promise<void> => {
    for await (const [, entry] of (dirHandle as unknown as LocalDirectoryHandleLike).entries()) {
      const visitKey = `${entry.name}|${parentPath}`;
      if (visited.has(visitKey)) {
        continue;
      }
      visited.add(visitKey);

      const fullPath = `${parentPath} > ${entry.name}`;
      const depth = parentDepth + 1;

      if (entry.kind === "directory") {
        const folderId = toLocalEntityId(customFolderId, fullPath, "folder");
        entities.push({
          fileId: folderId,
          name: entry.name,
          fullPath,
          ancestorIds: [...ancestorIds],
          depth,
          isFolder: true,
          repoKind: "personal",
          customFolderId,
          mimeType: LOCAL_FOLDER_MIME,
        });

        await walk(
          entry as unknown as FileSystemDirectoryHandle,
          fullPath,
          [...ancestorIds, folderId],
          depth,
        );

        continue;
      }

      let size: number | undefined;
      let modifiedTime: string | undefined;
      try {
        const file = await (entry as LocalFileEntry).getFile();
        size = Number.isFinite(file.size) ? file.size : undefined;
        modifiedTime = file.lastModified > 0
          ? new Date(file.lastModified).toISOString()
          : undefined;
      } catch {
      }

      entities.push({
        fileId: toLocalEntityId(customFolderId, fullPath, "file"),
        name: entry.name,
        fullPath,
        ancestorIds: [...ancestorIds],
        depth,
        isFolder: false,
        repoKind: "personal",
        customFolderId,
        mimeType: guessMimeTypeFromFileName(entry.name),
        size,
        modifiedTime,
      });
    }
  };

  await walk(handle, rootLabel, [customFolderId], 0);
  return entities;
}

export async function collectAllEntities(customFolders: CustomFolder[] = []): Promise<IndexableEntity[]> {
  if (process.env.NODE_ENV === "development") {
    console.time("[Collector] Full collection");
  }

  try {
    const [globalEntities, personalEntities] = await Promise.all([
      collectGlobalRepository(),
      collectPersonalRepository(customFolders),
    ]);

    const merged = new Map<string, IndexableEntity>();
    for (const entity of [...globalEntities, ...personalEntities]) {
      if (!merged.has(entity.fileId)) {
        merged.set(entity.fileId, entity);
      }
    }

    return Array.from(merged.values());
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.timeEnd("[Collector] Full collection");
    }
  }
}
