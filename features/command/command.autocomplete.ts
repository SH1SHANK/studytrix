import type { CommandContext } from "./command.context";
import type { SearchEntry } from "./command.index";

export interface Suggestion {
  value: string;
  label: string;
  type: "field" | "value" | "command" | "history" | "tag";
}

const FIELD_KEYS = ["tag", "type", "course", "ext", "mime"] as const;
const BOOLEAN_KEYS = ["starred", "offline"] as const;
const COMPARISON_KEYS = ["size", "modified", "created"] as const;
const COMPARISON_OPERATORS = [">", "<", ">=", "<=", "="] as const;

const MIME_GROUP_VALUES = ["file", "folder", "course", "tag", "command", "pdf", "image", "video", "audio", "text"];

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function dedupeSuggestions(suggestions: Suggestion[], limit: number): Suggestion[] {
  const seen = new Set<string>();
  const next: Suggestion[] = [];

  for (const suggestion of suggestions) {
    const key = `${suggestion.type}:${normalize(suggestion.value)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(suggestion);

    if (next.length >= limit) {
      break;
    }
  }

  return next;
}

function extractLastToken(input: string): string {
  const trimmed = input.trimStart();
  if (!trimmed) {
    return "";
  }

  const tokens = trimmed.split(/\s+/);
  return tokens[tokens.length - 1] ?? "";
}

function getTagUsage(index: SearchEntry[]): Map<string, number> {
  const usage = new Map<string, number>();

  for (const entry of index) {
    for (const tag of entry.tags ?? []) {
      const normalized = normalize(tag);
      if (!normalized) {
        continue;
      }

      usage.set(normalized, (usage.get(normalized) ?? 0) + 1);
    }

    if (entry.type === "tag") {
      const normalizedName = normalize(entry.name);
      if (!normalizedName) {
        continue;
      }

      usage.set(normalizedName, (usage.get(normalizedName) ?? 0) + 1);
    }
  }

  return usage;
}

function collectUniqueValues(index: SearchEntry[], selector: (entry: SearchEntry) => string | undefined): string[] {
  const values = new Set<string>();

  for (const entry of index) {
    const value = normalize(selector(entry));
    if (value) {
      values.add(value);
    }
  }

  return Array.from(values);
}

function collectTagSuggestions(index: SearchEntry[], prefix: string): Suggestion[] {
  const usage = getTagUsage(index);

  return Array.from(usage.entries())
    .filter(([tagName]) => tagName.includes(prefix))
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .map(([tagName]) => ({
      value: `tag:${tagName}`,
      label: `Tag ${tagName}`,
      type: "tag" as const,
    }));
}

function collectSystemCommandSuggestions(index: SearchEntry[]): Suggestion[] {
  return index
    .filter((entry) => entry.type === "command")
    .map((entry) => ({
      value: entry.name,
      label: entry.name,
      type: "command" as const,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function suggestFields(prefix: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const field of FIELD_KEYS) {
    if (field.startsWith(prefix)) {
      suggestions.push({
        value: `${field}:`,
        label: `${field}:`,
        type: "field",
      });
    }
  }

  for (const field of BOOLEAN_KEYS) {
    if (field.startsWith(prefix)) {
      suggestions.push({
        value: `${field}:`,
        label: `${field}:true|false`,
        type: "field",
      });
    }
  }

  for (const field of COMPARISON_KEYS) {
    if (field.startsWith(prefix)) {
      suggestions.push({
        value: `${field}>`,
        label: `${field}><>=`,
        type: "field",
      });
    }
  }

  return suggestions;
}

function suggestForFieldValue(
  field: string,
  valuePrefix: string,
  index: SearchEntry[],
): Suggestion[] {
  if (field === "tag") {
    return collectTagSuggestions(index, valuePrefix);
  }

  if (field === "type") {
    return MIME_GROUP_VALUES
      .filter((value) => value.includes(valuePrefix))
      .map((value) => ({
        value: `type:${value}`,
        label: `Type ${value}`,
        type: "value" as const,
      }));
  }

  if (field === "mime") {
    return collectUniqueValues(index, (entry) => entry.mime)
      .filter((mime) => mime.includes(valuePrefix))
      .map((mime) => ({
        value: `mime:${mime}`,
        label: `MIME ${mime}`,
        type: "value" as const,
      }));
  }

  if (field === "course") {
    return collectUniqueValues(index, (entry) => entry.courseCode)
      .filter((code) => code.includes(valuePrefix))
      .map((code) => ({
        value: `course:${code}`,
        label: `Course ${code.toUpperCase()}`,
        type: "value" as const,
      }));
  }

  if (field === "ext") {
    const extensions = collectUniqueValues(index, (entry) => {
      const dot = entry.name.lastIndexOf(".");
      if (dot <= 0 || dot >= entry.name.length - 1) {
        return undefined;
      }

      return entry.name.slice(dot + 1);
    });

    return extensions
      .filter((ext) => ext.includes(valuePrefix))
      .map((ext) => ({
        value: `ext:${ext}`,
        label: `Extension .${ext}`,
        type: "value" as const,
      }));
  }

  if (field === "starred" || field === "offline") {
    return ["true", "false"]
      .filter((value) => value.startsWith(valuePrefix))
      .map((value) => ({
        value: `${field}:${value}`,
        label: `${field}:${value}`,
        type: "value" as const,
      }));
  }

  return [];
}

function suggestComparisonOperators(term: string): Suggestion[] {
  const normalized = normalize(term);

  const matched = COMPARISON_KEYS.find((field) => normalized.startsWith(field));
  if (!matched) {
    return [];
  }

  return COMPARISON_OPERATORS.map((operator) => ({
    value: `${matched}${operator}`,
    label: `${matched}${operator}`,
    type: "field" as const,
  }));
}

function suggestHistory(context: CommandContext, input: string): Suggestion[] {
  const prefix = normalize(input);

  return (context.recentFilters ?? [])
    .map((value) => normalize(value))
    .filter((value) => value.includes(prefix))
    .map((value) => ({
      value,
      label: `Recent ${value}`,
      type: "history" as const,
    }));
}

export function suggest(
  input: string,
  context: CommandContext,
  index: SearchEntry[],
): Suggestion[] {
  const normalizedInput = normalize(input);
  const lastToken = normalize(extractLastToken(input));

  const suggestions: Suggestion[] = [];

  if (!normalizedInput) {
    suggestions.push(...collectSystemCommandSuggestions(index));
    suggestions.push(...suggestHistory(context, ""));

    const frequentTags = collectTagSuggestions(index, "").slice(0, 8);
    suggestions.push(...frequentTags);

    return dedupeSuggestions(suggestions, 20);
  }

  if (!lastToken.includes(":") && !/[><=]/.test(lastToken)) {
    suggestions.push(...suggestFields(lastToken));
    suggestions.push(...suggestHistory(context, lastToken));
  }

  if (lastToken.includes(":")) {
    const splitIndex = lastToken.indexOf(":");
    const field = normalize(lastToken.slice(0, splitIndex));
    const valuePrefix = normalize(lastToken.slice(splitIndex + 1));

    suggestions.push(...suggestForFieldValue(field, valuePrefix, index));
  }

  if (COMPARISON_KEYS.some((field) => lastToken.startsWith(field))) {
    suggestions.push(...suggestComparisonOperators(lastToken));
  }

  if (!lastToken.includes(":")) {
    const tagSuggestions = collectTagSuggestions(index, lastToken).slice(0, 5);
    suggestions.push(...tagSuggestions);
  }

  return dedupeSuggestions(suggestions, 20);
}
