import { CommandItem } from "./command.types";

export function rankCommands(
  items: CommandItem[],
  query: string,
  contextIds: string[]
): CommandItem[] {
  const term = query.trim().toLowerCase();

  function computeMatchScore(item: CommandItem): number {
    if (!term) return 1;

    const text = item.title.toLowerCase();
    if (text === term) return 100;
    if (text.startsWith(term)) return 50;
    if (text.includes(term)) return 20;

    if (item.keywords) {
      for (const kw of item.keywords) {
        const normalizedKw = kw.toLowerCase();
        if (normalizedKw === term) return 40;
        if (normalizedKw.includes(term)) return 10;
      }
    }

    return 0;
  }

  return items
    .map((item) => {
      let score = computeMatchScore(item);

      // Pinned boost
      if (item.entityId && contextIds.includes(item.entityId)) {
        score += 30;
      }

      return { ...item, score };
    })
    .filter((item) => (item.score ?? 0) > 0)
    .sort((a, b) => {
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      const titleDiff = a.title.localeCompare(b.title);
      if (titleDiff !== 0) return titleDiff;

      return a.id.localeCompare(b.id);
    });
}
