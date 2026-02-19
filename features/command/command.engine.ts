import { normalizeContext, type CommandContext } from "./command.context";
import { evaluate, type EvaluateOptions } from "./command.evaluator";
import { suggest, type Suggestion } from "./command.autocomplete";
import { parseQuery } from "./command.parser";
import { createCommandRegistry, SYSTEM_COMMANDS, type StructuredCommand } from "./command.registry";
import type { SearchEntry } from "./command.index";
import type { QueryAST } from "./command.types";

const MAX_HISTORY = 20;
const DEFAULT_LIMIT = 50;

function createEmptyAst(): QueryAST {
  return {
    keywords: [],
    fieldFilters: [],
    comparisons: [],
    booleanFilters: [],
  };
}

function normalizeInput(value: string): string {
  return value.trim();
}

function dedupeSuggestions(items: Suggestion[], limit: number): Suggestion[] {
  const next: Suggestion[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.type}:${item.value.toLocaleLowerCase()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(item);

    if (next.length >= limit) {
      break;
    }
  }

  return next;
}

export class CommandEngine {
  private index: SearchEntry[];

  private context: CommandContext;

  private history: string[] = [];

  private registry: Map<string, StructuredCommand>;

  private lastAst: QueryAST = createEmptyAst();

  private lastParseErrors: string[] = [];

  constructor(
    index: SearchEntry[],
    context: CommandContext,
    commands: StructuredCommand[] = SYSTEM_COMMANDS,
  ) {
    this.index = [...index];
    this.context = normalizeContext(context);
    this.registry = createCommandRegistry(commands);
  }

  updateIndex(newIndex: SearchEntry[]): void {
    this.index = [...newIndex];
  }

  updateContext(newContext: CommandContext): void {
    this.context = normalizeContext(newContext);
  }

  getContext(): CommandContext {
    return { ...this.context };
  }

  getLastAst(): QueryAST {
    return this.lastAst;
  }

  getLastParseErrors(): string[] {
    return [...this.lastParseErrors];
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    this.context.recentFilters = [];
  }

  executeCommand(commandId: string, payload?: unknown): void {
    const command = this.registry.get(commandId);
    if (!command) {
      return;
    }

    command.execute(this.context, payload);
  }

  search(
    input: string,
    options: EvaluateOptions = {},
  ): { results: SearchEntry[]; suggestions: Suggestion[] } {
    const normalizedInput = normalizeInput(input);
    const parsed = parseQuery(normalizedInput);

    this.lastAst = parsed.ast;
    this.lastParseErrors = parsed.errors;

    const evaluateOptions: EvaluateOptions = {
      limit:
        typeof options.limit === "number" && options.limit > 0
          ? options.limit
          : DEFAULT_LIMIT,
    };

    const results = evaluate(this.index, parsed.ast, this.context, evaluateOptions);

    const autocompleteSuggestions = suggest(normalizedInput, this.context, this.index);
    const historySuggestions = this.history
      .filter((item) => item.toLocaleLowerCase().includes(normalizedInput.toLocaleLowerCase()))
      .map((item) => ({
        value: item,
        label: `Recent ${item}`,
        type: "history" as const,
      }));

    const suggestions = dedupeSuggestions(
      [...autocompleteSuggestions, ...historySuggestions],
      20,
    );

    if (normalizedInput) {
      this.recordHistory(normalizedInput);
    }

    return {
      results,
      suggestions,
    };
  }

  private recordHistory(input: string): void {
    const normalized = normalizeInput(input);
    if (!normalized) {
      return;
    }

    const nextHistory = [normalized, ...this.history.filter((item) => item !== normalized)];
    this.history = nextHistory.slice(0, MAX_HISTORY);
    this.context.recentFilters = [...this.history];
  }
}
