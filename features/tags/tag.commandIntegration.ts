import type { CommandItem } from "@/features/command/command.types";

import type { Tag, TagAssignment, TagCommandActionPayload } from "./tag.types";

export interface TagCommandIndex {
  items: CommandItem[];
  searchable: Array<{
    id: string;
    text: string;
  }>;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function createPayload(payload: TagCommandActionPayload): Record<string, unknown> {
  const result: Record<string, unknown> = {
    action: payload.action,
  };

  if (payload.tagId) {
    result.tagId = payload.tagId;
  }

  if (payload.entityId) {
    result.entityId = payload.entityId;
  }

  return result;
}

function buildFilterCommands(tag: Tag): CommandItem[] {
  return [
    {
      id: `tag-filter:${tag.id}`,
      title: `Filter by ${tag.name}`,
      subtitle: "Add tag filter",
      keywords: ["tag", "filter", tag.name],
      group: "actions",
      scope: "global",
      payload: createPayload({
        action: "tag-filter",
        tagId: tag.id,
      }),
    },
    {
      id: `remove-tag-filter:${tag.id}`,
      title: `Remove filter ${tag.name}`,
      subtitle: "Remove tag filter",
      keywords: ["tag", "filter", "remove", tag.name],
      group: "actions",
      scope: "global",
      payload: createPayload({
        action: "remove-tag-filter",
        tagId: tag.id,
      }),
    },
  ];
}

function buildStarCommands(assignment: TagAssignment): CommandItem[] {
  return [
    {
      id: `star:${assignment.entityId}`,
      title: `Star ${assignment.entityId}`,
      subtitle: assignment.starred ? "Already starred" : "Pin this entity",
      keywords: ["star", assignment.entityId],
      group: "actions",
      scope: "folder",
      entityId: assignment.entityId,
      payload: createPayload({
        action: "star",
        entityId: assignment.entityId,
      }),
    },
    {
      id: `unstar:${assignment.entityId}`,
      title: `Unstar ${assignment.entityId}`,
      subtitle: assignment.starred ? "Remove pinned state" : "Currently unstarred",
      keywords: ["unstar", "star", assignment.entityId],
      group: "actions",
      scope: "folder",
      entityId: assignment.entityId,
      payload: createPayload({
        action: "unstar",
        entityId: assignment.entityId,
      }),
    },
  ];
}

function buildSearchText(item: CommandItem): string {
  const keywords = item.keywords?.join(" ") ?? "";
  return normalize(`${item.title} ${item.subtitle ?? ""} ${keywords} ${item.entityId ?? ""}`);
}

export function buildTagCommandIndex(
  tags: readonly Tag[],
  assignments: readonly TagAssignment[],
): TagCommandIndex {
  const items: CommandItem[] = [];

  for (const tag of tags) {
    items.push(...buildFilterCommands(tag));
  }

  for (const assignment of assignments) {
    items.push(...buildStarCommands(assignment));
  }

  return {
    items,
    searchable: items.map((item) => ({
      id: item.id,
      text: buildSearchText(item),
    })),
  };
}

export function searchTagCommandItems(
  query: string,
  index: TagCommandIndex,
  limit: number = 20,
): CommandItem[] {
  const normalizedQuery = normalize(query);
  const byId = new Map(index.items.map((item) => [item.id, item]));

  if (!normalizedQuery) {
    return index.items.slice(0, limit);
  }

  const ranked = index.searchable
    .filter((entry) => entry.text.includes(normalizedQuery))
    .slice(0, limit)
    .map((entry) => byId.get(entry.id))
    .filter((item): item is CommandItem => Boolean(item));

  return ranked;
}
