import type { PrefixMode } from "./command.prefix";

export type EssentialScopeAction = "folder" | "tag" | "actions" | "clear";
export type ScopeSelectorMode = "folders" | "tags" | "domains" | null;
export type SearchMode = "global" | "actions" | "recents";

export type EssentialScopeUiState = {
  prefixMode: PrefixMode | null;
  scopeSelectorMode: ScopeSelectorMode;
  searchMode: SearchMode;
};

export type EssentialScopeTransition = {
  prefixMode: PrefixMode | null;
  scopeSelectorMode: ScopeSelectorMode;
  searchMode: SearchMode;
  clearQuery: boolean;
  clearScope: boolean;
};

export function shouldShowEssentialScopeBar(query: string): boolean {
  return query.trim().length === 0;
}

export function isEssentialActionActive(
  action: EssentialScopeAction,
  state: EssentialScopeUiState,
): boolean {
  if (action === "folder") {
    return state.scopeSelectorMode === "folders" || state.prefixMode === "folders";
  }

  if (action === "tag") {
    return state.scopeSelectorMode === "tags" || state.prefixMode === "tags";
  }

  if (action === "actions") {
    return state.searchMode === "actions" || state.prefixMode === "actions";
  }

  return false;
}

export function resolveEssentialScopeTransition(
  action: EssentialScopeAction,
): EssentialScopeTransition {
  if (action === "folder") {
    return {
      prefixMode: "folders",
      scopeSelectorMode: "folders",
      searchMode: "global",
      clearQuery: true,
      clearScope: false,
    };
  }

  if (action === "tag") {
    return {
      prefixMode: "tags",
      scopeSelectorMode: "tags",
      searchMode: "global",
      clearQuery: true,
      clearScope: false,
    };
  }

  if (action === "actions") {
    return {
      prefixMode: "actions",
      scopeSelectorMode: null,
      searchMode: "actions",
      clearQuery: true,
      clearScope: false,
    };
  }

  return {
    prefixMode: null,
    scopeSelectorMode: null,
    searchMode: "global",
    clearQuery: true,
    clearScope: true,
  };
}
