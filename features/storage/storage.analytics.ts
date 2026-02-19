import type {
  CourseStorage,
  MimeBreakdown,
  OfflineRecord,
  StorageStats,
} from "./storage.types";

const totalStatsCache = new WeakMap<ReadonlyArray<OfflineRecord>, StorageStats>();
const courseCache = new WeakMap<ReadonlyArray<OfflineRecord>, CourseStorage[]>();
const mimeCache = new WeakMap<ReadonlyArray<OfflineRecord>, MimeBreakdown[]>();
const largestFilesCache = new WeakMap<ReadonlyArray<OfflineRecord>, Map<number, OfflineRecord[]>>();

export function computeTotalStats(records: OfflineRecord[]): StorageStats {
  const cached = totalStatsCache.get(records);
  if (cached) {
    return cached;
  }

  const stats: StorageStats = {
    totalFiles: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.size, 0),
    quotaBytes: null,
    usageBytes: null,
  };

  totalStatsCache.set(records, stats);
  return stats;
}

export function groupByCourse(records: OfflineRecord[]): CourseStorage[] {
  const cached = courseCache.get(records);
  if (cached) {
    return cached;
  }

  const byCourse = new Map<string, CourseStorage>();

  for (const record of records) {
    const courseCode = record.courseCode.trim() || "GENERAL";
    const existing = byCourse.get(courseCode);

    if (existing) {
      existing.fileCount += 1;
      existing.bytes += record.size;
      continue;
    }

    byCourse.set(courseCode, {
      courseCode,
      fileCount: 1,
      bytes: record.size,
    });
  }

  const grouped = Array.from(byCourse.values()).sort((left, right) => {
    if (left.bytes !== right.bytes) {
      return right.bytes - left.bytes;
    }

    return left.courseCode.localeCompare(right.courseCode);
  });

  courseCache.set(records, grouped);
  return grouped;
}

export function largestFiles(records: OfflineRecord[], limit: number): OfflineRecord[] {
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

  const cacheByLimit = largestFilesCache.get(records);
  if (cacheByLimit?.has(normalizedLimit)) {
    return cacheByLimit.get(normalizedLimit) ?? [];
  }

  const result = [...records]
    .sort((left, right) => {
      if (left.size !== right.size) {
        return right.size - left.size;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, normalizedLimit);

  if (cacheByLimit) {
    cacheByLimit.set(normalizedLimit, result);
  } else {
    largestFilesCache.set(records, new Map([[normalizedLimit, result]]));
  }

  return result;
}

export function groupByMime(records: OfflineRecord[]): MimeBreakdown[] {
  const cached = mimeCache.get(records);
  if (cached) {
    return cached;
  }

  const byMime = new Map<string, MimeBreakdown>();

  for (const record of records) {
    const mime = record.mimeType.trim() || "application/octet-stream";
    const existing = byMime.get(mime);

    if (existing) {
      existing.count += 1;
      existing.bytes += record.size;
      continue;
    }

    byMime.set(mime, {
      mime,
      count: 1,
      bytes: record.size,
    });
  }

  const grouped = Array.from(byMime.values()).sort((left, right) => {
    if (left.bytes !== right.bytes) {
      return right.bytes - left.bytes;
    }

    return left.mime.localeCompare(right.mime);
  });

  mimeCache.set(records, grouped);
  return grouped;
}
