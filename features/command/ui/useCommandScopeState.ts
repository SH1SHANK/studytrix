"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import {
  normalizeStickyPrefixInput,
  type PrefixMode,
} from "@/features/command/command.prefix";
import type { SearchScope as NavigationSearchScope } from "@/features/intelligence/intelligence.types";
import {
  cloneScope,
  CMD_QUERY_PARAM,
  CMD_SCOPE_PARAM,
  CMD_TEXT_PARAM,
  GLOBAL_SCOPE,
  hasSeenScopeHint,
  isScopeEmpty,
  loadPersistedScope,
  loadScopeHistory,
  markScopeHintSeen,
  MAX_SCOPE_HISTORY,
  persistScope,
  persistScopeHistory,
  PLACEHOLDER_CONTROL_RESERVE_PX,
  resolveScopedPlaceholder,
  serializeScope,
  type ScopeHistoryEntry,
  type ScopeSelectorMode,
  type SearchScope,
  toScopeSelectorMode,
  truncateFolderNameForPlaceholder,
} from "@/features/command/ui/command-bar.helpers";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

type UseCommandScopeStateParams = {
  navigationScope: NavigationSearchScope;
  activeRepositoryPage: "global" | "personal";
  query: string;
  open: boolean;
  pathname: string;
  searchParams: SearchParamsLike;
  setQuery: Dispatch<SetStateAction<string>>;
  placeholderContainerRef: RefObject<HTMLDivElement | null>;
  placeholderMeasureRef: RefObject<HTMLSpanElement | null>;
  onReplaceUrl: (nextUrl: string) => void;
};

type UseCommandScopeStateResult = {
  activeNavigationScope: NavigationSearchScope;
  setActiveNavigationScope: Dispatch<SetStateAction<NavigationSearchScope>>;
  searchScope: SearchScope;
  scopeSelectorMode: ScopeSelectorMode | null;
  setScopeSelectorMode: Dispatch<SetStateAction<ScopeSelectorMode | null>>;
  stickyPrefixMode: PrefixMode | null;
  setStickyPrefixMode: Dispatch<SetStateAction<PrefixMode | null>>;
  scopeHistory: ScopeHistoryEntry[];
  scopeHistoryCursor: number;
  setScopeHistoryCursor: Dispatch<SetStateAction<number>>;
  scopedPlaceholder: string;
  applyScope: (scope: SearchScope) => void;
  clearStickyPrefixMode: () => void;
  activatePrefixMode: (mode: PrefixMode) => void;
  handleClearSearchAndScope: () => void;
  handleQueryChange: (nextValue: string) => void;
  pushScopeHistory: (value: string, scope: SearchScope) => void;
};

export function useCommandScopeState({
  navigationScope,
  activeRepositoryPage,
  query,
  open,
  pathname,
  searchParams,
  setQuery,
  placeholderContainerRef,
  placeholderMeasureRef,
  onReplaceUrl,
}: UseCommandScopeStateParams): UseCommandScopeStateResult {
  const [activeNavigationScope, setActiveNavigationScope] =
    useState<NavigationSearchScope>(navigationScope);
  const [searchScope, setSearchScope] = useState<SearchScope>(GLOBAL_SCOPE);
  const [scopeSelectorMode, setScopeSelectorMode] = useState<ScopeSelectorMode | null>(null);
  const [stickyPrefixMode, setStickyPrefixMode] = useState<PrefixMode | null>(null);
  const [scopeHistory, setScopeHistory] = useState<ScopeHistoryEntry[]>([]);
  const [scopeHistoryCursor, setScopeHistoryCursor] = useState(-1);
  const [isScopeHintSeen, setIsScopeHintSeen] = useState(true);
  const [scopedPlaceholder, setScopedPlaceholder] = useState(() =>
    resolveScopedPlaceholder(navigationScope),
  );

  const lastRepositoryRef = useRef(activeRepositoryPage);
  const urlSyncRef = useRef("");

  useEffect(() => {
    setSearchScope({
      ...loadPersistedScope(),
      folder: null,
    });
    setScopeHistory(loadScopeHistory());
    setIsScopeHintSeen(hasSeenScopeHint());
  }, []);

  useEffect(() => {
    setActiveNavigationScope(navigationScope);
    setSearchScope((previous) => {
      if (previous.folder === null) {
        return previous;
      }
      const next = { ...previous, folder: null };
      persistScope(next);
      return next;
    });
  }, [navigationScope]);

  useLayoutEffect(() => {
    const updatePlaceholder = () => {
      const base = resolveScopedPlaceholder(activeNavigationScope);
      if (activeNavigationScope.kind !== "folder") {
        setScopedPlaceholder(base);
        return;
      }

      const containerWidth = placeholderContainerRef.current?.clientWidth ?? 0;
      const availableWidth = Math.max(0, containerWidth - PLACEHOLDER_CONTROL_RESERVE_PX);
      const measureNode = placeholderMeasureRef.current;

      if (!measureNode || availableWidth <= 0) {
        setScopedPlaceholder(
          `Search in ${truncateFolderNameForPlaceholder(activeNavigationScope.folderName)}`,
        );
        return;
      }

      measureNode.textContent = base;
      const measuredWidth = measureNode.getBoundingClientRect().width;
      if (measuredWidth <= availableWidth) {
        setScopedPlaceholder(base);
        return;
      }

      setScopedPlaceholder(
        `Search in ${truncateFolderNameForPlaceholder(activeNavigationScope.folderName)}`,
      );
    };

    updatePlaceholder();
    const node = placeholderContainerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updatePlaceholder();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [activeNavigationScope, placeholderContainerRef, placeholderMeasureRef]);

  const markScopeUsage = useCallback(() => {
    if (isScopeHintSeen) {
      return;
    }

    setIsScopeHintSeen(true);
    markScopeHintSeen();
  }, [isScopeHintSeen]);

  const applyScope = useCallback((scope: SearchScope) => {
    const nextScope = cloneScope(scope);
    setSearchScope(nextScope);
    persistScope(nextScope);
    setScopeHistoryCursor(-1);
    if (!isScopeEmpty(nextScope)) {
      markScopeUsage();
    }
  }, [markScopeUsage]);

  useEffect(() => {
    if (lastRepositoryRef.current === activeRepositoryPage) {
      return;
    }

    lastRepositoryRef.current = activeRepositoryPage;
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
    setScopeHistoryCursor(-1);
    setQuery("");
    applyScope(GLOBAL_SCOPE);
  }, [activeRepositoryPage, applyScope, setQuery]);

  useEffect(() => {
    if (activeRepositoryPage !== "personal") {
      return;
    }

    if (!searchScope.domain) {
      return;
    }

    applyScope({
      ...searchScope,
      domain: null,
    });
  }, [activeRepositoryPage, applyScope, searchScope]);

  const clearStickyPrefixMode = useCallback(() => {
    if (stickyPrefixMode === "actions" || stickyPrefixMode === "recents") {
      applyScope({ ...searchScope, mode: "global" });
    }
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
  }, [applyScope, searchScope, stickyPrefixMode]);

  const activatePrefixMode = useCallback((mode: PrefixMode) => {
    setStickyPrefixMode(mode);
    setScopeHistoryCursor(-1);
    setQuery("");
    markScopeUsage();

    const selectorMode = toScopeSelectorMode(mode);
    setScopeSelectorMode(selectorMode);

    if (mode === "actions") {
      applyScope({ ...searchScope, mode: "actions" });
      return;
    }

    if (mode === "recents") {
      applyScope({ ...searchScope, mode: "recents" });
      return;
    }

    if (searchScope.mode !== "global") {
      applyScope({ ...searchScope, mode: "global" });
    }
  }, [applyScope, markScopeUsage, searchScope, setQuery]);

  const handleClearSearchAndScope = useCallback(() => {
    setQuery("");
    setScopeHistoryCursor(-1);
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
    applyScope(GLOBAL_SCOPE);
  }, [applyScope, setQuery]);

  const handleQueryChange = useCallback((nextValue: string) => {
    setScopeHistoryCursor(-1);
    const normalized = normalizeStickyPrefixInput(nextValue, stickyPrefixMode);
    const nextStickyMode = normalized.mode;
    if (nextStickyMode) {
      if (nextStickyMode !== stickyPrefixMode) {
        markScopeUsage();
      }
      setStickyPrefixMode(nextStickyMode);
      setScopeSelectorMode(toScopeSelectorMode(nextStickyMode));

      if (nextStickyMode === "actions") {
        if (searchScope.mode !== "actions") {
          applyScope({
            ...searchScope,
            mode: "actions",
          });
        }
      } else if (nextStickyMode === "recents") {
        if (searchScope.mode !== "recents") {
          applyScope({
            ...searchScope,
            mode: "recents",
          });
        }
      } else if (searchScope.mode !== "global") {
        applyScope({
          ...searchScope,
          mode: "global",
        });
      }

      setQuery(normalized.query);
      return;
    }

    setScopeSelectorMode(null);
    if (stickyPrefixMode) {
      setStickyPrefixMode(null);
      if (searchScope.mode !== "global") {
        applyScope({
          ...searchScope,
          mode: "global",
        });
      }
    }

    setQuery(normalized.query);
  }, [applyScope, markScopeUsage, searchScope, setQuery, stickyPrefixMode]);

  const pushScopeHistory = useCallback((value: string, scope: SearchScope) => {
    const normalizedQuery = value.trim();
    if (!normalizedQuery && isScopeEmpty(scope)) {
      return;
    }

    const nextEntry: ScopeHistoryEntry = {
      query: normalizedQuery,
      scope: cloneScope(scope),
      createdAt: Date.now(),
    };

    setScopeHistory((current) => {
      const deduped = current.filter((entry) =>
        !(entry.query === nextEntry.query && JSON.stringify(entry.scope) === JSON.stringify(nextEntry.scope)));
      const next = [nextEntry, ...deduped].slice(0, MAX_SCOPE_HISTORY);
      persistScopeHistory(next);
      return next;
    });
    setScopeHistoryCursor(-1);
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (open) {
      nextParams.set(CMD_QUERY_PARAM, "open");
      nextParams.set(CMD_TEXT_PARAM, query);
      const serialized = serializeScope(searchScope);
      if (serialized) {
        nextParams.set(CMD_SCOPE_PARAM, serialized);
      } else {
        nextParams.delete(CMD_SCOPE_PARAM);
      }
    } else {
      nextParams.delete(CMD_QUERY_PARAM);
      nextParams.delete(CMD_SCOPE_PARAM);
      nextParams.delete(CMD_TEXT_PARAM);
    }

    const qs = nextParams.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    if (urlSyncRef.current === nextUrl) {
      return;
    }
    urlSyncRef.current = nextUrl;
    onReplaceUrl(nextUrl);
  }, [onReplaceUrl, open, pathname, query, searchParams, searchScope]);

  return {
    activeNavigationScope,
    setActiveNavigationScope,
    searchScope,
    scopeSelectorMode,
    setScopeSelectorMode,
    stickyPrefixMode,
    setStickyPrefixMode,
    scopeHistory,
    scopeHistoryCursor,
    setScopeHistoryCursor,
    scopedPlaceholder,
    applyScope,
    clearStickyPrefixMode,
    activatePrefixMode,
    handleClearSearchAndScope,
    handleQueryChange,
    pushScopeHistory,
  };
}
