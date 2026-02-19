import type { Tag, TagUsageAnalytics } from "./tag.types";

export function markTagUsed(tag: Tag, timestamp: number = Date.now()): Tag {
  return {
    ...tag,
    uses: tag.uses + 1,
    updatedAt: timestamp,
  };
}

export function markTagTouched(tag: Tag, timestamp: number = Date.now()): Tag {
  return {
    ...tag,
    updatedAt: timestamp,
  };
}

export function getTagUsageAnalytics(tags: readonly Tag[]): TagUsageAnalytics[] {
  return tags.map((tag) => ({
    tagId: tag.id,
    uses: tag.uses,
    lastUsedAt: tag.updatedAt,
  }));
}

export function sortTagsByAnalytics(tags: readonly Tag[]): Tag[] {
  return [...tags].sort((left, right) => {
    if (left.uses !== right.uses) {
      return right.uses - left.uses;
    }

    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }

    return left.name.localeCompare(right.name);
  });
}
