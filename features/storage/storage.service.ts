import {
  putFile,
  clearFiles,
  getAllMetadata,
  clearMetadata,
  clearSearchIndex,
  deleteFile,
  deleteSearchIndex,
  getAllFiles,
  getFile,
  getMetadata,
  setMetadata,
} from "@/features/offline/offline.db";
import { OfflineError, type OfflineFileRecord } from "@/features/offline/offline.types";

import type { OfflineRecord, QuotaEstimate } from "./storage.types";

interface StorageMetaPayload {
  entityId?: string;
  courseCode?: string;
  status?: OfflineRecord["status"];
  source?: OfflineRecord["source"];
  downloadedAt?: number;
}

const DEFAULT_COURSE_CODE = "GENERAL";
const STORAGE_META_PREFIX = "storage-meta:";

let auditPromise: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMetadataPayload(raw: string | undefined): StorageMetaPayload {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return {};
    }

    const status = parsed.status;
    const source = parsed.source;
    const downloadedAt = parsed.downloadedAt;

    return {
      entityId: typeof parsed.entityId === "string" ? parsed.entityId : undefined,
      courseCode: typeof parsed.courseCode === "string" ? parsed.courseCode : undefined,
      status:
        status === "complete"
        || status === "partial"
        || status === "corrupted"
        || status === "error"
          ? status
          : undefined,
      source: source === "manual" || source === "prefetch" ? source : undefined,
      downloadedAt:
        typeof downloadedAt === "number" && Number.isFinite(downloadedAt)
          ? downloadedAt
          : undefined,
    };
  } catch {
    return {};
  }
}

function storageMetaKey(fileId: string): string {
  return `${STORAGE_META_PREFIX}${fileId}`;
}

function parseStorageMetaFileId(key: string): string | null {
  if (!key.startsWith(STORAGE_META_PREFIX)) {
    return null;
  }

  const fileId = key.slice(STORAGE_META_PREFIX.length).trim();
  return fileId ? fileId : null;
}

function stringifyPayload(payload: StorageMetaPayload): string {
  return JSON.stringify(payload);
}

function deriveStatus(record: { size: number; blobSize: number; checksum?: string },
  metaStatus?: OfflineRecord["status"],
): OfflineRecord["status"] {
  if (metaStatus) {
    return metaStatus;
  }

  if (record.size <= 0 || record.blobSize <= 0) {
    return "partial";
  }

  if (record.blobSize !== record.size) {
    return "partial";
  }

  if (!record.checksum) {
    return "partial";
  }

  return "complete";
}

export async function auditOfflineIndex(): Promise<void> {
  const [files, metadataRecords] = await Promise.all([
    getAllFiles(),
    getAllMetadata(),
  ]);

  const cachedIds = new Set(files.map((file) => file.fileId));

  for (const metadata of metadataRecords) {
    const fileId = parseStorageMetaFileId(metadata.key);
    if (!fileId || cachedIds.has(fileId)) {
      continue;
    }

    const existingBytes = await getFile(fileId);
    if (existingBytes) {
      continue;
    }

    const payload = parseMetadataPayload(metadata.value);
    const nextPayload: StorageMetaPayload = {
      entityId: payload.entityId ?? fileId,
      courseCode: payload.courseCode ?? DEFAULT_COURSE_CODE,
      source: payload.source ?? "manual",
      downloadedAt: payload.downloadedAt ?? Date.now(),
      status: "error",
    };

    await setMetadata({
      key: storageMetaKey(fileId),
      value: stringifyPayload(nextPayload),
    });
  }
}

export async function auditOfflineIndexOnce(): Promise<void> {
  if (auditPromise) {
    await auditPromise;
    return;
  }

  auditPromise = (async () => {
    try {
      await auditOfflineIndex();
    } finally {
      auditPromise = null;
    }
  })();

  await auditPromise;
}

export async function getOfflineRecords(): Promise<OfflineRecord[]> {
  const [files, metadataRecords] = await Promise.all([
    getAllFiles(),
    getAllMetadata(),
  ]);

  const recordsFromFiles = await Promise.all(
    files.map(async (file): Promise<OfflineRecord> => {
      const meta = await getMetadata(`storage-meta:${file.fileId}`);
      const payload = parseMetadataPayload(meta?.value);

      return {
        id: file.fileId,
        entityId: payload.entityId ?? file.fileId,
        size: file.size,
        courseCode: payload.courseCode ?? DEFAULT_COURSE_CODE,
        mimeType: file.mimeType,
        downloadedAt: payload.downloadedAt ?? file.cachedAt,
        lastAccessedAt: file.lastAccessedAt,
        status: deriveStatus(
          {
            size: file.size,
            blobSize: file.blob.size,
            checksum: file.checksum,
          },
          payload.status,
        ),
        source: payload.source ?? "manual",
      };
    }),
  );

  const fileIdSet = new Set(files.map((file) => file.fileId));
  const missingRecords: OfflineRecord[] = [];

  for (const metaRecord of metadataRecords) {
    const fileId = parseStorageMetaFileId(metaRecord.key);
    if (!fileId || fileIdSet.has(fileId)) {
      continue;
    }

    const payload = parseMetadataPayload(metaRecord.value);

    missingRecords.push({
      id: fileId,
      entityId: payload.entityId ?? fileId,
      size: 0,
      courseCode: payload.courseCode ?? DEFAULT_COURSE_CODE,
      mimeType: "application/octet-stream",
      downloadedAt: payload.downloadedAt ?? Date.now(),
      lastAccessedAt: 0,
      status: "error",
      source: payload.source ?? "manual",
    });
  }

  return [...recordsFromFiles, ...missingRecords];
}

export async function storeOfflineFileVerified(record: OfflineFileRecord): Promise<void> {
  await putFile(record);

  const verify = await getFile(record.fileId);
  if (!verify || verify.blob.size !== record.blob.size || verify.size !== record.size) {
    await deleteFile(record.fileId);
    throw new OfflineError("STORAGE_WRITE_FAILED", `Verification failed for ${record.fileId}`);
  }
}

export async function deleteOfflineRecord(id: string): Promise<void> {
  await deleteFile(id);
  await deleteSearchIndex(id);
}

export async function deleteOfflineRecords(ids: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

  for (const id of uniqueIds) {
    await deleteOfflineRecord(id);
  }
}

export async function clearAllOffline(): Promise<void> {
  await clearFiles();
  await clearSearchIndex();
  await clearMetadata();
}

export async function getQuotaEstimate(): Promise<QuotaEstimate> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== "function"
  ) {
    return {
      quota: null,
      usage: null,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();

    return {
      quota:
        typeof estimate.quota === "number" && Number.isFinite(estimate.quota)
          ? estimate.quota
          : null,
      usage:
        typeof estimate.usage === "number" && Number.isFinite(estimate.usage)
          ? estimate.usage
          : null,
    };
  } catch {
    return {
      quota: null,
      usage: null,
    };
  }
}

export async function exportStorageSummary(): Promise<string> {
  const [records, quota] = await Promise.all([getOfflineRecords(), getQuotaEstimate()]);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalFiles: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.size, 0),
    quotaBytes: quota.quota,
    usageBytes: quota.usage,
    records,
  };

  return JSON.stringify(summary, null, 2);
}
