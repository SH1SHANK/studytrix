export type DownloadRiskItem = {
  id: string;
  name: string;
  sizeBytes?: number | null;
  kind?: "file" | "folder";
};

export type DownloadRiskTier = "none" | "warn" | "confirm";

export type DownloadRiskSummary = {
  tier: DownloadRiskTier;
  totalCount: number;
  knownTotalBytes: number;
  unknownSizeCount: number;
  warnItems: DownloadRiskItem[];
  confirmItems: DownloadRiskItem[];
  maxSizeBytes: number;
};

export const DOWNLOAD_WARN_THRESHOLD_BYTES = 25 * 1024 * 1024;
export const DOWNLOAD_CONFIRM_THRESHOLD_BYTES = 100 * 1024 * 1024;

function normalizeSizeBytes(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return value > 0 ? Math.floor(value) : 0;
}

export function assessDownloadRisk(
  items: DownloadRiskItem[],
  options?: {
    warnThresholdBytes?: number;
    confirmThresholdBytes?: number;
  },
): DownloadRiskSummary {
  const warnThreshold = options?.warnThresholdBytes ?? DOWNLOAD_WARN_THRESHOLD_BYTES;
  const confirmThreshold = options?.confirmThresholdBytes ?? DOWNLOAD_CONFIRM_THRESHOLD_BYTES;

  const warnItems: DownloadRiskItem[] = [];
  const confirmItems: DownloadRiskItem[] = [];
  let knownTotalBytes = 0;
  let unknownSizeCount = 0;
  let maxSizeBytes = 0;

  for (const item of items) {
    const size = normalizeSizeBytes(item.sizeBytes);
    if (size <= 0) {
      unknownSizeCount += 1;
      continue;
    }

    knownTotalBytes += size;
    maxSizeBytes = Math.max(maxSizeBytes, size);

    if (size >= confirmThreshold) {
      confirmItems.push(item);
      continue;
    }

    if (size >= warnThreshold) {
      warnItems.push(item);
    }
  }

  const tier: DownloadRiskTier =
    confirmItems.length > 0
      ? "confirm"
      : warnItems.length > 0 || unknownSizeCount > 0
        ? "warn"
        : "none";

  return {
    tier,
    totalCount: items.length,
    knownTotalBytes,
    unknownSizeCount,
    warnItems,
    confirmItems,
    maxSizeBytes,
  };
}

export function summarizeRiskItems(items: DownloadRiskItem[], limit = 3): string {
  if (items.length === 0) {
    return "";
  }

  const preview = items
    .slice(0, limit)
    .map((item) => `\"${item.name}\"`)
    .join(", ");
  const remainder = items.length - Math.min(items.length, limit);
  if (remainder > 0) {
    return `${preview} and ${remainder} more`;
  }

  return preview;
}

export function buildDownloadRiskWarningMessage(summary: DownloadRiskSummary): string | null {
  if (summary.tier === "none") {
    return null;
  }

  if (summary.confirmItems.length > 0) {
    const names = summarizeRiskItems(summary.confirmItems);
    return `${summary.confirmItems.length} huge file${summary.confirmItems.length > 1 ? "s" : ""} detected (${names}). Confirmation required before continuing.`;
  }

  if (summary.warnItems.length > 0) {
    const names = summarizeRiskItems(summary.warnItems);
    const unknownPart =
      summary.unknownSizeCount > 0
        ? ` ${summary.unknownSizeCount} file${summary.unknownSizeCount > 1 ? "s have" : " has"} unknown size.`
        : "";
    return `${summary.warnItems.length} large file${summary.warnItems.length > 1 ? "s" : ""} detected (${names}). These may take longer to process.${unknownPart}`;
  }

  if (summary.unknownSizeCount > 0) {
    return `${summary.unknownSizeCount} file${summary.unknownSizeCount > 1 ? "s have" : " has"} unknown size and may take longer to process.`;
  }

  return null;
}

export function buildDownloadRiskConfirmDescription(summary: DownloadRiskSummary): string {
  const hugeCount = summary.confirmItems.length;
  const hugeNames = summarizeRiskItems(summary.confirmItems);
  const unknownPart =
    summary.unknownSizeCount > 0
      ? ` ${summary.unknownSizeCount} additional file${summary.unknownSizeCount > 1 ? "s have" : " has"} unknown size.`
      : "";

  return `${hugeCount} huge file${hugeCount > 1 ? "s are" : " is"} in this action (${hugeNames}). This can be slow or fail on weak networks.${unknownPart}`;
}
