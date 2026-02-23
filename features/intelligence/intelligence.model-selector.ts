import {
  INTELLIGENCE_BALANCED_MODEL_ID,
  INTELLIGENCE_FALLBACK_MODEL_ID,
} from "./intelligence.constants";
import type {
  IntelligenceModelCatalog,
  IntelligenceModelConfig,
} from "./intelligence.types";

export interface DeviceClassHints {
  saveData: boolean;
  effectiveType: string | null;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeModel(value: unknown): IntelligenceModelConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toString(value.id);
  const label = toString(value.label);
  const sizeMb = toFiniteNumber(value.sizeMb);
  const embeddingDim = toFiniteNumber(value.embeddingDim);
  const tier = toString(value.tier);
  const recommendedFor = toString(value.recommendedFor);
  const status = toString(value.status);

  if (!id || !label || sizeMb === null || embeddingDim === null) {
    return null;
  }

  if (tier !== "small" && tier !== "balanced" && tier !== "quality") {
    return null;
  }

  if (
    recommendedFor !== "low_end"
    && recommendedFor !== "balanced"
    && recommendedFor !== "high_end"
  ) {
    return null;
  }

  if (status !== "active" && status !== "deprecated") {
    return null;
  }

  return {
    id,
    label,
    sizeMb,
    embeddingDim,
    tier,
    recommendedFor,
    status,
  };
}

function toSafeDefaults(
  defaults: unknown,
  models: IntelligenceModelConfig[],
): IntelligenceModelCatalog["defaults"] {
  const available = new Set(models.map((model) => model.id));

  const parsedAutoLowEnd = isRecord(defaults) ? toString(defaults.autoLowEnd) : null;
  const parsedAutoBalanced = isRecord(defaults) ? toString(defaults.autoBalanced) : null;

  const autoLowEnd =
    parsedAutoLowEnd && available.has(parsedAutoLowEnd)
      ? parsedAutoLowEnd
      : available.has(INTELLIGENCE_FALLBACK_MODEL_ID)
        ? INTELLIGENCE_FALLBACK_MODEL_ID
        : models[0]?.id ?? INTELLIGENCE_FALLBACK_MODEL_ID;

  const autoBalanced =
    parsedAutoBalanced && available.has(parsedAutoBalanced)
      ? parsedAutoBalanced
      : available.has(INTELLIGENCE_BALANCED_MODEL_ID)
        ? INTELLIGENCE_BALANCED_MODEL_ID
        : autoLowEnd;

  return {
    autoLowEnd,
    autoBalanced,
  };
}

export function normalizeModelCatalog(input: unknown): IntelligenceModelCatalog | null {
  if (!isRecord(input)) {
    return null;
  }

  const version = toString(input.version) ?? "v1";
  const modelsRaw = Array.isArray(input.models) ? input.models : [];
  const models = modelsRaw
    .map(normalizeModel)
    .filter((model): model is IntelligenceModelConfig => model !== null);

  if (models.length === 0) {
    return null;
  }

  const defaults = toSafeDefaults(input.defaults, models);

  return {
    version,
    models,
    defaults,
    fetchedAt: Date.now(),
  };
}

export function readDeviceClassHints(): DeviceClassHints {
  if (typeof navigator === "undefined") {
    return {
      saveData: false,
      effectiveType: null,
      deviceMemory: null,
      hardwareConcurrency: null,
    };
  }

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  }).connection;

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  return {
    saveData: Boolean(connection?.saveData),
    effectiveType: connection?.effectiveType ?? null,
    deviceMemory:
      typeof deviceMemory === "number" && Number.isFinite(deviceMemory)
        ? deviceMemory
        : null,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === "number"
      && Number.isFinite(navigator.hardwareConcurrency)
        ? navigator.hardwareConcurrency
        : null,
  };
}

export function isLowEndDevice(hints: DeviceClassHints): boolean {
  if (hints.saveData) {
    return true;
  }

  if (hints.effectiveType === "slow-2g" || hints.effectiveType === "2g") {
    return true;
  }

  if (typeof hints.deviceMemory === "number" && hints.deviceMemory > 0 && hints.deviceMemory < 4) {
    return true;
  }

  if (
    typeof hints.hardwareConcurrency === "number"
    && hints.hardwareConcurrency > 0
    && hints.hardwareConcurrency <= 4
  ) {
    return true;
  }

  return false;
}

export function resolveAutoModelId(
  catalog: IntelligenceModelCatalog,
  hints: DeviceClassHints,
): string {
  const available = new Set(catalog.models.map((model) => model.id));

  const preferred = isLowEndDevice(hints)
    ? catalog.defaults.autoLowEnd
    : catalog.defaults.autoBalanced;

  if (available.has(preferred)) {
    return preferred;
  }

  if (available.has(INTELLIGENCE_FALLBACK_MODEL_ID)) {
    return INTELLIGENCE_FALLBACK_MODEL_ID;
  }

  return catalog.models[0].id;
}
