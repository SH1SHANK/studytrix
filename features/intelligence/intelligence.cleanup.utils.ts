import {
  INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID,
  INTELLIGENCE_CLEANUP_MODELS,
} from "./intelligence.constants";

const SHORT_OUTPUT_RATIO_THRESHOLD = 0.4;

export function isKnownCleanupModel(modelId: string): boolean {
  return INTELLIGENCE_CLEANUP_MODELS.some((model) => model.id === modelId);
}

export function resolveCleanupModelId(candidate: string | null | undefined): string {
  if (typeof candidate !== "string") {
    return INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;
  }

  const normalized = candidate.trim();
  if (!normalized || !isKnownCleanupModel(normalized)) {
    return INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;
  }

  return normalized;
}

export function isCleanupOutputTooShort(original: string, candidate: string): boolean {
  const sourceLength = original.trim().length;
  if (sourceLength === 0) {
    return false;
  }

  const candidateLength = candidate.trim().length;
  return candidateLength < Math.floor(sourceLength * SHORT_OUTPUT_RATIO_THRESHOLD);
}
