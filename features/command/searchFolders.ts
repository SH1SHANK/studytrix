import Fuse, { type FuseResultMatch, type FuseOptionKey, type IFuseOptions } from "fuse.js";

export type Folder = {
  id: string;
  name: string;
  path: string;
};

export type FolderMatchRank = "exact" | "prefix" | "fuzzy";

export interface SearchableFolder extends Folder {
  normalizedName: string;
  normalizedPath: string;
  consonantName: string;
  consonantPath: string;
}

export interface FolderSearchHit {
  folder: Folder;
  rank: FolderMatchRank;
  score: number;
  fuseScore: number;
  matches: ReadonlyArray<FuseResultMatch>;
}

export interface FolderSearchIndex {
  items: readonly SearchableFolder[];
  fuse: Fuse<SearchableFolder>;
}

export const FOLDER_QUERY_MIN_LENGTH = 2;
export const DEFAULT_FOLDER_RESULT_LIMIT = 40;
export const FOLDER_SCORE_CUTOFF = 0.35;
export const FOLDER_FUSE_KEYS: Array<FuseOptionKey<SearchableFolder>> = [
  { name: "name", weight: 0.54 },
  { name: "path", weight: 0.18 },
  { name: "normalizedName", weight: 0.12 },
  { name: "normalizedPath", weight: 0.06 },
  { name: "consonantName", weight: 0.08 },
  { name: "consonantPath", weight: 0.02 },
];

const WHITESPACE_PATTERN = /\s+/g;

export function normalizeFolderSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase().replace(WHITESPACE_PATTERN, "");
}

function toConsonantSkeleton(value: string): string {
  return normalizeFolderSearchValue(value).replace(/[aeiou]/g, "");
}

export function toSearchableFolder(folder: Folder): SearchableFolder {
  return {
    ...folder,
    normalizedName: normalizeFolderSearchValue(folder.name),
    normalizedPath: normalizeFolderSearchValue(folder.path),
    consonantName: toConsonantSkeleton(folder.name),
    consonantPath: toConsonantSkeleton(folder.path),
  };
}

// threshold=0.35 balances typo tolerance with precision for folder names:
// - lower values miss insertion/deletion/transposition-like typos (e.g. "tutorisl")
// - higher values (>0.4) introduce noisy results on short queries.
export const FOLDER_FUSE_OPTIONS: IFuseOptions<SearchableFolder> = {
  keys: FOLDER_FUSE_KEYS,
  threshold: FOLDER_SCORE_CUTOFF,
  distance: 100,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: FOLDER_QUERY_MIN_LENGTH,
  findAllMatches: true,
};

function toRankBucket(rank: FolderMatchRank): number {
  if (rank === "exact") {
    return 0;
  }

  if (rank === "prefix") {
    return 1;
  }

  return 2;
}

function classifyFolderRank(
  folder: SearchableFolder,
  normalizedQuery: string,
): FolderMatchRank {
  const consonantQuery = toConsonantSkeleton(normalizedQuery);
  const rankValues = [
    folder.normalizedName,
    folder.normalizedPath,
    folder.consonantName,
    folder.consonantPath,
  ];

  if (rankValues.some((value) => value === normalizedQuery)) {
    return "exact";
  }

  if (consonantQuery.length > 0 && rankValues.some((value) => value === consonantQuery)) {
    return "exact";
  }

  if (
    rankValues.some((value) => value.startsWith(normalizedQuery))
    || (consonantQuery.length > 0
      && rankValues.some((value) => value.startsWith(consonantQuery)))
  ) {
    return "prefix";
  }

  return "fuzzy";
}

function compareFolderHits(left: FolderSearchHit, right: FolderSearchHit): number {
  const rankDiff = toRankBucket(left.rank) - toRankBucket(right.rank);
  if (rankDiff !== 0) {
    return rankDiff;
  }

  const scoreDiff = left.score - right.score;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const nameLengthDiff = left.folder.name.length - right.folder.name.length;
  if (nameLengthDiff !== 0) {
    return nameLengthDiff;
  }

  const nameDiff = left.folder.name.localeCompare(right.folder.name);
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return left.folder.id.localeCompare(right.folder.id);
}

function toCompositeScore(rank: FolderMatchRank, fuseScore: number): number {
  if (rank === "exact") {
    return 0;
  }

  if (rank === "prefix") {
    // Prefix should always outrank fuzzy matches even if Fuse gives a similar score.
    return Math.min(0.08, fuseScore);
  }

  return fuseScore;
}

export function buildFolderSearchIndex(
  folders: readonly Folder[],
): FolderSearchIndex {
  const items = folders.map(toSearchableFolder);
  const fuse = new Fuse(items, FOLDER_FUSE_OPTIONS);

  return {
    items,
    fuse,
  };
}

export function searchFoldersWithIndex(
  query: string,
  index: FolderSearchIndex,
  limit = DEFAULT_FOLDER_RESULT_LIMIT,
): FolderSearchHit[] {
  const normalizedQuery = normalizeFolderSearchValue(query);
  if (normalizedQuery.length < FOLDER_QUERY_MIN_LENGTH) {
    return [];
  }

  // Complexity notes:
  // - Exact/prefix pass: O(n) over folders.
  // - Fuse pass: near O(n * m) in practice, where m is query length.
  // For n<=2000 this stays fast, especially with a memoized index.
  const byId = new Map<string, FolderSearchHit>();

  for (const folder of index.items) {
    const rank = classifyFolderRank(folder, normalizedQuery);
    if (rank === "fuzzy") {
      continue;
    }

    byId.set(folder.id, {
      folder,
      rank,
      fuseScore: rank === "exact" ? 0 : 0.08,
      score: rank === "exact" ? 0 : 0.08,
      matches: [],
    });
  }

  const fuseResults = index.fuse.search(normalizedQuery, {
    limit: Math.max(limit * 2, DEFAULT_FOLDER_RESULT_LIMIT),
  });

  for (const result of fuseResults) {
    const rank = classifyFolderRank(result.item, normalizedQuery);
    const fuseScore = typeof result.score === "number" ? result.score : 1;

    // Hard quality gate prevents weak/irrelevant fuzzy matches.
    if (rank === "fuzzy" && fuseScore > FOLDER_SCORE_CUTOFF) {
      continue;
    }

    const nextHit: FolderSearchHit = {
      folder: result.item,
      rank,
      fuseScore,
      score: toCompositeScore(rank, fuseScore),
      matches: result.matches ?? [],
    };

    const currentHit = byId.get(result.item.id);
    if (!currentHit || compareFolderHits(nextHit, currentHit) < 0) {
      byId.set(result.item.id, nextHit);
    }
  }

  return Array.from(byId.values()).sort(compareFolderHits).slice(0, limit);
}

export function searchFolders(query: string, folders: Folder[]): Folder[] {
  // This pure utility is intentionally stateless.
  // For interactive UIs, prefer buildFolderSearchIndex + searchFoldersWithIndex
  // so Fuse is not recreated per keystroke.
  const index = buildFolderSearchIndex(folders);
  return searchFoldersWithIndex(query, index).map((hit) => hit.folder);
}
