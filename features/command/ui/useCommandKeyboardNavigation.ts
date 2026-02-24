"use client";

import { useCallback, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";

import type { PrefixMode } from "@/features/command/command.prefix";
import type {
  CommandGroup as EngineCommandGroup,
  CommandItem as EngineCommandItem,
} from "@/features/command/command.types";
import {
  isScopeEmpty,
  toScopeSelectorMode,
  type ScopeHistoryEntry,
  type ScopeSelectorMode,
  type SearchScope,
} from "@/features/command/ui/command-bar.helpers";

type FolderScope = { folderId: string; label: string } | null;

type UseCommandKeyboardNavigationParams = {
  displayResults: EngineCommandItem[];
  groupedResults: Array<{ group: EngineCommandGroup; items: EngineCommandItem[] }>;
  query: string;
  scopeSelectorMode: ScopeSelectorMode | null;
  stickyPrefixMode: PrefixMode | null;
  scopeHistoryCursor: number;
  scopeHistory: ScopeHistoryEntry[];
  activeIndex: number;
  searchScope: SearchScope;
  effectiveFolderScope: FolderScope;
  setScopeSelectorMode: Dispatch<SetStateAction<ScopeSelectorMode | null>>;
  setStickyPrefixMode: Dispatch<SetStateAction<PrefixMode | null>>;
  setScopeHistoryCursor: Dispatch<SetStateAction<number>>;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  setQuery: Dispatch<SetStateAction<string>>;
  clearStickyPrefixMode: () => void;
  removeLastScopePill: () => void;
  applyScope: (scope: SearchScope) => void;
  handleItemSelect: (item: EngineCommandItem) => void;
};

export function useCommandKeyboardNavigation({
  displayResults,
  groupedResults,
  query,
  scopeSelectorMode,
  stickyPrefixMode,
  scopeHistoryCursor,
  scopeHistory,
  activeIndex,
  searchScope,
  effectiveFolderScope,
  setScopeSelectorMode,
  setStickyPrefixMode,
  setScopeHistoryCursor,
  setActiveIndex,
  setQuery,
  clearStickyPrefixMode,
  removeLastScopePill,
  applyScope,
  handleItemSelect,
}: UseCommandKeyboardNavigationParams) {
  return useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const flatItems = displayResults;
    const totalItems = flatItems.length;

    if (event.key === "Backspace" && query.trim().length === 0) {
      if (scopeSelectorMode) {
        event.preventDefault();
        setScopeSelectorMode(null);
        if (stickyPrefixMode && toScopeSelectorMode(stickyPrefixMode) === scopeSelectorMode) {
          setStickyPrefixMode(null);
        }
        setScopeHistoryCursor(-1);
        return;
      }

      if (stickyPrefixMode) {
        event.preventDefault();
        clearStickyPrefixMode();
        setScopeHistoryCursor(-1);
        return;
      }

      if (!isScopeEmpty(searchScope) || effectiveFolderScope !== null) {
        event.preventDefault();
        removeLastScopePill();
        return;
      }
    }

    if (event.key === "ArrowUp" && query.trim().length === 0 && scopeSelectorMode === null && activeIndex === 0 && scopeHistory.length > 0) {
      event.preventDefault();
      const nextCursor = Math.min(scopeHistoryCursor + 1, scopeHistory.length - 1);
      const entry = scopeHistory[nextCursor];
      if (entry) {
        setScopeHistoryCursor(nextCursor);
        applyScope(entry.scope);
        setQuery(entry.query);
        setScopeSelectorMode(null);
      }
      return;
    }

    if (totalItems === 0) {
      return;
    }

    if (event.ctrlKey && event.key === "n") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
      return;
    }
    if (event.ctrlKey && event.key === "p") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      let currentGroupStart = 0;
      const groupStarts: number[] = [];
      for (const group of groupedResults) {
        groupStarts.push(currentGroupStart);
        currentGroupStart += group.items.length;
      }
      const currentGroupIndex = groupStarts.findIndex((start, index) => {
        const end = index < groupStarts.length - 1 ? groupStarts[index + 1] : totalItems;
        return activeIndex >= start && activeIndex < end;
      });

      if (event.key === "ArrowDown" && currentGroupIndex < groupStarts.length - 1) {
        setActiveIndex(groupStarts[currentGroupIndex + 1]);
      } else if (event.key === "ArrowUp" && currentGroupIndex > 0) {
        setActiveIndex(groupStarts[currentGroupIndex - 1]);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      if (scopeHistoryCursor >= 0) {
        setScopeHistoryCursor(-1);
      }
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && activeIndex < totalItems) {
      event.preventDefault();
      handleItemSelect(flatItems[activeIndex]);
    }
  }, [
    activeIndex,
    applyScope,
    clearStickyPrefixMode,
    displayResults,
    effectiveFolderScope,
    groupedResults,
    handleItemSelect,
    query,
    removeLastScopePill,
    scopeHistory,
    scopeHistoryCursor,
    scopeSelectorMode,
    searchScope,
    setActiveIndex,
    setQuery,
    setScopeHistoryCursor,
    setScopeSelectorMode,
    setStickyPrefixMode,
    stickyPrefixMode,
  ]);
}
