export function computeUsagePercent(
  quota: number | null,
  usage: number | null,
): number | null {
  if (
    quota === null ||
    usage === null ||
    !Number.isFinite(quota) ||
    !Number.isFinite(usage) ||
    quota <= 0
  ) {
    return null;
  }

  const percent = (usage / quota) * 100;

  if (!Number.isFinite(percent)) {
    return null;
  }

  if (percent < 0) {
    return 0;
  }

  if (percent > 100) {
    return 100;
  }

  return percent;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

export function getQuotaState(percent: number | null): "unknown" | "normal" | "warn" | "alert" {
  if (percent === null) {
    return "unknown";
  }

  if (percent > 90) {
    return "alert";
  }

  if (percent > 70) {
    return "warn";
  }

  return "normal";
}
