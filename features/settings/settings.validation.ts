import type { SettingItem } from "./settings.types";

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;
const FLOAT_EPSILON = 1e-8;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateSelect(setting: SettingItem, value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  if (!setting.options || setting.options.length === 0) {
    return false;
  }

  return setting.options.some((option) => option.value === value);
}

function validateSlider(setting: SettingItem, value: unknown): boolean {
  if (!isFiniteNumber(value)) {
    return false;
  }

  const min = setting.min ?? Number.NEGATIVE_INFINITY;
  const max = setting.max ?? Number.POSITIVE_INFINITY;

  if (value < min || value > max) {
    return false;
  }

  const step = setting.step;
  if (!step || !Number.isFinite(step) || step <= 0) {
    return true;
  }

  const base = setting.min ?? 0;
  const ratio = (value - base) / step;

  return Math.abs(ratio - Math.round(ratio)) <= FLOAT_EPSILON;
}

export function validateSetting(setting: SettingItem, value: unknown): boolean {
  if (setting.type === "toggle") {
    return typeof value === "boolean";
  }

  if (setting.type === "select") {
    return validateSelect(setting, value);
  }

  if (setting.type === "slider") {
    return validateSlider(setting, value);
  }

  if (setting.type === "color") {
    return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
  }

  if (setting.type === "action" || setting.type === "danger" || setting.type === "info") {
    return true;
  }

  return false;
}

export function getValidatedSettingValue(setting: SettingItem, value: unknown): unknown {
  if (validateSetting(setting, value)) {
    return value;
  }

  return setting.defaultValue;
}
