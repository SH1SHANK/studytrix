import {
  buildFolderRouteQueryString,
  parseFolderTrailParam,
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
} from "@/features/navigation/folder-trail";

export type RepositoryKind = "global" | "personal";

export const PERSONAL_BREADCRUMB_ROOT_LABEL = "Personal";
const DEPARTMENT_SEGMENT_PATTERN = /^[A-Z]{2,5}$/;

type SearchParamsLike = {
  get: (name: string) => string | null;
};

export type ParsedRepositoryRoute =
  | {
    repoKind: "global";
    pathname: string;
    departmentId: string | null;
    semesterId: string | null;
    folderId: string | null;
    folderName: string | null;
    trailIds: string[];
    trailLabels: string[];
  }
  | {
    repoKind: "personal";
    pathname: string;
    departmentId: null;
    semesterId: null;
    folderId: string | null;
    folderName: string | null;
    trailIds: string[];
    trailLabels: string[];
  };

function decodeSegment(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

function normalizeRepoFromQuery(searchParams?: SearchParamsLike): RepositoryKind {
  const queryRepo = (searchParams?.get("repo") ?? "")
    .trim()
    .toLowerCase();
  return queryRepo === "personal" ? "personal" : "global";
}

function normalizeSemesterSegment(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }

  return String(parsed);
}

function withRepositoryInvariant(route: ParsedRepositoryRoute): ParsedRepositoryRoute {
  if (
    process.env.NODE_ENV !== "production"
    && route.repoKind === "personal"
    && (route.departmentId !== null || route.semesterId !== null)
  ) {
    throw new Error(
      "Repository invariant violated: personal routes must not include academic context.",
    );
  }

  return route;
}

export function parseRepositoryRoute(input: {
  pathname: string;
  searchParams?: SearchParamsLike;
}): ParsedRepositoryRoute {
  const pathname = input.pathname;
  const searchParams = input.searchParams;
  const segments = pathname.split("/").filter(Boolean);
  const folderName = (searchParams?.get("name") ?? "").trim() || null;
  const trailIds = parseFolderTrailParam(searchParams?.get(FOLDER_TRAIL_IDS_QUERY_PARAM));
  const trailLabels = parseFolderTrailParam(searchParams?.get(FOLDER_TRAIL_QUERY_PARAM));

  if ((segments[0] ?? "").toLowerCase() === "personal") {
    return withRepositoryInvariant({
      repoKind: "personal",
      pathname,
      departmentId: null,
      semesterId: null,
      folderId: decodeSegment(segments[1]),
      folderName,
      trailIds,
      trailLabels,
    });
  }

  const departmentId = decodeSegment(segments[0])?.toUpperCase() ?? null;
  const semesterId = normalizeSemesterSegment(decodeSegment(segments[1]));
  const isGlobalFolderRoute =
    departmentId !== null
    && DEPARTMENT_SEGMENT_PATTERN.test(departmentId)
    && semesterId !== null;

  if (isGlobalFolderRoute) {
    return withRepositoryInvariant({
      repoKind: "global",
      pathname,
      departmentId,
      semesterId,
      folderId: decodeSegment(segments[2]),
      folderName,
      trailIds,
      trailLabels,
    });
  }

  const rootRepoKind = normalizeRepoFromQuery(searchParams);
  if (rootRepoKind === "personal") {
    return withRepositoryInvariant({
      repoKind: "personal",
      pathname,
      departmentId: null,
      semesterId: null,
      folderId: null,
      folderName,
      trailIds,
      trailLabels,
    });
  }

  return withRepositoryInvariant({
    repoKind: "global",
    pathname,
    departmentId: null,
    semesterId: null,
    folderId: null,
    folderName,
    trailIds,
    trailLabels,
  });
}

export function buildGlobalFolderRouteHref(input: {
  departmentId: string;
  semesterId: string;
  folderId: string;
  folderName: string;
  trailLabels?: readonly string[];
  trailIds?: readonly string[];
}): string {
  const basePath = `/${encodeURIComponent(input.departmentId)}/${encodeURIComponent(input.semesterId)}/${encodeURIComponent(input.folderId)}`;
  const query = buildFolderRouteQueryString({
    folderName: input.folderName,
    trailLabels: input.trailLabels,
    trailIds: input.trailIds,
  });
  return `${basePath}${query}`;
}

export function buildPersonalFolderRouteHref(input: {
  folderId: string;
  folderName: string;
  trailLabels?: readonly string[];
  trailIds?: readonly string[];
}): string {
  const basePath = `/personal/${encodeURIComponent(input.folderId)}`;
  const query = buildFolderRouteQueryString({
    folderName: input.folderName,
    trailLabels: input.trailLabels,
    trailIds: input.trailIds,
  });
  return `${basePath}${query}`;
}
