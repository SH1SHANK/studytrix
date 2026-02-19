import type { Tag, TagSearchResult } from "./tag.types";

const MAX_AUTOCOMPLETE_RESULTS = 10;

interface IndexedTagEntry {
  tag: Tag;
  normalizedName: string;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareTagPriority(left: Tag, right: Tag): number {
  if (left.uses !== right.uses) {
    return right.uses - left.uses;
  }

  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt - left.updatedAt;
  }

  return left.name.localeCompare(right.name);
}

function scoreMatch(normalizedName: string, query: string): number {
  const index = normalizedName.indexOf(query);
  if (index < 0) {
    return -1;
  }

  const startsWithBoost = index === 0 ? 50 : 0;
  const compactness = Math.max(0, 25 - index);
  return startsWithBoost + compactness;
}

export class TagIndexedSearch {
  private entries: IndexedTagEntry[] = [];

  setTags(tags: readonly Tag[]): void {
    this.entries = tags.map((tag) => ({
      tag,
      normalizedName: normalize(tag.name),
    }));
  }

  searchTags(query: string): Tag[] {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return [...this.entries]
        .map((entry) => entry.tag)
        .sort(compareTagPriority)
        .slice(0, MAX_AUTOCOMPLETE_RESULTS);
    }

    const matches: TagSearchResult[] = [];

    for (const entry of this.entries) {
      const score = scoreMatch(entry.normalizedName, normalizedQuery);
      if (score < 0) {
        continue;
      }

      matches.push({
        tag: entry.tag,
        score,
      });
    }

    return matches
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return compareTagPriority(left.tag, right.tag);
      })
      .slice(0, MAX_AUTOCOMPLETE_RESULTS)
      .map((result) => result.tag);
  }
}

export function searchTags(query: string, tags: readonly Tag[]): Tag[] {
  const index = new TagIndexedSearch();
  index.setTags(tags);
  return index.searchTags(query);
}
