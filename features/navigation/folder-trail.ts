export const FOLDER_TRAIL_QUERY_PARAM = "trail";
export const FOLDER_TRAIL_IDS_QUERY_PARAM = "trailIds";

function decodeValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeSegment(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSegments(values: readonly unknown[]): string[] {
  const normalized: string[] = [];
  for (const value of values) {
    const segment = normalizeSegment(value);
    if (!segment) {
      continue;
    }
    if (normalized[normalized.length - 1] === segment) {
      continue;
    }
    normalized.push(segment);
  }
  return normalized;
}

export function serializeFolderTrailParam(segments: readonly string[]): string {
  return JSON.stringify(normalizeSegments(segments));
}

export function parseFolderTrailParam(raw: string | null | undefined): string[] {
  const normalizedRaw = normalizeSegment(raw);
  if (!normalizedRaw) {
    return [];
  }

  const decoded = decodeValue(normalizedRaw);
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (Array.isArray(parsed)) {
      return normalizeSegments(parsed);
    }
  } catch {
    // Fall through to legacy delimiter parsing.
  }

  if (decoded.includes(" / ")) {
    return normalizeSegments(decoded.split(" / "));
  }

  if (decoded.includes("|")) {
    return normalizeSegments(decoded.split("|"));
  }

  return normalizeSegments([decoded]);
}

export function buildFolderRouteHref(input: {
  departmentId: string;
  semesterId: string;
  folderId: string;
  folderName: string;
  trailLabels?: readonly string[];
  trailIds?: readonly string[];
}): string {
  const params = new URLSearchParams();
  params.set("name", input.folderName);

  const trailLabels = normalizeSegments(input.trailLabels ?? []);
  if (trailLabels.length > 0) {
    params.set(FOLDER_TRAIL_QUERY_PARAM, serializeFolderTrailParam(trailLabels));
  }

  const trailIds = normalizeSegments(input.trailIds ?? []);
  if (trailIds.length > 0) {
    params.set(FOLDER_TRAIL_IDS_QUERY_PARAM, serializeFolderTrailParam(trailIds));
  }

  const basePath = `/${encodeURIComponent(input.departmentId)}/${encodeURIComponent(input.semesterId)}/${encodeURIComponent(input.folderId)}`;
  const query = params.toString();
  return query.length > 0 ? `${basePath}?${query}` : basePath;
}
