import type { CommandContext } from "./command.context";
import type { SearchEntry } from "./command.index";
import type { QueryAST } from "./command.types";
import {
  matchesAllKeywords,
  matchesBooleanFilter,
  matchesComparison,
  matchesFieldFilter,
  scoreMatch,
} from "./command.scoring";

const DEFAULT_LIMIT = 50;

export interface EvaluateOptions {
  limit?: number;
}

interface ScoredEntry {
  entry: SearchEntry;
  score: number;
}

function matchesAst(entry: SearchEntry, ast: QueryAST): boolean {
  if (!matchesAllKeywords(entry, ast.keywords)) {
    return false;
  }

  if (!ast.fieldFilters.every((filter) => matchesFieldFilter(entry, filter))) {
    return false;
  }

  if (!ast.comparisons.every((comparison) => matchesComparison(entry, comparison))) {
    return false;
  }

  if (!ast.booleanFilters.every((booleanFilter) => matchesBooleanFilter(entry, booleanFilter))) {
    return false;
  }

  return true;
}

function evaluateAst(index: SearchEntry[], ast: QueryAST, context: CommandContext): ScoredEntry[] {
  const scored: ScoredEntry[] = [];

  for (const entry of index) {
    if (!matchesAst(entry, ast)) {
      continue;
    }

    scored.push({
      entry,
      score: scoreMatch(entry, ast, context),
    });
  }

  return scored;
}

function sortScoredEntries(left: ScoredEntry, right: ScoredEntry): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const nameDiff = left.entry.name.localeCompare(right.entry.name);
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return left.entry.id.localeCompare(right.entry.id);
}

export function evaluate(
  index: SearchEntry[],
  ast: QueryAST,
  context: CommandContext,
  options: EvaluateOptions = {},
): SearchEntry[] {
  const groups = [ast, ...(ast.orGroups ?? [])];
  const merged = new Map<string, ScoredEntry>();

  for (const groupAst of groups) {
    const scoredEntries = evaluateAst(index, groupAst, context);

    for (const scoredEntry of scoredEntries) {
      const existing = merged.get(scoredEntry.entry.id);

      if (!existing || scoredEntry.score > existing.score) {
        merged.set(scoredEntry.entry.id, scoredEntry);
      }
    }
  }

  const limit =
    typeof options.limit === "number" &&
    Number.isInteger(options.limit) &&
    options.limit > 0
      ? options.limit
      : DEFAULT_LIMIT;

  return Array.from(merged.values())
    .sort(sortScoredEntries)
    .slice(0, limit)
    .map((item) => item.entry);
}
