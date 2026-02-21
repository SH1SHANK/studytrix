import { useDeferredValue, useMemo } from "react";
import Fuse, { type FuseResultMatch, type FuseOptionKey, type IFuseOptions } from "fuse.js";

export type FuzzyResultRank = "exact" | "prefix" | "fuzzy";

export interface FuzzySearchResult<T> {
  item: T;
  rank: FuzzyResultRank;
  score: number;
  fuseScore: number;
  matches: ReadonlyArray<FuseResultMatch>;
}

interface UseFuzzySearchOptions<T> {
  items: readonly T[];
  query: string;
  keys: ReadonlyArray<FuseOptionKey<T>>;
  getItemId: (item: T) => string;
  getSearchText: (item: T) => string;
  getRankTexts?: (item: T) => readonly string[];
  recentItems?: readonly T[];
  /** @deprecated No longer used — kept for API compat; `useDeferredValue` adapts automatically. */
  debounceMs?: number;
  limit?: number;
  minMatchCharLength?: number;
  threshold?: number;
  distance?: number;
  normalize?: (value: string) => string;
}

interface UseFuzzySearchResult<T> {
  results: FuzzySearchResult<T>[];
  debouncedQuery: string;
  isDebouncing: boolean;
  isEmptyQuery: boolean;
}

const WHITESPACE_PATTERN = /\s+/g;

function defaultNormalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(WHITESPACE_PATTERN, "");
}

function toRankBucket(rank: FuzzyResultRank): number {
  if (rank === "exact") {
    return 0;
  }

  if (rank === "prefix") {
    return 1;
  }

  return 2;
}

function toCompositeScore(rank: FuzzyResultRank, fuseScore: number): number {
  if (rank === "exact") {
    return 0;
  }

  if (rank === "prefix") {
    return Math.min(0.08, fuseScore);
  }

  return fuseScore;
}

function compareResults<T>(
  left: FuzzySearchResult<T>,
  right: FuzzySearchResult<T>,
): number {
  const rankDiff = toRankBucket(left.rank) - toRankBucket(right.rank);
  if (rankDiff !== 0) {
    return rankDiff;
  }

  const scoreDiff = left.score - right.score;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return left.fuseScore - right.fuseScore;
}

export function useFuzzySearch<T>({
  items,
  query,
  keys,
  getItemId,
  getSearchText,
  getRankTexts,
  recentItems = [],
  limit = 40,
  minMatchCharLength = 2,
  threshold = 0.35,
  distance = 100,
  normalize = defaultNormalize,
}: UseFuzzySearchOptions<T>): UseFuzzySearchResult<T> {
  const debouncedQuery = useDeferredValue(query);

  const fuseOptions = useMemo<IFuseOptions<T>>(
    () => ({
      keys: [...keys],
      threshold,
      distance,
      ignoreLocation: true,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength,
      findAllMatches: true,
    }),
    [distance, keys, minMatchCharLength, threshold],
  );

  // Fuse construction is O(n) and can be expensive if repeated.
  // Keeping it memoized ensures we only rebuild when the dataset changes.
  const fuse = useMemo(() => new Fuse(items as T[], fuseOptions), [items, fuseOptions]);

  const normalizedQuery = useMemo(() => normalize(debouncedQuery), [debouncedQuery, normalize]);
  const getNormalizedRankTexts = useMemo(() => {
    return (item: T): string[] => {
      if (getRankTexts) {
        return getRankTexts(item).map((value) => normalize(value));
      }

      return [normalize(getSearchText(item))];
    };
  }, [getRankTexts, getSearchText, normalize]);

  const results = useMemo(() => {
    if (!normalizedQuery) {
      return recentItems.slice(0, limit).map((item) => ({
        item,
        rank: "exact" as const,
        score: 0,
        fuseScore: 0,
        matches: [],
      }));
    }

    if (normalizedQuery.length < minMatchCharLength) {
      return [];
    }

    const byId = new Map<string, FuzzySearchResult<T>>();

    for (const item of items) {
      const rankTexts = getNormalizedRankTexts(item);
      let rank: FuzzyResultRank | null = null;

      if (rankTexts.some((value) => value === normalizedQuery)) {
        rank = "exact";
      } else if (rankTexts.some((value) => value.startsWith(normalizedQuery))) {
        rank = "prefix";
      }

      if (!rank) {
        continue;
      }

      byId.set(getItemId(item), {
        item,
        rank,
        score: toCompositeScore(rank, rank === "exact" ? 0 : 0.08),
        fuseScore: rank === "exact" ? 0 : 0.08,
        matches: [],
      });
    }

    const fuseResults = fuse.search(normalizedQuery, {
      limit: Math.max(limit * 2, limit),
    });

    for (const result of fuseResults) {
      const item = result.item;
      const itemId = getItemId(item);
      const rankTexts = getNormalizedRankTexts(item);

      let rank: FuzzyResultRank = "fuzzy";
      if (rankTexts.some((value) => value === normalizedQuery)) {
        rank = "exact";
      } else if (rankTexts.some((value) => value.startsWith(normalizedQuery))) {
        rank = "prefix";
      }

      const fuseScore = typeof result.score === "number" ? result.score : 1;

      // Hard cutoff removes weak fuzzy matches to keep output relevant.
      if (rank === "fuzzy" && fuseScore > threshold) {
        continue;
      }

      const next: FuzzySearchResult<T> = {
        item,
        rank,
        fuseScore,
        score: toCompositeScore(rank, fuseScore),
        matches: result.matches ?? [],
      };

      const current = byId.get(itemId);
      if (!current || compareResults(next, current) < 0) {
        byId.set(itemId, next);
      }
    }

    return Array.from(byId.values()).sort(compareResults).slice(0, limit);
  }, [
    fuse,
    getItemId,
    getNormalizedRankTexts,
    items,
    limit,
    minMatchCharLength,
    normalizedQuery,
    recentItems,
    threshold,
  ]);

  return useMemo(
    () => ({
      results,
      debouncedQuery,
      isDebouncing: query !== debouncedQuery,
      isEmptyQuery: normalizedQuery.length === 0,
    }),
    [debouncedQuery, normalizedQuery.length, query, results],
  );
}
