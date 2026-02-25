"use client";

import { putFile } from "@/features/offline/offline.db";
import type { IndexableEntity } from "@/features/intelligence/intelligence.types";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { enqueuePendingCapture } from "@/features/custom-folders/capture.queue";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
import type { CustomFolder } from "@/features/custom-folders/custom-folders.types";
import { usePersonalFilesStore, type PersonalFileRecord } from "@/features/custom-folders/personal-files.store";

type CaptureSource = PersonalFileRecord["source"];

export type SavePersonalFileInput = {
  folderId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  source: CaptureSource;
};

export type FolderPathContext = {
  customFolderId: string;
  ancestorIds: string[];
  fullPathPrefix: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function normalizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (trimmed.length > 0) {
    return trimmed.slice(0, 180);
  }
  return "Untitled file";
}

function buildFolderLineage(
  folderId: string,
  foldersById: Map<string, CustomFolder>,
): CustomFolder[] {
  const lineage: CustomFolder[] = [];
  const seen = new Set<string>();
  let cursor = foldersById.get(folderId);

  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    lineage.push(cursor);
    cursor = cursor.parentFolderId ? foldersById.get(cursor.parentFolderId) : undefined;
  }

  return lineage.reverse();
}

export function buildFolderPathContext(folderId: string): FolderPathContext {
  const normalizedFolderId = folderId.trim();
  const folders = useCustomFoldersStore.getState().folders;
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const lineage = buildFolderLineage(normalizedFolderId, foldersById);

  if (lineage.length === 0) {
    return {
      customFolderId: normalizedFolderId || "unsorted_captures",
      ancestorIds: normalizedFolderId ? [normalizedFolderId] : [],
      fullPathPrefix: normalizedFolderId ? "Personal Repository" : "Unsorted Captures",
    };
  }

  const customFolderId = lineage[0]?.id ?? normalizedFolderId;
  const ancestorIds = lineage.map((folder) => folder.id);
  const fullPathPrefix = lineage.map((folder) => folder.label).join(" > ");

  return {
    customFolderId,
    ancestorIds,
    fullPathPrefix,
  };
}

function toIndexableEntityFromRecord(record: PersonalFileRecord): IndexableEntity {
  const pathContext = buildFolderPathContext(record.folderId);
  return {
    fileId: record.id,
    name: record.name,
    fullPath: record.fullPath,
    ancestorIds: pathContext.ancestorIds,
    depth: pathContext.ancestorIds.length,
    isFolder: false,
    repoKind: "personal",
    customFolderId: pathContext.customFolderId,
    mimeType: record.mimeType,
    size: record.size,
    modifiedTime: record.modifiedTime ?? undefined,
    tags: [...record.tags],
  };
}

function shouldQueueCaptureSync(folderId: string): boolean {
  const normalizedFolderId = folderId.trim();
  if (!normalizedFolderId || normalizedFolderId === "unsorted_captures") {
    return false;
  }

  const folder = useCustomFoldersStore.getState().folders.find((entry) => entry.id === normalizedFolderId);
  if (!folder) {
    return false;
  }

  return (folder.sourceKind ?? "drive") === "drive";
}

export async function reindexPersonalFileRecord(fileId: string): Promise<void> {
  const normalizedFileId = fileId.trim();
  if (!normalizedFileId) {
    return;
  }

  const record = usePersonalFilesStore.getState().records.find((entry) => entry.id === normalizedFileId);
  if (!record) {
    return;
  }

  await useIntelligenceStore.getState().indexIncrementalFiles([toIndexableEntityFromRecord(record)]);
}

export async function savePersonalFileLocal(input: SavePersonalFileInput): Promise<{
  fileId: string;
  record: PersonalFileRecord;
}> {
  const folderId = input.folderId.trim();
  const fileName = normalizeFileName(input.fileName);
  const mimeType = input.mimeType.trim() || "application/octet-stream";
  const now = Date.now();
  const modifiedTime = new Date(now).toISOString();
  const pathContext = buildFolderPathContext(folderId);
  const fileId = createId("personal_file");
  const fullPath = `${pathContext.fullPathPrefix} > ${fileName}`;

  await putFile({
    fileId,
    blob: input.blob,
    size: input.blob.size,
    mimeType,
    modifiedTime,
    cachedAt: now,
    lastAccessedAt: now,
  });

  const record: PersonalFileRecord = {
    id: fileId,
    name: fileName,
    folderId: folderId || "unsorted_captures",
    fullPath,
    mimeType,
    size: input.blob.size,
    modifiedTime,
    createdAt: now,
    updatedAt: now,
    tags: [],
    source: input.source,
  };

  usePersonalFilesStore.getState().upsertRecord(record);

  if (shouldQueueCaptureSync(folderId)) {
    await enqueuePendingCapture({
      id: createId("pending_capture"),
      folderId,
      fileName,
      mimeType,
      blobKey: fileId,
      createdAt: now,
      attempts: 0,
    });
  }

  await useIntelligenceStore.getState().indexIncrementalFiles([
    {
      fileId,
      name: fileName,
      fullPath,
      ancestorIds: pathContext.ancestorIds,
      depth: pathContext.ancestorIds.length,
      isFolder: false,
      repoKind: "personal",
      customFolderId: pathContext.customFolderId,
      mimeType,
      size: input.blob.size,
      modifiedTime,
      tags: [],
    },
  ]);

  return { fileId, record };
}
