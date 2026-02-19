import { getAllSettingItems } from "./settings.registry";
import type { SettingItem } from "./settings.types";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesQuery(item: SettingItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const label = normalize(item.label);
  const description = normalize(item.description ?? "");
  const category = normalize(item.category);

  return (
    label.includes(normalizedQuery) ||
    description.includes(normalizedQuery) ||
    category.includes(normalizedQuery)
  );
}

export function searchSettings(query: string): SettingItem[] {
  const normalizedQuery = normalize(query);

  return getAllSettingItems().filter((item) => matchesQuery(item, normalizedQuery));
}
