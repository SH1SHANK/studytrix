import type { CommandContext } from "./command.context";
import type { SearchEntry } from "./command.index";
import type {
  BooleanFilter,
  ComparisonFilter,
  FieldFilter,
  QueryAST,
} from "./command.types";

const SCORE_CAP = 100;
const MAX_RAW_SCORE = 300;

export interface ScoreDetail {
  reason: string;
  points: number;
  matched: boolean;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function getEntryExtension(entry: SearchEntry): string {
  const name = entry.name;
  const lastDot = name.lastIndexOf(".");

  if (lastDot <= 0 || lastDot >= name.length - 1) {
    return "";
  }

  return normalize(name.slice(lastDot + 1));
}

function getMimeGroup(entry: SearchEntry): string {
  const mime = normalize(entry.mime);

  if (!mime) {
    return entry.type;
  }

  if (mime === "application/pdf") {
    return "pdf";
  }

  if (mime.startsWith("image/")) {
    return "image";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  if (mime.startsWith("audio/")) {
    return "audio";
  }

  if (mime.startsWith("text/")) {
    return "text";
  }

  return mime;
}

function compareNumber(
  left: number,
  operator: ComparisonFilter["operator"],
  right: number,
): boolean {
  if (operator === ">") {
    return left > right;
  }

  if (operator === "<") {
    return left < right;
  }

  if (operator === ">=") {
    return left >= right;
  }

  if (operator === "<=") {
    return left <= right;
  }

  return left === right;
}

function getComparableNumber(entry: SearchEntry, field: ComparisonFilter["field"]): number | null {
  if (field === "size") {
    return Number.isFinite(entry.size) ? (entry.size as number) : null;
  }

  if (field === "modified") {
    if (!entry.modifiedTime) {
      return null;
    }

    const parsed = Date.parse(entry.modifiedTime);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (!entry.createdTime) {
    return null;
  }

  const parsed = Date.parse(entry.createdTime);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreWordBoundary(name: string, keyword: string): number {
  const words = name.split(/[\s_\-.]+/);

  for (const word of words) {
    if (word.length > 0 && word !== keyword && word.startsWith(keyword)) {
      return 15;
    }
  }

  return 0;
}

function scoreSubsequence(name: string, keyword: string): number {
  let ki = 0;

  for (let ni = 0; ni < name.length && ki < keyword.length; ni += 1) {
    if (name[ni] === keyword[ki]) {
      ki += 1;
    }
  }

  return ki === keyword.length ? 8 : 0;
}

export function scoreKeyword(entry: SearchEntry, keyword: string): number {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) {
    return 0;
  }

  const name = normalize(entry.name);

  if (name === normalizedKeyword) {
    return 100;
  }

  if (name.startsWith(normalizedKeyword)) {
    return 70;
  }

  if (entry.rawString.includes(normalizedKeyword)) {
    return 50 + scoreWordBoundary(name, normalizedKeyword);
  }

  const boundaryScore = scoreWordBoundary(name, normalizedKeyword);
  if (boundaryScore > 0) {
    return 35 + boundaryScore;
  }

  const subseqScore = scoreSubsequence(name, normalizedKeyword);
  if (subseqScore > 0) {
    return subseqScore;
  }

  return 0;
}

export function matchesFieldFilter(entry: SearchEntry, filter: FieldFilter): boolean {
  const values = filter.values.map(normalize).filter(Boolean);

  if (values.length === 0) {
    return true;
  }

  if (filter.field === "tag") {
    const tagSet = new Set((entry.tags ?? []).map(normalize));
    return values.some((value) => tagSet.has(value));
  }

  if (filter.field === "type") {
    const entryType = normalize(entry.type);
    const mimeGroup = getMimeGroup(entry);
    return values.some((value) => value === entryType || value === mimeGroup);
  }

  if (filter.field === "course") {
    const courseCode = normalize(entry.courseCode);
    return values.some((value) => value === courseCode);
  }

  if (filter.field === "ext") {
    const extension = getEntryExtension(entry);
    return values.some((value) => value.replace(/^\./, "") === extension);
  }

  const mime = normalize(entry.mime);
  return values.some((value) => mime === value || mime.includes(value));
}

export function matchesComparison(entry: SearchEntry, comparison: ComparisonFilter): boolean {
  const candidate = getComparableNumber(entry, comparison.field);

  if (candidate === null) {
    return false;
  }

  return compareNumber(candidate, comparison.operator, comparison.value);
}

export function matchesBooleanFilter(entry: SearchEntry, filter: BooleanFilter): boolean {
  if (filter.field === "starred") {
    return Boolean(entry.starred) === filter.value;
  }

  return Boolean(entry.offline) === filter.value;
}

export function matchesKeyword(entry: SearchEntry, keyword: string): boolean {
  return scoreKeyword(entry, keyword) > 0;
}

export function matchesAllKeywords(entry: SearchEntry, keywords: readonly string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }

  return keywords.every((keyword) => matchesKeyword(entry, keyword));
}

function getCurrentFolder(context: CommandContext): string | undefined {
  return context.currentFolderId ?? context.folderId;
}

function getContextBoost(entry: SearchEntry, context: CommandContext): number {
  const currentFolder = normalize(getCurrentFolder(context));

  if (!currentFolder) {
    return 0;
  }

  if (normalize(entry.parentId) === currentFolder || normalize(entry.id) === currentFolder) {
    return 30;
  }

  return 0;
}

export function explainScore(
  entry: SearchEntry,
  ast: QueryAST,
  context: CommandContext,
): ScoreDetail[] {
  const details: ScoreDetail[] = [];

  for (const keyword of ast.keywords) {
    const points = scoreKeyword(entry, keyword);
    details.push({
      reason: `keyword:${keyword}`,
      points,
      matched: points > 0,
    });
  }

  for (const filter of ast.fieldFilters) {
    const matched = matchesFieldFilter(entry, filter);
    details.push({
      reason: `field:${filter.field}`,
      points: matched ? (filter.field === "tag" ? 30 : 25) : 0,
      matched,
    });
  }

  for (const comparison of ast.comparisons) {
    const matched = matchesComparison(entry, comparison);
    details.push({
      reason: `comparison:${comparison.field}${comparison.operator}${comparison.value}`,
      points: matched ? 20 : 0,
      matched,
    });
  }

  for (const boolFilter of ast.booleanFilters) {
    const matched = matchesBooleanFilter(entry, boolFilter);
    details.push({
      reason: `boolean:${boolFilter.field}`,
      points: matched ? 40 : 0,
      matched,
    });
  }

  const starredBoost = Boolean(entry.starred) ? 25 : 0;
  details.push({
    reason: "boost:starred",
    points: starredBoost,
    matched: starredBoost > 0,
  });

  const offlineBoost = Boolean(entry.offline) ? 10 : 0;
  details.push({
    reason: "boost:offline",
    points: offlineBoost,
    matched: offlineBoost > 0,
  });

  const contextBoost = getContextBoost(entry, context);
  details.push({
    reason: "boost:context",
    points: contextBoost,
    matched: contextBoost > 0,
  });

  return details;
}

function normalizeScore(raw: number): number {
  if (raw <= 0) {
    return 0;
  }

  const normalized = Math.round((raw / MAX_RAW_SCORE) * SCORE_CAP);
  return Math.min(SCORE_CAP, Math.max(1, normalized));
}

export function scoreMatch(
  entry: SearchEntry,
  ast: QueryAST,
  context: CommandContext,
): number {
  const details = explainScore(entry, ast, context);
  const total = details.reduce((sum, detail) => sum + detail.points, 0);
  return normalizeScore(total);
}
