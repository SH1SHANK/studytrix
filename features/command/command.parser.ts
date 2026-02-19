import type {
  BooleanFilter,
  BooleanFlagKey,
  ComparisonFilter,
  ComparisonKey,
  FieldFilter,
  FieldFilterKey,
  ParseResult,
  QueryAST,
  QueryToken,
} from "./command.types";

const FIELD_FILTER_KEYS = new Set<FieldFilterKey>([
  "tag",
  "type",
  "course",
  "ext",
  "mime",
]);

const BOOLEAN_FILTER_KEYS = new Set<BooleanFlagKey>(["starred", "offline"]);

const COMPARISON_KEYS = new Set<ComparisonKey>(["size", "modified", "created"]);

const OPERATOR_PATTERN = /^(>=|<=|>|<|=)$/;

interface TokenizeResult {
  tokens: QueryToken[];
  errors: string[];
}

function createEmptyAst(): QueryAST {
  return {
    keywords: [],
    fieldFilters: [],
    comparisons: [],
    booleanFilters: [],
  };
}

function normalizeWord(word: string): string {
  return word.trim().toLocaleLowerCase();
}

function tokenizeWord(input: string, start: number): QueryToken {
  let end = start;

  while (end < input.length) {
    const char = input[end];

    if (
      char === " " ||
      char === "\t" ||
      char === "\n" ||
      char === "\r" ||
      char === ":" ||
      char === "|" ||
      char === ">" ||
      char === "<" ||
      char === "="
    ) {
      break;
    }

    end += 1;
  }

  return {
    type: "WORD",
    value: input.slice(start, end),
    start,
    end,
  };
}

function tokenizeQuoted(input: string, start: number): { token: QueryToken; error?: string } {
  const quote = input[start];
  let end = start + 1;

  while (end < input.length && input[end] !== quote) {
    end += 1;
  }

  if (end >= input.length) {
    return {
      token: {
        type: "WORD",
        value: input.slice(start + 1),
        start,
        end: input.length,
      },
      error: `Unterminated quoted value at position ${start}`,
    };
  }

  return {
    token: {
      type: "WORD",
      value: input.slice(start + 1, end),
      start,
      end: end + 1,
    },
  };
}

function tokenizeOperator(input: string, start: number): QueryToken {
  const current = input[start];
  const next = input[start + 1];

  if ((current === ">" || current === "<") && next === "=") {
    return {
      type: "OPERATOR",
      value: `${current}${next}`,
      start,
      end: start + 2,
    };
  }

  return {
    type: "OPERATOR",
    value: current,
    start,
    end: start + 1,
  };
}

export function tokenizeQuery(input: string): TokenizeResult {
  const tokens: QueryToken[] = [];
  const errors: string[] = [];

  let cursor = 0;

  while (cursor < input.length) {
    const char = input[cursor];

    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      cursor += 1;
      continue;
    }

    if (char === "|") {
      tokens.push({
        type: "OR",
        value: "|",
        start: cursor,
        end: cursor + 1,
      });
      cursor += 1;
      continue;
    }

    if (char === ":") {
      tokens.push({
        type: "COLON",
        value: ":",
        start: cursor,
        end: cursor + 1,
      });
      cursor += 1;
      continue;
    }

    if (char === ">" || char === "<" || char === "=") {
      const token = tokenizeOperator(input, cursor);

      if (!OPERATOR_PATTERN.test(token.value)) {
        errors.push(`Invalid operator '${token.value}' at position ${cursor}`);
      }

      tokens.push(token);
      cursor = token.end;
      continue;
    }

    if (char === '"' || char === "'") {
      const quoted = tokenizeQuoted(input, cursor);
      tokens.push(quoted.token);
      if (quoted.error) {
        errors.push(quoted.error);
      }
      cursor = quoted.token.end;
      continue;
    }

    const token = tokenizeWord(input, cursor);
    if (!token.value) {
      cursor += 1;
      continue;
    }

    tokens.push(token);
    cursor = token.end;
  }

  return { tokens, errors };
}

function isFieldFilterKey(value: string): value is FieldFilterKey {
  return FIELD_FILTER_KEYS.has(value as FieldFilterKey);
}

function isBooleanFilterKey(value: string): value is BooleanFlagKey {
  return BOOLEAN_FILTER_KEYS.has(value as BooleanFlagKey);
}

function isComparisonKey(value: string): value is ComparisonKey {
  return COMPARISON_KEYS.has(value as ComparisonKey);
}

function parseBooleanValue(value: string): boolean | null {
  const normalized = normalizeWord(value);
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

function pushFieldFilter(
  fieldMap: Map<FieldFilterKey, Set<string>>,
  field: FieldFilterKey,
  value: string,
): void {
  const normalizedValue = normalizeWord(value);
  if (!normalizedValue) {
    return;
  }

  const existing = fieldMap.get(field);
  if (existing) {
    existing.add(normalizedValue);
    return;
  }

  fieldMap.set(field, new Set([normalizedValue]));
}

function buildFieldFilters(fieldMap: Map<FieldFilterKey, Set<string>>): FieldFilter[] {
  const filters: FieldFilter[] = [];

  for (const [field, values] of fieldMap) {
    filters.push({
      field,
      values: Array.from(values),
    });
  }

  return filters;
}

function parseExpressionTokens(tokens: QueryToken[], errors: string[]): QueryAST {
  const ast = createEmptyAst();
  const fieldMap = new Map<FieldFilterKey, Set<string>>();
  const comparisons: ComparisonFilter[] = [];
  const booleanFilters: BooleanFilter[] = [];
  const keywords: string[] = [];

  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (!token) {
      break;
    }

    if (token.type !== "WORD") {
      errors.push(`Unexpected token '${token.value}' at position ${token.start}`);
      index += 1;
      continue;
    }

    const keyOrKeyword = normalizeWord(token.value);
    const nextToken = tokens[index + 1];

    if (nextToken?.type === "COLON") {
      const valueToken = tokens[index + 2];

      if (!valueToken || valueToken.type !== "WORD") {
        errors.push(`Missing value after '${token.value}:' at position ${token.start}`);
        index += 2;
        continue;
      }

      if (isBooleanFilterKey(keyOrKeyword)) {
        const parsed = parseBooleanValue(valueToken.value);
        if (parsed === null) {
          errors.push(
            `Invalid boolean value '${valueToken.value}' for '${keyOrKeyword}' at position ${valueToken.start}`,
          );
        } else {
          booleanFilters.push({
            field: keyOrKeyword,
            value: parsed,
          });
        }
        index += 3;
        continue;
      }

      if (isFieldFilterKey(keyOrKeyword)) {
        pushFieldFilter(fieldMap, keyOrKeyword, valueToken.value);
        index += 3;
        continue;
      }

      errors.push(`Unknown field '${token.value}' at position ${token.start}`);
      keywords.push(`${keyOrKeyword}:${normalizeWord(valueToken.value)}`);
      index += 3;
      continue;
    }

    if (nextToken?.type === "OPERATOR") {
      const valueToken = tokens[index + 2];

      if (!valueToken || valueToken.type !== "WORD") {
        errors.push(`Missing comparison value after '${token.value}${nextToken.value}'`);
        index += 2;
        continue;
      }

      if (!isComparisonKey(keyOrKeyword)) {
        errors.push(`Unknown comparison field '${token.value}' at position ${token.start}`);
        keywords.push(`${keyOrKeyword}${nextToken.value}${normalizeWord(valueToken.value)}`);
        index += 3;
        continue;
      }

      const numericValue = Number(valueToken.value);
      if (!Number.isFinite(numericValue)) {
        errors.push(
          `Invalid comparison value '${valueToken.value}' for '${token.value}' at position ${valueToken.start}`,
        );
        index += 3;
        continue;
      }

      comparisons.push({
        field: keyOrKeyword,
        operator: nextToken.value as ComparisonFilter["operator"],
        value: numericValue,
      });

      index += 3;
      continue;
    }

    if (keyOrKeyword) {
      keywords.push(keyOrKeyword);
    }

    index += 1;
  }

  ast.keywords = Array.from(new Set(keywords));
  ast.fieldFilters = buildFieldFilters(fieldMap);
  ast.comparisons = comparisons;
  ast.booleanFilters = booleanFilters;

  return ast;
}

function splitByOr(tokens: QueryToken[]): QueryToken[][] {
  const groups: QueryToken[][] = [];
  let current: QueryToken[] = [];

  for (const token of tokens) {
    if (token.type === "OR") {
      groups.push(current);
      current = [];
      continue;
    }

    current.push(token);
  }

  groups.push(current);

  return groups.filter((group) => group.length > 0);
}

export function parseQuery(input: string): ParseResult {
  const { tokens, errors } = tokenizeQuery(input);

  if (tokens.length === 0) {
    return {
      ast: createEmptyAst(),
      errors,
    };
  }

  const groups = splitByOr(tokens);
  const astGroups = groups.map((group) => parseExpressionTokens(group, errors));

  if (astGroups.length === 0) {
    return {
      ast: createEmptyAst(),
      errors,
    };
  }

  const [firstAst, ...orGroups] = astGroups;

  if (orGroups.length > 0 && firstAst) {
    firstAst.orGroups = orGroups;
  }

  return {
    ast: firstAst ?? createEmptyAst(),
    errors,
  };
}
