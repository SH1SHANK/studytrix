import { CommandContext } from "./command.context";
import { CommandIndex } from "./command.index";
import { CommandItem } from "./command.types";

interface IndexedItem {
  item: CommandItem;
  titleLower: string;
  subtitleLower: string;
  keywordsLower: string[];
  titleWords: string[];
  subtitleWords: string[];
}

function escapeForMatch(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class CommandService {
  private index: CommandIndex;
  private indexedItems: IndexedItem[];
  private prefixIndex: Map<string, number[]>;
  private searchCache: Map<string, CommandItem[]> = new Map();
  private readonly maxCacheEntries = 120;

  constructor(index: CommandIndex) {
    this.index = index;
    this.prefixIndex = new Map();
    this.indexedItems = this.index.items.map((item) => {
      const titleLower = item.title.toLowerCase();
      const subtitleLower = (item.subtitle ?? "").toLowerCase();
      return {
        item,
        titleLower,
        subtitleLower,
        keywordsLower: (item.keywords ?? []).map((keyword) =>
          keyword.toLowerCase(),
        ),
        titleWords: titleLower.split(/[^a-z0-9]+/).filter(Boolean),
        subtitleWords: subtitleLower.split(/[^a-z0-9]+/).filter(Boolean),
      };
    });

    this.buildPrefixIndex();
  }

  private tokenize(input: string): string[] {
    return input
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  private buildPrefixIndex(): void {
    for (let index = 0; index < this.indexedItems.length; index += 1) {
      const indexedItem = this.indexedItems[index];
      const tokens = new Set<string>([
        ...this.tokenize(indexedItem.titleLower),
        ...this.tokenize(indexedItem.subtitleLower),
      ]);

      for (const keyword of indexedItem.keywordsLower) {
        for (const token of this.tokenize(keyword)) {
          tokens.add(token);
        }
      }

      const itemPrefixes = new Set<string>();
      for (const token of tokens) {
      const maxPrefixLength = Math.min(4, token.length);
        for (let i = 1; i <= maxPrefixLength; i += 1) {
          itemPrefixes.add(token.slice(0, i));
        }
      }

      for (const prefix of itemPrefixes) {
        const existing = this.prefixIndex.get(prefix);
        if (existing) {
          existing.push(index);
        } else {
          this.prefixIndex.set(prefix, [index]);
        }
      }
    }
  }

  private setCache(key: string, value: CommandItem[]): void {
    this.searchCache.set(key, value);
    if (this.searchCache.size <= this.maxCacheEntries) {
      return;
    }

    const firstKey = this.searchCache.keys().next().value as string | undefined;
    if (firstKey) {
      this.searchCache.delete(firstKey);
    }
  }

  search(query: string, context: CommandContext): CommandItem[] {
    const term = query.trim().toLowerCase();
    const folderKey = context.folderId ?? "";
    const contextIds = [...context.pinnedIds, ...context.recentIds];
    const contextIdKey = contextIds.join("|");
    const cacheKey = `${term}::${folderKey}::${contextIdKey}`;

    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const contextIdSet = new Set(contextIds);
    const tokens = this.tokenize(escapeForMatch(term));
    const prefix = term.slice(0, Math.min(4, term.length));

    let candidateIndices: number[];
    if (term.length === 0) {
      candidateIndices = this.indexedItems.map((_, index) => index);
    } else if (tokens.length <= 1) {
      candidateIndices = this.prefixIndex.get(prefix) ?? [];
    } else {
      // Multi-token intersection: intersect candidate sets from each token prefix
      const sets = tokens.map((token) => {
        const tp = token.slice(0, Math.min(4, token.length));
        return new Set(this.prefixIndex.get(tp) ?? []);
      });
      sets.sort((a, b) => a.size - b.size);
      const smallest = sets[0];
      candidateIndices = Array.from(smallest).filter((idx) =>
        sets.every((s) => s.has(idx)),
      );
    }

    const ranked: CommandItem[] = [];

    for (const index of candidateIndices) {
      const indexedItem = this.indexedItems[index];
      const item = indexedItem.item;
      if (!(item.scope === "global" || (item.scope === "folder" && !!context.folderId))) {
        continue;
      }

      let score = 0;

      if (!term) {
        score = 1;
      } else if (indexedItem.titleLower === term) {
        score = 100;
      } else if (indexedItem.titleLower.startsWith(term)) {
        score = 50;
      } else if (indexedItem.titleLower.includes(term)) {
        score = 20;
      } else if (indexedItem.subtitleLower.includes(term)) {
        score = 16;
        // Subtitle word-start bonus
        if (indexedItem.subtitleWords.some((w) => w.startsWith(term))) {
          score = 28;
        }
      } else if (indexedItem.titleWords.some((w) => w.startsWith(term))) {
        // Title word-start match (e.g. "stor" matching "Open Storage Dashboard")
        score = 35;
      } else {
        for (const keyword of indexedItem.keywordsLower) {
          if (keyword === term) {
            score = 40;
            break;
          }
          if (keyword.includes(term)) {
            score = 10;
            break;
          }
        }
      }

      if (item.entityId && contextIdSet.has(item.entityId)) {
        score += 30;
      }

      if (score > 0) {
        ranked.push({
          ...item,
          score,
        });
      }
    }

    ranked.sort((left, right) => {
      const scoreDiff = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const titleDiff = left.title.localeCompare(right.title);
      if (titleDiff !== 0) {
        return titleDiff;
      }

      return left.id.localeCompare(right.id);
    });

    this.setCache(cacheKey, ranked);
    return ranked;
  }
}
