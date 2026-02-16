import type { DownloadRules } from "./offline.types";

const DEFAULT_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

function normalizeMimeList(values: string[] | undefined): Set<string> {
  return new Set(
    (values ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

export function shouldDownload(
  mimeType: string,
  size: number,
  rules: DownloadRules,
): boolean {
  if (!Number.isFinite(size) || size < 0) {
    return false;
  }

  const normalizedMime = mimeType.trim().toLowerCase();
  if (!normalizedMime) {
    return false;
  }

  const excluded = normalizeMimeList(rules.excludeMimeTypes);
  if (excluded.has(normalizedMime)) {
    return false;
  }

  const maxFileSize =
    typeof rules.maxFileSizeBytes === "number" &&
    Number.isFinite(rules.maxFileSizeBytes) &&
    rules.maxFileSizeBytes > 0
      ? rules.maxFileSizeBytes
      : DEFAULT_MAX_FILE_SIZE_BYTES;

  if (size > maxFileSize) {
    return false;
  }

  const allowed = normalizeMimeList(rules.allowMimeTypes);
  if (allowed.size > 0) {
    return allowed.has(normalizedMime);
  }

  return true;
}
