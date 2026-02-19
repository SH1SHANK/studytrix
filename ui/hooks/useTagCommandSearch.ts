import { useCallback, useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { buildTagCommandIndex, searchTagCommandItems } from "@/features/tags/tag.commandIntegration";
import { TagIndexedSearch } from "@/features/tags/tag.indexedSearch";
import { useTagStore } from "@/features/tags/tag.store";
import type { CommandItem } from "@/features/command/command.types";
import type { Tag } from "@/features/tags/tag.types";

interface UseTagCommandSearchResult {
  search: (query: string) => CommandItem[];
  reindex: () => void;
}

function dedupeById(items: CommandItem[]): CommandItem[] {
  const seen = new Set<string>();
  const deduped: CommandItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

function findFilterCommandsForTags(tags: readonly Tag[], commands: readonly CommandItem[]): CommandItem[] {
  const commandById = new Map(commands.map((command) => [command.id, command]));
  const items: CommandItem[] = [];

  for (const tag of tags) {
    const filterItem = commandById.get(`tag-filter:${tag.id}`);
    if (filterItem) {
      items.push(filterItem);
    }
  }

  return items;
}

export function useTagCommandSearch(): UseTagCommandSearchResult {
  const { tags, assignments } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
    })),
  );

  const searchIndexRef = useRef<TagIndexedSearch>(new TagIndexedSearch());

  const commandIndex = useMemo(
    () => buildTagCommandIndex(tags, Object.values(assignments)),
    [assignments, tags],
  );

  useEffect(() => {
    searchIndexRef.current.setTags(tags);
  }, [tags]);

  const reindex = useCallback(() => {
    searchIndexRef.current.setTags(tags);
  }, [tags]);

  const search = useCallback(
    (query: string): CommandItem[] => {
      const commandMatches = searchTagCommandItems(query, commandIndex, 40);
      const tagMatches = searchIndexRef.current.searchTags(query);
      const tagFilterMatches = findFilterCommandsForTags(tagMatches, commandIndex.items);

      return dedupeById([...tagFilterMatches, ...commandMatches]).slice(0, 40);
    },
    [commandIndex],
  );

  return {
    search,
    reindex,
  };
}
