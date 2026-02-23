import type { IntelligenceRuntimeStatus } from "./intelligence.store";

interface SemanticRuntimeState {
  enabled: boolean;
  runtimeStatus: IntelligenceRuntimeStatus;
  query: string;
}

export function shouldRunSemanticQuery(state: SemanticRuntimeState): boolean {
  if (!state.enabled) {
    return false;
  }

  if (state.runtimeStatus !== "ready") {
    return false;
  }

  return state.query.trim().length > 0;
}

interface SemanticMergeState {
  enabled: boolean;
  runtimeStatus: IntelligenceRuntimeStatus;
  query: string;
  semanticHitCount: number;
}

export function shouldMergeSemanticResults(state: SemanticMergeState): boolean {
  if (!shouldRunSemanticQuery(state)) {
    return false;
  }

  return state.semanticHitCount > 0;
}

/**
 * Returns `true` if duplicate detection should be skipped because the device
 * is on battery-saver or has indicated save-data preference.
 *
 * Falls back to `false` (allow detection) if the APIs are unavailable.
 */
export function shouldSuppressDuplicateDetection(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  // Respect save-data header
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData === true) {
    return true;
  }

  return false;
}

/**
 * Returns `true` if the device appears to be low-end:
 * - `navigator.deviceMemory < 2` (less than 2 GB RAM), or
 * - `navigator.hardwareConcurrency < 4` (fewer than 4 cores)
 *
 * Falls back to `false` when the APIs are unavailable.
 */
export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === "number" && memory < 2) {
    return true;
  }

  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency < 4) {
    return true;
  }

  return false;
}
