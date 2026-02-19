import { getFile, getMetadata, putFile, setMetadata } from "@/features/offline/offline.db";
import { generateChecksum } from "@/features/offline/offline.integrity";

import type { IntegrityIssues, OfflineRecord } from "./storage.types";

interface StorageMetaPayload {
  entityId?: string;
  courseCode?: string;
  source?: OfflineRecord["source"];
  downloadedAt?: number;
  status?: OfflineRecord["status"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStorageMeta(raw: string | undefined): StorageMetaPayload {
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

function stringifyStorageMeta(payload: StorageMetaPayload): string {
  return JSON.stringify(payload);
}

function deriveStatus(file: { size: number; blobSize: number; checksum?: string }, checksumMatches: boolean): OfflineRecord["status"] {
  if (file.size <= 0 || file.blobSize <= 0 || file.size !== file.blobSize) {
    return "partial";
  }

  if (file.checksum && !checksumMatches) {
    return "corrupted";
  }

  return "complete";
}

export function getIntegrityIssues(records: OfflineRecord[]): IntegrityIssues {
  const corrupted: OfflineRecord[] = [];
  const partial: OfflineRecord[] = [];

  for (const record of records) {
    if (record.status === "corrupted" || record.status === "error") {
      corrupted.push(record);
      continue;
    }

    if (record.status === "partial") {
      partial.push(record);
    }
  }

  return { corrupted, partial };
}

export async function revalidateRecord(record: OfflineRecord): Promise<OfflineRecord> {
  const file = await getFile(record.id);

  if (!file) {
    return {
      ...record,
      status: "corrupted",
    };
  }

  let checksumMatches = true;
  let checksum = file.checksum;

  if (file.blob.size > 0) {
    const generated = await generateChecksum(file.blob);

    if (!file.checksum) {
      checksum = generated;
      file.checksum = generated;
      await putFile(file);
    } else {
      checksumMatches = file.checksum === generated;
    }
  }

  const status = deriveStatus(
    {
      size: file.size,
      blobSize: file.blob.size,
      checksum,
    },
    checksumMatches,
  );

  const existingMeta = await getMetadata(`storage-meta:${record.id}`);
  const parsed = parseStorageMeta(existingMeta?.value);

  const nextMeta: StorageMetaPayload = {
    ...parsed,
    entityId: parsed.entityId ?? record.entityId,
    courseCode: parsed.courseCode ?? record.courseCode,
    source: parsed.source ?? record.source,
    downloadedAt: parsed.downloadedAt ?? record.downloadedAt,
    status,
  };

  await setMetadata({
    key: `storage-meta:${record.id}`,
    value: stringifyStorageMeta(nextMeta),
  });

  return {
    id: record.id,
    entityId: nextMeta.entityId ?? record.entityId,
    size: file.size,
    courseCode: nextMeta.courseCode ?? record.courseCode,
    mimeType: file.mimeType,
    downloadedAt: nextMeta.downloadedAt ?? record.downloadedAt,
    lastAccessedAt: file.lastAccessedAt,
    status,
    source: nextMeta.source ?? record.source,
  };
}
