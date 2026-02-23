import { INTELLIGENCE_KEYWORD_SCORE_CAP } from "./intelligence.constants";

export interface MergeInputItem<TItem> {
  item: TItem;
  keywordScore: number;
  semanticScore: number;
  dedupeKey: string;
  semanticOnly?: boolean;
}

export interface MergeResultItem<TItem> {
  item: TItem;
  finalScore: number;
  keywordNorm: number;
  semanticNorm: number;
  semanticOnly: boolean;
}

export function normalizeKeywordScore(score: number): number {
  if (!Number.isFinite(score) || score <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, score / INTELLIGENCE_KEYWORD_SCORE_CAP));
}

export function normalizeSemanticScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, score));
}

export function mergeSemanticKeywordResults<TItem>(params: {
  items: readonly MergeInputItem<TItem>[];
  semanticWeightPercent: number;
  limit: number;
  sortTieBreaker?: (left: TItem, right: TItem) => number;
}): MergeResultItem<TItem>[] {
  const semanticWeight = Math.max(0, Math.min(1, params.semanticWeightPercent / 100));
  const keywordWeight = 1 - semanticWeight;
  const merged = new Map<string, MergeResultItem<TItem>>();

  for (const candidate of params.items) {
    const keywordNorm = normalizeKeywordScore(candidate.keywordScore);
    const semanticNorm = normalizeSemanticScore(candidate.semanticScore);
    const finalScore = keywordNorm * keywordWeight + semanticNorm * semanticWeight;

    const next: MergeResultItem<TItem> = {
      item: candidate.item,
      finalScore,
      keywordNorm,
      semanticNorm,
      semanticOnly: candidate.semanticOnly === true,
    };

    const existing = merged.get(candidate.dedupeKey);
    if (!existing || next.finalScore > existing.finalScore) {
      merged.set(candidate.dedupeKey, next);
    }
  }

  const limit = Math.max(1, Math.floor(params.limit));

  return Array.from(merged.values())
    .sort((left, right) => {
      if (right.finalScore !== left.finalScore) {
        return right.finalScore - left.finalScore;
      }

      if (params.sortTieBreaker) {
        return params.sortTieBreaker(left.item, right.item);
      }

      return 0;
    })
    .slice(0, limit);
}
