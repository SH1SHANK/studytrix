import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  getCachedFolder,
  setCachedFolder,
  withFolderRequestDedup,
} from "@/features/drive/drive.cache";
import { DriveService, DriveServiceError } from "@/features/drive/drive.service";
import { isDriveFolder, type DriveFolderContents, type DriveItem } from "@/features/drive/drive.types";

export const runtime = "nodejs";

const FOLDER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,256}$/;
const COURSE_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_ROOTS = 64;
const MAX_FOLDERS = 4000;
const MAX_FILES = 30000;
const CONCURRENCY = 4;
const DRIVE_CACHE_TTL_SECONDS = 600;

type NestedRootInput = {
  folderId: string;
  courseCode: string;
  courseName: string;
};

type NestedFolderTask = {
  folderId: string;
  courseCode: string;
  courseName: string;
  rootFolderId: string;
  ancestryIds: string[];
  ancestry: string[];
};

type NestedFileEntry = {
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
};

type NestedIndexRequestBody = {
  roots?: NestedRootInput[];
};

let driveService: DriveService | null = null;

function getDriveService(): DriveService {
  if (driveService) {
    return driveService;
  }

  driveService = new DriveService();
  return driveService;
}

function normalizeFolderId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!FOLDER_ID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeCourseCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!COURSE_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeCourseName(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function parseRoots(body: NestedIndexRequestBody | null): NestedRootInput[] {
  const rootsRaw = Array.isArray(body?.roots) ? body?.roots : [];
  const roots: NestedRootInput[] = [];

  for (const root of rootsRaw.slice(0, MAX_ROOTS)) {
    if (!root || typeof root !== "object") {
      continue;
    }

    const folderId = normalizeFolderId((root as Record<string, unknown>).folderId);
    const courseCode = normalizeCourseCode((root as Record<string, unknown>).courseCode);

    if (!folderId || !courseCode) {
      continue;
    }

    const courseName = normalizeCourseName((root as Record<string, unknown>).courseName, courseCode);

    roots.push({
      folderId,
      courseCode,
      courseName,
    });
  }

  return roots;
}

async function listFolderPage(
  folderId: string,
  pageToken: string | undefined,
): Promise<DriveFolderContents> {
  const cached = await getCachedFolder(folderId, pageToken);
  if (cached) {
    return cached;
  }

  const data = await withFolderRequestDedup(
    folderId,
    pageToken,
    async (): Promise<DriveFolderContents> => {
      const fresh = await getDriveService().listFolder(folderId, pageToken);
      await setCachedFolder(folderId, pageToken, fresh, DRIVE_CACHE_TTL_SECONDS);
      return fresh;
    },
  );

  return data;
}

async function listFolderItems(folderId: string): Promise<DriveItem[]> {
  const items: DriveItem[] = [];
  let pageToken: string | undefined;

  do {
    const page = await listFolderPage(folderId, pageToken);
    items.push(...page.items);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return items;
}

function toFileEntry(task: NestedFolderTask, item: DriveItem): NestedFileEntry {
  const parentFolderName = task.ancestry[task.ancestry.length - 1] ?? task.courseName;
  const ancestorFolderIds = task.ancestryIds.slice();
  const ancestorFolderNames = task.ancestry.slice();

  return {
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    size: item.size,
    modifiedTime: item.modifiedTime,
    webViewLink: item.webViewLink,
    courseCode: task.courseCode,
    courseName: task.courseName,
    rootFolderId: task.rootFolderId,
    parentFolderId: task.folderId,
    parentFolderName,
    ancestorFolderIds,
    ancestorFolderNames,
    path: ancestorFolderNames.join(" / "),
  };
}

async function crawlNestedFiles(roots: NestedRootInput[]): Promise<NestedFileEntry[]> {
  const queue: NestedFolderTask[] = roots.map((root) => ({
    folderId: root.folderId,
    courseCode: root.courseCode,
    courseName: root.courseName,
    rootFolderId: root.folderId,
    ancestryIds: [root.folderId],
    ancestry: [root.courseName],
  }));

  const visitedFolders = new Set<string>();
  const fileMap = new Map<string, NestedFileEntry>();
  let cursor = 0;

  const worker = async () => {
    while (true) {
      if (fileMap.size >= MAX_FILES || visitedFolders.size >= MAX_FOLDERS) {
        return;
      }

      const currentIndex = cursor;
      if (currentIndex >= queue.length) {
        return;
      }
      cursor += 1;

      const task = queue[currentIndex];
      if (!task || visitedFolders.has(task.folderId)) {
        continue;
      }

      visitedFolders.add(task.folderId);

      let items: DriveItem[] = [];
      try {
        items = await listFolderItems(task.folderId);
      } catch {
        continue;
      }

      for (const item of items) {
        if (isDriveFolder(item)) {
          if (!visitedFolders.has(item.id) && queue.length < MAX_FOLDERS) {
            queue.push({
              folderId: item.id,
              courseCode: task.courseCode,
              courseName: task.courseName,
              rootFolderId: task.rootFolderId,
              ancestryIds: [...task.ancestryIds, item.id],
              ancestry: [...task.ancestry, item.name],
            });
          }
          continue;
        }

        if (!fileMap.has(item.id) && fileMap.size < MAX_FILES) {
          fileMap.set(item.id, toFileEntry(task, item));
        }
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return Array.from(fileMap.values()).sort((left, right) => {
    if (left.courseCode !== right.courseCode) {
      return left.courseCode.localeCompare(right.courseCode);
    }

    if (left.path !== right.path) {
      return left.path.localeCompare(right.path);
    }

    if (left.name !== right.name) {
      return left.name.localeCompare(right.name);
    }

    return left.id.localeCompare(right.id);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: NestedIndexRequestBody | null = null;

  try {
    body = (await request.json()) as NestedIndexRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const roots = parseRoots(body);
  if (roots.length === 0) {
    return NextResponse.json({ files: [] });
  }

  try {
    const files = await crawlNestedFiles(roots);
    return NextResponse.json({
      files,
      indexedAt: Date.now(),
      truncated: files.length >= MAX_FILES,
    });
  } catch (error) {
    if (error instanceof DriveServiceError) {
      if (error.statusCode === 403) {
        return NextResponse.json({ error: "Folder access denied" }, { status: 403 });
      }

      if (error.statusCode === 404) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    console.error("Nested drive index route error:", error);
    return NextResponse.json({ error: "Failed to build nested index" }, { status: 500 });
  }
}
