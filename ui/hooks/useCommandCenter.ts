import { useCallback, useDeferredValue, useMemo, startTransition, useState } from "react";

import { normalizeContext, type CommandContext } from "@/features/command/command.context";
import { CommandEngine } from "@/features/command/command.engine";
import type { SearchEntry } from "@/features/command/command.index";
import { explainScore, type ScoreDetail } from "@/features/command/command.scoring";
import { SYSTEM_COMMANDS, type StructuredCommand } from "@/features/command/command.registry";
import type { Suggestion } from "@/features/command/command.autocomplete";

interface UseCommandCenterOptions {
  context: Partial<CommandContext>;
  index: SearchEntry[];
  commands?: StructuredCommand[];
  /** @deprecated No longer used — kept for API compat. */
  debounceMs?: number;
  limit?: number;
}

interface UseCommandCenterResult {
  input: string;
  setInput: (value: string) => void;
  results: SearchEntry[];
  suggestions: Suggestion[];
  executeCommand: (commandId: string, payload?: unknown) => void;
  scoreExplanation: (entry: SearchEntry) => ScoreDetail[];
  clearHistory: () => void;
}

export function useCommandCenter({
  context,
  index,
  commands = SYSTEM_COMMANDS,
  debounceMs = 40,
  limit = 50,
}: UseCommandCenterOptions): UseCommandCenterResult {
  const [input, setInputState] = useState("");
  const debouncedInput = useDeferredValue(input);

  const normalizedContext = useMemo(() => normalizeContext(context), [context]);
  const engine = useMemo(
    () => new CommandEngine([], normalizeContext({}), commands),
    [commands],
  );

  const searchResult = useMemo(() => {
    engine.updateIndex(index);
    engine.updateContext(normalizedContext);
    return engine.search(debouncedInput, { limit });
  }, [debouncedInput, engine, index, limit, normalizedContext]);

  const [results, setResults] = useState<SearchEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Sync search results via startTransition so input never blocks
  useMemo(() => {
    startTransition(() => {
      setResults(searchResult.results);
      setSuggestions(searchResult.suggestions);
    });
  }, [searchResult]);

  const setInput = useCallback((value: string) => {
    setInputState(value);
  }, []);

  const executeCommand = useCallback((commandId: string, payload?: unknown) => {
    engine.executeCommand(commandId, payload);
  }, [engine]);

  const scoreExplanation = useCallback((entry: SearchEntry): ScoreDetail[] => {
    return explainScore(entry, engine.getLastAst(), engine.getContext());
  }, [engine]);

  const clearHistory = useCallback(() => {
    engine.clearHistory();
  }, [engine]);

  return useMemo(
    () => ({
      input,
      setInput,
      results,
      suggestions,
      executeCommand,
      scoreExplanation,
      clearHistory,
    }),
    [clearHistory, executeCommand, input, results, scoreExplanation, setInput, suggestions],
  );
}
