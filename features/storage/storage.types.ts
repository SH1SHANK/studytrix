export interface OfflineRecord {
  id: string;
  entityId: string;
  size: number;
  courseCode: string;
  mimeType: string;
  downloadedAt: number;
  lastAccessedAt: number;
  status: "complete" | "partial" | "corrupted" | "error";
  source: "manual" | "prefetch";
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  quotaBytes: number | null;
  usageBytes: number | null;
}

export interface CourseStorage {
  courseCode: string;
  fileCount: number;
  bytes: number;
}

export interface MimeBreakdown {
  mime: string;
  count: number;
  bytes: number;
}

export interface QuotaEstimate {
  quota: number | null;
  usage: number | null;
}

export interface IntegrityIssues {
  corrupted: OfflineRecord[];
  partial: OfflineRecord[];
}
