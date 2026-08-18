import { settingsRepository } from "@/db/repositories/settings.repository";
import { parseSettingsJson } from "./settings.schema";
import { getSettingDefinition } from "./settings.registry";
import { validateSetting } from "./settings.validation";

const memorySettings = new Map<string, unknown>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneUnknown);
  }

  if (isRecord(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      cloned[key] = cloneUnknown(nestedValue);
    }
    return cloned;
  }

  return value;
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  try {
    const records = await settingsRepository.getAll();
    for (const [k, v] of Object.entries(records)) {
      memorySettings.set(k, cloneUnknown(v));
    }
    return records;
  } catch (error) {
    console.error("Failed to read settings from RxDB, using memory fallback", error);
    return Object.fromEntries(memorySettings.entries());
  }
}

export async function setSetting(id: string, value: unknown): Promise<void> {
  const key = id.trim();
  if (!key) return;

  const cloned = cloneUnknown(value);
  memorySettings.set(key, cloned);

  try {
    await settingsRepository.set(key, cloned);
  } catch (error) {
    console.error("Failed to persist setting to RxDB", error);
  }
}

export async function removeSetting(id: string): Promise<void> {
  const key = id.trim();
  if (!key) return;

  memorySettings.delete(key);
  try {
    await settingsRepository.set(key, null);
  } catch (error) {
    console.error("Failed to remove setting from RxDB", error);
  }
}

export async function resetSettings(): Promise<void> {
  memorySettings.clear();
  try {
    await settingsRepository.reset();
  } catch (error) {
    console.error("Failed to reset settings in RxDB", error);
  }
}

export async function exportSettings(): Promise<string> {
  const values = await getAllSettings();
  return JSON.stringify(values, null, 2);
}

function parseAndValidateImport(json: string): Record<string, unknown> {
  const parsed = parseSettingsJson(json);
  const validated: Record<string, unknown> = {};

  for (const [id, value] of Object.entries(parsed)) {
    const definition = getSettingDefinition(id);
    if (!definition) continue;

    if (!validateSetting(definition, value)) {
      throw new Error(`Invalid value for setting '${id}'`);
    }

    validated[id] = cloneUnknown(value);
  }

  return validated;
}

export async function importSettings(json: string): Promise<void> {
  const validated = parseAndValidateImport(json);

  memorySettings.clear();
  const now = Date.now();
  const docs = Object.entries(validated).map(([id, value]) => ({
    id,
    value: cloneUnknown(value),
    updatedAt: now,
  }));

  try {
    await settingsRepository.reset();
    await settingsRepository.bulkUpsert(docs);
  } catch (error) {
    console.error("Failed to import settings into RxDB", error);
  }
}
