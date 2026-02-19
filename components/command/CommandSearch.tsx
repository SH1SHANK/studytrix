"use client";

import type { ReactNode } from "react";
import type { KeyboardEvent } from "react";
import { useCallback, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type Fuse from "fuse.js";
import type { FuseResultMatch } from "fuse.js";
import { IconFolder, IconSearch } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFuzzySearch } from "@/ui/hooks/useFuzzySearch";
import {
  DEFAULT_FOLDER_RESULT_LIMIT,
  FOLDER_FUSE_KEYS,
  FOLDER_QUERY_MIN_LENGTH,
  FOLDER_SCORE_CUTOFF,
  type Folder,
  type SearchableFolder,
  normalizeFolderSearchValue,
  toSearchableFolder,
} from "@/features/command/searchFolders";

interface CommandSearchProps {
  folders: Folder[];
  onSelectFolder?: (folder: Folder) => void;
  recentFolders?: Folder[];
  placeholder?: string;
  maxResults?: number;
  className?: string;
}

const RECENT_FOLDER_STORAGE_KEY = "studytrix.command.recentFolders.v1";
const MAX_RECENT_FOLDERS = 8;

function loadRecentFolderIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(RECENT_FOLDER_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, MAX_RECENT_FOLDERS);
  } catch {
    return [];
  }
}

function persistRecentFolderIds(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RECENT_FOLDER_STORAGE_KEY,
      JSON.stringify(ids.slice(0, MAX_RECENT_FOLDERS)),
    );
  } catch {
    // Ignore private-mode storage failures.
  }
}

function toMatchRanges(
  matches: ReadonlyArray<FuseResultMatch>,
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  for (const match of matches) {
    const rawKey = match.key as unknown;
    const key =
      typeof rawKey === "string"
        ? rawKey
        : Array.isArray(rawKey)
          ? rawKey.join(".")
          : "";

    if (key !== "name") {
      continue;
    }

    for (const [start, end] of match.indices) {
      ranges.push([start, end]);
    }
  }

  if (ranges.length === 0) {
    return [];
  }

  ranges.sort((left, right) => left[0] - right[0]);
  const merged: Array<[number, number]> = [ranges[0]];

  for (let index = 1; index < ranges.length; index += 1) {
    const current = ranges[index];
    const last = merged[merged.length - 1];

    if (current[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], current[1]);
      continue;
    }

    merged.push([current[0], current[1]]);
  }

  return merged;
}

function fallbackSequentialRanges(text: string, query: string): Array<[number, number]> {
  const normalizedQuery = normalizeFolderSearchValue(query);
  if (normalizedQuery.length < FOLDER_QUERY_MIN_LENGTH) {
    return [];
  }

  const lowerText = text.toLocaleLowerCase();
  const indices: number[] = [];
  let queryCursor = 0;

  for (let index = 0; index < lowerText.length; index += 1) {
    if (queryCursor >= normalizedQuery.length) {
      break;
    }

    const char = lowerText[index];
    if (char === " ") {
      continue;
    }

    if (char === normalizedQuery[queryCursor]) {
      indices.push(index);
      queryCursor += 1;
    }
  }

  if (indices.length === 0) {
    return [];
  }

  const ranges: Array<[number, number]> = [];
  let rangeStart = indices[0];
  let previous = indices[0];

  for (let index = 1; index < indices.length; index += 1) {
    const next = indices[index];
    if (next === previous + 1) {
      previous = next;
      continue;
    }

    ranges.push([rangeStart, previous]);
    rangeStart = next;
    previous = next;
  }

  ranges.push([rangeStart, previous]);
  return ranges;
}

function renderHighlightedText(
  text: string,
  ranges: Array<[number, number]>,
): ReactNode {
  if (ranges.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) {
      nodes.push(
        <span key={`plain-${cursor}`}>{text.slice(cursor, start)}</span>,
      );
    }

    nodes.push(
      <span
        key={`match-${start}`}
        className="rounded-sm bg-indigo-500/20 px-0.5 font-semibold text-stone-900 dark:text-stone-100"
      >
        {text.slice(start, end + 1)}
      </span>,
    );

    cursor = end + 1;
  }

  if (cursor < text.length) {
    nodes.push(<span key={`plain-tail-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return nodes;
}

function rankLabel(rank: "exact" | "prefix" | "fuzzy"): string {
  if (rank === "exact") {
    return "Exact";
  }

  if (rank === "prefix") {
    return "Prefix";
  }

  return "Fuzzy";
}

export function CommandSearch({
  folders,
  onSelectFolder,
  recentFolders,
  placeholder = "Search folders",
  maxResults = DEFAULT_FOLDER_RESULT_LIMIT,
  className,
}: CommandSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentFolderIds, setRecentFolderIds] = useState<string[]>(() => loadRecentFolderIds());

  const searchableFolders = useMemo<readonly SearchableFolder[]>(
    () => folders.map(toSearchableFolder),
    [folders],
  );

  const recentSearchableFolders = useMemo<readonly SearchableFolder[]>(() => {
    if (recentFolders && recentFolders.length > 0) {
      return recentFolders.map(toSearchableFolder);
    }

    const byId = new Map(searchableFolders.map((folder) => [folder.id, folder]));
    return recentFolderIds
      .map((folderId) => byId.get(folderId))
      .filter((folder): folder is SearchableFolder => Boolean(folder));
  }, [recentFolderIds, recentFolders, searchableFolders]);

  const {
    results,
    debouncedQuery,
    isEmptyQuery,
  } = useFuzzySearch<SearchableFolder>({
    items: searchableFolders,
    query,
    keys: FOLDER_FUSE_KEYS,
    getItemId: (item) => item.id,
    getSearchText: (item) => item.normalizedName,
    getRankTexts: (item) => [
      item.normalizedName,
      item.normalizedPath,
      item.consonantName,
      item.consonantPath,
    ],
    recentItems: recentSearchableFolders,
    debounceMs: 250,
    limit: maxResults,
    minMatchCharLength: FOLDER_QUERY_MIN_LENGTH,
    threshold: FOLDER_SCORE_CUTOFF,
    distance: 100,
    normalize: normalizeFolderSearchValue,
  });

  const clampedActiveIndex =
    results.length > 0 ? Math.min(activeIndex, results.length - 1) : -1;

  const pushRecentFolder = useCallback((folderId: string) => {
    setRecentFolderIds((current) => {
      const next = [folderId, ...current.filter((value) => value !== folderId)]
        .slice(0, MAX_RECENT_FOLDERS);
      persistRecentFolderIds(next);
      return next;
    });
  }, []);

  const selectFolder = useCallback((folder: Folder) => {
    pushRecentFolder(folder.id);

    if (onSelectFolder) {
      onSelectFolder(folder);
      return;
    }

    router.push(folder.path);
  }, [onSelectFolder, pushRecentFolder, router]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const active = results[clampedActiveIndex];
      if (active) {
        selectFolder(active.item);
      }
    }
  }, [clampedActiveIndex, results, selectFolder]);

  const activeDescendant =
    clampedActiveIndex >= 0
      ? `${listboxId}-option-${clampedActiveIndex}`
      : undefined;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Search folders
      </label>

      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
        <Input
          id={`${listboxId}-input`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 pl-9 text-sm"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
        />
      </div>

      {isEmptyQuery ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">Recent folders</p>
      ) : null}

      <ul
        id={listboxId}
        role="listbox"
        className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-stone-200/70 p-1 dark:border-stone-700/70"
      >
        {results.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-stone-500 dark:text-stone-400">
            {isEmptyQuery ? "No recent folders" : "No matches found"}
          </li>
        ) : (
          results.map((result, index) => {
            const matchRanges = toMatchRanges(result.matches);
            const fallbackRanges =
              matchRanges.length > 0
                ? matchRanges
                : fallbackSequentialRanges(result.item.name, debouncedQuery);
            const isActive = index === clampedActiveIndex;

            return (
              <li key={result.item.id} role="presentation">
                <button
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectFolder(result.item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-indigo-50 text-stone-900 dark:bg-indigo-500/20 dark:text-stone-50"
                      : "hover:bg-stone-100/80 dark:hover:bg-stone-800/80",
                  )}
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
                    <IconFolder className="size-4 text-indigo-600 dark:text-indigo-300" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {renderHighlightedText(result.item.name, fallbackRanges)}
                    </span>
                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                      {result.item.path}
                    </span>
                  </span>

                  <Badge
                    variant="outline"
                    className="shrink-0 border-stone-300/80 text-[0.625rem] text-stone-600 dark:border-stone-600 dark:text-stone-300"
                  >
                    {rankLabel(result.rank)}
                  </Badge>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
