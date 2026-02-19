import type { SettingItem, SettingsSchema } from "./settings.types";

function normalizeId(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createSettingsSchema(schema: SettingsSchema): SettingsSchema {
  const categories = Array.from(new Set(schema.categories.map((category) => category.trim()).filter(Boolean)));
  const categorySet = new Set(categories);

  const seenIds = new Set<string>();

  for (const item of schema.items) {
    const normalizedId = normalizeId(item.id);

    if (!normalizedId) {
      throw new Error("Invalid settings schema: setting id is required");
    }

    if (seenIds.has(normalizedId)) {
      throw new Error(`Invalid settings schema: duplicate setting id '${item.id}'`);
    }

    seenIds.add(normalizedId);

    if (!categorySet.has(item.category)) {
      throw new Error(
        `Invalid settings schema: setting '${item.id}' references unknown category '${item.category}'`,
      );
    }
  }

  return {
    categories,
    items: schema.items.map((item) => ({ ...item })),
  };
}

export function buildDefaultSettings(schema: SettingsSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const item of schema.items) {
    if (item.defaultValue !== undefined) {
      defaults[item.id] = item.defaultValue;
    }
  }

  return defaults;
}

export function serializeSettings(values: Record<string, unknown>): string {
  return JSON.stringify(values, null, 2);
}

export function parseSettingsJson(json: string): Record<string, unknown> {
  const parsed = JSON.parse(json) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Invalid settings payload");
  }

  return parsed;
}

export function cloneSettingItem(item: SettingItem): SettingItem {
  return {
    ...item,
    options: item.options ? [...item.options] : undefined,
  };
}
