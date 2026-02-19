import { useCallback, useMemo } from "react";

import { useTagStore } from "@/features/tags/tag.store";
import type { FilterMode } from "@/features/tags/tag.types";

interface UseTagFiltersResult {
  activeFilters: string[];
  filterMode: FilterMode;
  hasActiveFilters: boolean;
  toggleTagFilter: (tagId: string) => void;
  clearAllFilters: () => void;
  setMode: (mode: FilterMode) => void;
}

export function useTagFilters(): UseTagFiltersResult {
  const { activeFilters, filterMode, toggleFilter, clearFilters, setFilterMode } = useTagStore(
    (state) => ({
      activeFilters: state.activeFilters,
      filterMode: state.filterMode,
      toggleFilter: state.toggleFilter,
      clearFilters: state.clearFilters,
      setFilterMode: state.setFilterMode,
    }),
  );

  const toggleTagFilter = useCallback(
    (tagId: string) => {
      toggleFilter(tagId);
    },
    [toggleFilter],
  );

  const clearAllFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const setMode = useCallback(
    (mode: FilterMode) => {
      setFilterMode(mode);
    },
    [setFilterMode],
  );

  return useMemo(
    () => ({
      activeFilters,
      filterMode,
      hasActiveFilters: activeFilters.length > 0,
      toggleTagFilter,
      clearAllFilters,
      setMode,
    }),
    [activeFilters, clearAllFilters, filterMode, setMode, toggleTagFilter],
  );
}
