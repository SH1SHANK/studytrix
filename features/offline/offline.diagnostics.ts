"use client";

import {
  getAllFileIds,
  getAllFiles,
  getMetadataByPrefix,
  getProviderFileBlob,
  listPendingSync,
} from "@/features/offline/offline.db";
import { getActiveProvider, supportsFileSystemAccess } from "@/features/offline/offline.storage-location";
import type { StorageLocationState } from "@/features/offline/offline.storage-location.store";

const PROVIDER_FILEMAP_PREFIX = "provider-file:";
const SAMPLE_LIMIT = 8;

export interface OfflineStorageDiagnostics {
  generatedAt: string;
  runtime: {
    online: boolean;
    supportsFileSystemAccess: boolean;
  };
  storageLocation: {
    status: StorageLocationState["status"];
    providerType: StorageLocationState["providerType"];
    handleStatus: StorageLocationState["handleStatus"];
    displayPath: string | null;
    providerAccessOk: boolean | null;
  };
  counts: {
    offlineRecords: number;
    offlineFileIds: number;
    providerFiles: number | null;
    pendingSync: number;
    providerFileMappings: number;
    mappedFilesMissingInProvider: number;
    idsMissingReadableProviderBlob: number | null;
  };
  samples: {
    offlineFileIds: string[];
    providerFiles: string[];
    pendingSyncIds: string[];
    unreadableProviderIds: string[];
  };
  quota: {
    usage: number | null;
    quota: number | null;
    available: number | null;
  };
}

function trimSample(values: string[]): string[] {
  return values.slice(0, SAMPLE_LIMIT);
}

export async function collectOfflineStorageDiagnostics(
  state: Pick<StorageLocationState, "status" | "providerType" | "handleStatus" | "displayPath">,
): Promise<OfflineStorageDiagnostics> {
  const provider = getActiveProvider();

  const [records, ids, pending, fileMappings, estimate] = await Promise.all([
    getAllFiles(),
    getAllFileIds(),
    listPendingSync(),
    getMetadataByPrefix(PROVIDER_FILEMAP_PREFIX),
    (async () => {
      if (
        typeof navigator === "undefined"
        || !navigator.storage
        || typeof navigator.storage.estimate !== "function"
      ) {
        return { usage: null, quota: null };
      }

      try {
        const result = await navigator.storage.estimate();
        return {
          usage: typeof result.usage === "number" ? result.usage : null,
          quota: typeof result.quota === "number" ? result.quota : null,
        };
      } catch {
        return { usage: null, quota: null };
      }
    })(),
  ]);

  const providerAccessOk =
    provider && provider.kind === "filesystem"
      ? await provider.testAccess().catch(() => false)
      : null;

  let providerFiles: string[] = [];
  if (provider && provider.kind === "filesystem") {
    providerFiles = await provider.listFiles().catch(() => []);
  }

  const providerFileSet = new Set(providerFiles);
  const mappedMissing = fileMappings.filter((record) => {
    const fileName = record.value.trim();
    return fileName.length > 0 && !providerFileSet.has(fileName);
  });

  let unreadableProviderIds: string[] = [];
  if (provider && provider.kind === "filesystem") {
    const checks = await Promise.all(
      ids.map(async (fileId) => {
        const blob = await getProviderFileBlob(fileId).catch(() => null);
        return blob ? null : fileId;
      }),
    );
    unreadableProviderIds = checks.filter((value): value is string => typeof value === "string");
  }

  return {
    generatedAt: new Date().toISOString(),
    runtime: {
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      supportsFileSystemAccess: supportsFileSystemAccess(),
    },
    storageLocation: {
      status: state.status,
      providerType: state.providerType,
      handleStatus: state.handleStatus,
      displayPath: state.displayPath,
      providerAccessOk,
    },
    counts: {
      offlineRecords: records.length,
      offlineFileIds: ids.length,
      providerFiles: provider && provider.kind === "filesystem" ? providerFiles.length : null,
      pendingSync: pending.length,
      providerFileMappings: fileMappings.length,
      mappedFilesMissingInProvider: mappedMissing.length,
      idsMissingReadableProviderBlob:
        provider && provider.kind === "filesystem" ? unreadableProviderIds.length : null,
    },
    samples: {
      offlineFileIds: trimSample(ids),
      providerFiles: trimSample(providerFiles),
      pendingSyncIds: trimSample(pending.map((entry) => entry.fileId)),
      unreadableProviderIds: trimSample(unreadableProviderIds),
    },
    quota: {
      usage: estimate.usage,
      quota: estimate.quota,
      available:
        estimate.usage !== null && estimate.quota !== null
          ? Math.max(0, estimate.quota - estimate.usage)
          : null,
    },
  };
}
