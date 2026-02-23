"use client";

import {
  INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID,
  INTELLIGENCE_CLEANUP_MODELS,
  INTELLIGENCE_CLEANUP_MODEL_STORAGE_KEY,
} from "./intelligence.constants";
import { getIntelligenceClient } from "./intelligence.client";
import { useIntelligenceStore } from "./intelligence.store";
import type { IntelligenceCleanTextResult, IntelligenceWorkerEventMessage } from "./intelligence.types";
import {
  isCleanupOutputTooShort,
  resolveCleanupModelId,
} from "./intelligence.cleanup.utils";

type CleanupBridgeResult = IntelligenceCleanTextResult & {
  modelId: string;
  outputWasShortened: boolean;
};

let bridgeSubscriptionBound = false;

export function getCleanupModels() {
  return [...INTELLIGENCE_CLEANUP_MODELS];
}

export function readCleanupModelPreference(): string {
  if (typeof window === "undefined") {
    return INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;
  }

  try {
    const persisted = window.localStorage.getItem(INTELLIGENCE_CLEANUP_MODEL_STORAGE_KEY);
    return resolveCleanupModelId(persisted);
  } catch {
    return INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID;
  }
}

export function persistCleanupModelPreference(modelId: string): string {
  const resolved = resolveCleanupModelId(modelId);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(INTELLIGENCE_CLEANUP_MODEL_STORAGE_KEY, resolved);
    } catch {
      // Ignore localStorage quota/security failures.
    }
  }

  useIntelligenceStore.getState().setCleanupModelId(resolved);
  return resolved;
}

function handleWorkerEvent(message: IntelligenceWorkerEventMessage): void {
  const store = useIntelligenceStore.getState();

  if (message.type === "MODEL_DOWNLOAD_PROGRESS" && message.pipeline === "cleanup") {
    store.setCleanupDownloadProgress({
      percent: message.percent,
      loadedBytes: message.loadedBytes,
      totalBytes: message.totalBytes,
    });
    return;
  }

  if (message.type === "MODEL_PIPELINE_STATUS" && message.pipeline === "cleanup") {
    store.setCleanupRuntimeStatus(
      message.status,
      message.status === "error" ? message.message : null,
    );
  }
}

export function ensureCleanupBridge(): void {
  if (bridgeSubscriptionBound) {
    return;
  }

  bridgeSubscriptionBound = true;
  const client = getIntelligenceClient();
  client.subscribeEvents(handleWorkerEvent);
}

export async function switchCleanupModel(modelId: string): Promise<void> {
  ensureCleanupBridge();
  const resolved = persistCleanupModelPreference(modelId);
  const store = useIntelligenceStore.getState();
  store.setCleanupRuntimeStatus("loading");
  store.setCleanupDownloadProgress({
    percent: 0,
    loadedBytes: null,
    totalBytes: null,
  });

  try {
    const result = await getIntelligenceClient().switchCleanupModel(resolved);
    store.setCleanupModelId(result.modelId);
    store.setCleanupRuntimeStatus(result.ready ? "ready" : "error");
  } catch (error) {
    store.setCleanupRuntimeStatus(
      "error",
      error instanceof Error ? error.message : "Failed to switch cleanup model",
    );
  }
}

export async function cleanTextForClipboard(rawOcrText: string, preferredModelId?: string): Promise<CleanupBridgeResult> {
  const original = rawOcrText.trim();
  if (!original) {
    return {
      text: "",
      modelId: resolveCleanupModelId(preferredModelId),
      cleaned: false,
      usedFallback: true,
      reason: "empty_input",
      outputWasShortened: false,
    };
  }

  ensureCleanupBridge();
  const resolvedModelId = resolveCleanupModelId(preferredModelId ?? readCleanupModelPreference());
  const store = useIntelligenceStore.getState();

  store.setCleanupModelId(resolvedModelId);

  try {
    const response = await getIntelligenceClient().cleanText({
      text: original,
      modelId: resolvedModelId,
    });

    const output = response.text.trim();
    const useOriginal = !output || isCleanupOutputTooShort(original, output);
    if (useOriginal) {
      return {
        text: original,
        modelId: response.modelId || resolvedModelId,
        cleaned: false,
        usedFallback: true,
        reason: "short_output_guard",
        outputWasShortened: true,
      };
    }

    return {
      ...response,
      modelId: response.modelId || resolvedModelId,
      outputWasShortened: false,
    };
  } catch {
    return {
      text: original,
      modelId: resolvedModelId,
      cleaned: false,
      usedFallback: true,
      reason: "worker_failed",
      outputWasShortened: false,
    };
  }
}
