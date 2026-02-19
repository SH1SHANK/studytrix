import { SETTINGS_SCHEMA } from "./settings.config";
import { buildDefaultSettings, cloneSettingItem } from "./settings.schema";
import type { SettingItem } from "./settings.types";

const settingMap = new Map<string, SettingItem>();
const categoryMap = new Map<string, SettingItem[]>();

for (const item of SETTINGS_SCHEMA.items) {
  settingMap.set(item.id, cloneSettingItem(item));

  const existingCategory = categoryMap.get(item.category);
  if (existingCategory) {
    existingCategory.push(cloneSettingItem(item));
  } else {
    categoryMap.set(item.category, [cloneSettingItem(item)]);
  }
}

export function getSettingDefinition(id: string): SettingItem | undefined {
  const item = settingMap.get(id);
  return item ? cloneSettingItem(item) : undefined;
}

export function getCategoryItems(category: string): SettingItem[] {
  const items = categoryMap.get(category);
  return items ? items.map(cloneSettingItem) : [];
}

export function getAllCategories(): string[] {
  return [...SETTINGS_SCHEMA.categories];
}

export function getAllSettingItems(): SettingItem[] {
  return SETTINGS_SCHEMA.items.map(cloneSettingItem);
}

export function getDefaultSettingsMap(): Record<string, unknown> {
  return buildDefaultSettings(SETTINGS_SCHEMA);
}
