"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SettingRowShell } from "@/components/settings/SettingCardShell";
import { getSettingIcon } from "@/components/settings/setting-icons";
import {
  fetchIntelligenceModelCatalog,
  getIntelligenceClient,
} from "@/features/intelligence/intelligence.client";
import {
  INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID,
  INTELLIGENCE_SETTINGS_IDS,
} from "@/features/intelligence/intelligence.constants";
import {
  ensureCleanupBridge,
  getCleanupModels,
  persistCleanupModelPreference,
  readCleanupModelPreference,
  switchCleanupModel,
} from "@/features/intelligence/intelligence.cleanup.client";
import { resolveCleanupModelId } from "@/features/intelligence/intelligence.cleanup.utils";
import {
  readDeviceClassHints,
  resolveAutoModelId,
} from "@/features/intelligence/intelligence.model-selector";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import type {
  IntelligenceModelConfig,
  IntelligenceWorkerEventMessage,
} from "@/features/intelligence/intelligence.types";
import { useSetting } from "@/ui/hooks/useSettings";
import { cn } from "@/lib/utils";

interface IntelligenceSettingsSectionProps {
  onDangerAction?: (id: string) => Promise<void> | void;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function resolveSelectedModel(
  modelId: string,
  models: IntelligenceModelConfig[],
): IntelligenceModelConfig | null {
  return models.find((model) => model.id === modelId) ?? null;
}

function estimateIndexSizeMb(indexSize: number, embeddingDim: number): number {
  if (indexSize <= 0 || embeddingDim <= 0) {
    return 0;
  }

  const bytes = indexSize * embeddingDim * 4;
  return bytes / (1024 * 1024);
}

function formatTimeAgo(ageMs: number): string {
  const ageMin = Math.max(0, Math.round(ageMs / 60000));
  if (ageMin < 1) return "just now";
  if (ageMin < 60) return `${ageMin}m ago`;
  const ageHours = Math.round(ageMin / 60);
  if (ageHours < 24) return `${ageHours}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
}

type RuntimeStatusColor = "emerald" | "amber" | "rose" | "zinc";

function resolveStatusDisplay(status: string): { label: string; color: RuntimeStatusColor } {
  switch (status) {
    case "ready":
      return { label: "Ready", color: "emerald" };
    case "loading":
      return { label: "Loading", color: "amber" };
    case "error":
      return { label: "Error", color: "rose" };
    default:
      return { label: "Idle", color: "zinc" };
  }
}

function RuntimeStatusBadge({ status }: { status: string }) {
  const { label, color } = resolveStatusDisplay(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
        color === "emerald" && "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        color === "amber" && "border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        color === "rose" && "border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        color === "zinc" && "border border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
      )}
    >
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          color === "emerald" && "bg-emerald-500",
          color === "amber" && "bg-amber-500 animate-pulse",
          color === "rose" && "bg-rose-500",
          color === "zinc" && "bg-zinc-400",
        )}
      />
      {label}
    </span>
  );
}

function formatDownloadProgressLabel(
  percent: number | null,
  loadedBytes: number | null,
  totalBytes: number | null,
): string | null {
  if (percent === null) {
    return null;
  }

  const loadedMb = (loadedBytes ?? 0) / (1024 * 1024);
  const totalMb = (totalBytes ?? 0) / (1024 * 1024);

  if (!Number.isFinite(totalMb) || totalMb <= 0) {
    return `${Math.round(percent)}%`;
  }

  const remaining = Math.max(0, totalMb - loadedMb);
  return `${Math.round(percent)}% · ${remaining.toFixed(1)}MB remaining`;
}

function IntelligenceSettingsSectionComponent({ onDangerAction }: IntelligenceSettingsSectionProps) {
  const [smartSearchEnabled, setSmartSearchEnabled] = useSetting(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled);
  const [ocrEnabled, setOcrEnabled] = useSetting(INTELLIGENCE_SETTINGS_IDS.ocrEnabled);
  const [duplicateDetectionEnabled, setDuplicateDetectionEnabled] = useSetting(INTELLIGENCE_SETTINGS_IDS.duplicateDetectionEnabled);
  const [modelMode, setModelMode] = useSetting(INTELLIGENCE_SETTINGS_IDS.modelMode);
  const [modelId, setModelId] = useSetting(INTELLIGENCE_SETTINGS_IDS.modelId);
  const [cleanupModelSetting, setCleanupModelSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.cleanupModelId);
  const [semanticWeight, setSemanticWeight] = useSetting(INTELLIGENCE_SETTINGS_IDS.semanticWeight);

  const [catalogError, setCatalogError] = useState<string | null>(null);

  const runtimeStatus = useIntelligenceStore((state) => state.runtimeStatus);
  const activeModelId = useIntelligenceStore((state) => state.activeModelId);
  const embeddingDownloadPercent = useIntelligenceStore((state) => state.embeddingDownloadPercent);
  const embeddingDownloadLoadedBytes = useIntelligenceStore((state) => state.embeddingDownloadLoadedBytes);
  const embeddingDownloadTotalBytes = useIntelligenceStore((state) => state.embeddingDownloadTotalBytes);
  const cleanupRuntimeStatus = useIntelligenceStore((state) => state.cleanupRuntimeStatus);
  const cleanupModelId = useIntelligenceStore((state) => state.cleanupModelId);
  const cleanupDownloadPercent = useIntelligenceStore((state) => state.cleanupDownloadPercent);
  const cleanupDownloadLoadedBytes = useIntelligenceStore((state) => state.cleanupDownloadLoadedBytes);
  const cleanupDownloadTotalBytes = useIntelligenceStore((state) => state.cleanupDownloadTotalBytes);
  const cleanupLastError = useIntelligenceStore((state) => state.cleanupLastError);
  const catalog = useIntelligenceStore((state) => state.catalog);
  const indexSize = useIntelligenceStore((state) => state.indexSize);
  const lastIndexedAt = useIntelligenceStore((state) => state.lastIndexedAt);
  const resolvedAutoModelId = useIntelligenceStore((state) => state.resolvedAutoModelId);
  const setCatalog = useIntelligenceStore((state) => state.setCatalog);
  const setCleanupModelId = useIntelligenceStore((state) => state.setCleanupModelId);
  const setEmbeddingDownloadProgress = useIntelligenceStore((state) => state.setEmbeddingDownloadProgress);
  const setCleanupDownloadProgress = useIntelligenceStore((state) => state.setCleanupDownloadProgress);
  const setRuntimeStatus = useIntelligenceStore((state) => state.setRuntimeStatus);
  const setModel = useIntelligenceStore((state) => state.setModel);
  const setIndexStats = useIntelligenceStore((state) => state.setIndexStats);
  const [modelActivityMessage, setModelActivityMessage] = useState<string | null>(null);
  const [modelActivityTone, setModelActivityTone] = useState<"info" | "success" | "error">("info");
  const previousCleanupStatusRef = useRef(cleanupRuntimeStatus);

  const enabled = toBoolean(smartSearchEnabled);
  const ocrToggle = toBoolean(ocrEnabled);
  const duplicateToggle = toBoolean(duplicateDetectionEnabled);
  const selectedMode = toStringValue(modelMode, "auto");
  const selectedModelId = toStringValue(modelId, "Xenova/all-MiniLM-L6-v2");
  const selectedCleanupModelId = resolveCleanupModelId(
    toStringValue(cleanupModelSetting, cleanupModelId ?? INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID),
  );
  const semanticWeightValue = Math.max(0, Math.min(100, Math.round(toNumber(semanticWeight, 60))));
  const cleanupModels = useMemo(() => getCleanupModels(), []);

  useEffect(() => {
    ensureCleanupBridge();
  }, []);

  useEffect(() => {
    const unsubscribe = getIntelligenceClient().subscribeEvents((event: IntelligenceWorkerEventMessage) => {
      if (event.type === "MODEL_DOWNLOAD_PROGRESS" && event.pipeline === "embedding") {
        setEmbeddingDownloadProgress({
          percent: event.percent,
          loadedBytes: event.loadedBytes,
          totalBytes: event.totalBytes,
        });
        return;
      }

      if (event.type === "MODEL_PIPELINE_STATUS" && event.pipeline === "embedding") {
        if (event.status === "loading") {
          setRuntimeStatus("loading");
          return;
        }

        if (event.status === "ready") {
          setRuntimeStatus("ready");
          setEmbeddingDownloadProgress({
            percent: 100,
            loadedBytes: null,
            totalBytes: null,
          });
          return;
        }

        if (event.status === "error") {
          setRuntimeStatus("error", event.message ?? "Semantic model load failed");
          setEmbeddingDownloadProgress({
            percent: null,
            loadedBytes: null,
            totalBytes: null,
          });
        }
      }
    });

    return unsubscribe;
  }, [setEmbeddingDownloadProgress, setRuntimeStatus]);

  useEffect(() => {
    const persisted = readCleanupModelPreference();
    const resolved = resolveCleanupModelId(
      typeof cleanupModelSetting === "string" ? cleanupModelSetting : persisted,
    );

    setCleanupModelId(resolved);
    if (persisted !== resolved) {
      persistCleanupModelPreference(resolved);
    }
    if (cleanupModelSetting !== resolved) {
      setCleanupModelSetting(resolved);
    }
  }, [cleanupModelSetting, setCleanupModelId, setCleanupModelSetting]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchIntelligenceModelCatalog(controller.signal)
      .then((nextCatalog) => {
        setCatalog(nextCatalog);
        setCatalogError(null);
      })
      .catch((error) => {
        setCatalogError(error instanceof Error ? error.message : "Could not load model list");
      });

    return () => controller.abort();
  }, [setCatalog]);

  useEffect(() => {
    if (runtimeStatus !== "ready" || embeddingDownloadPercent === null || embeddingDownloadPercent < 100) {
      return;
    }

    const timer = window.setTimeout(() => {
      setEmbeddingDownloadProgress({
        percent: null,
        loadedBytes: null,
        totalBytes: null,
      });
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [embeddingDownloadPercent, runtimeStatus, setEmbeddingDownloadProgress]);

  useEffect(() => {
    if (cleanupRuntimeStatus !== "ready" || cleanupDownloadPercent === null || cleanupDownloadPercent < 100) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCleanupDownloadProgress({
        percent: null,
        loadedBytes: null,
        totalBytes: null,
      });
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [cleanupDownloadPercent, cleanupRuntimeStatus, setCleanupDownloadProgress]);

  useEffect(() => {
    if (!modelActivityMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setModelActivityMessage(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [modelActivityMessage]);

  useEffect(() => {
    const previous = previousCleanupStatusRef.current;
    if (previous === "loading" && cleanupRuntimeStatus === "ready") {
      setModelActivityTone("success");
      setModelActivityMessage("Cleanup engine model is ready.");
    } else if (previous === "loading" && cleanupRuntimeStatus === "error") {
      setModelActivityTone("error");
      setModelActivityMessage(cleanupLastError ?? "Cleanup engine setup failed. Using raw OCR fallback.");
    }

    previousCleanupStatusRef.current = cleanupRuntimeStatus;
  }, [cleanupLastError, cleanupRuntimeStatus]);

  const models = useMemo(() => catalog?.models ?? [], [catalog]);
  const resolvedAutoModelIdFromCatalog = useMemo(() => {
    if (!catalog) {
      return null;
    }

    return resolveAutoModelId(catalog, readDeviceClassHints());
  }, [catalog]);
  const effectiveResolvedAutoModelId = resolvedAutoModelId ?? resolvedAutoModelIdFromCatalog;
  const selectedModel = useMemo(
    () => resolveSelectedModel(selectedModelId, models),
    [models, selectedModelId],
  );

  const resolvedAutoModel = useMemo(
    () => resolveSelectedModel(effectiveResolvedAutoModelId ?? "", models),
    [effectiveResolvedAutoModelId, models],
  );

  const estimatedSizeMb = useMemo(() => {
    const dim = selectedModel?.embeddingDim ?? resolvedAutoModel?.embeddingDim ?? 384;
    return estimateIndexSizeMb(indexSize, dim);
  }, [indexSize, resolvedAutoModel, selectedModel]);

  const indexStatusText = useMemo(() => {
    if (indexSize <= 0) {
      return "No files indexed yet";
    }

    const sizeLabel = `${indexSize} file${indexSize === 1 ? "" : "s"} indexed`;
    const usageLabel = `${estimatedSizeMb.toFixed(1)} MB`;

    if (!lastIndexedAt) {
      return `${sizeLabel} · ${usageLabel}`;
    }

    const ageMs = Date.now() - lastIndexedAt;
    return `${sizeLabel} · ${usageLabel} · ${formatTimeAgo(ageMs)}`;
  }, [estimatedSizeMb, indexSize, lastIndexedAt]);

  const handleClearIndex = useCallback(() => {
    void onDangerAction?.(INTELLIGENCE_SETTINGS_IDS.clearIndex);
  }, [onDangerAction]);

  const handleSearchModelSwitch = useCallback(async (
    nextModelId: string,
    resolvedAutoModelForState?: string | null,
  ) => {
    if (!enabled || !nextModelId.trim()) {
      return;
    }

    if (activeModelId === nextModelId && runtimeStatus === "ready") {
      setModelActivityTone("info");
      setModelActivityMessage("Selected semantic model is already active.");
      return;
    }

    setRuntimeStatus("loading");
    setEmbeddingDownloadProgress({
      percent: 0,
      loadedBytes: null,
      totalBytes: null,
    });
    setModelActivityTone("info");
    setModelActivityMessage("Switching semantic model and warming up runtime…");
    try {
      const stats = await getIntelligenceClient().setModel(nextModelId);
      setModel({
        activeModelId: stats.modelId,
        resolvedAutoModelId: resolvedAutoModelForState ?? undefined,
        usingHashedFallback: stats.usingHashedFallback,
      });
      setIndexStats({
        indexedDocs: stats.indexSize,
        lastIndexedAt: stats.updatedAt,
      });
      setRuntimeStatus("ready");
      setModelActivityTone("success");
      setModelActivityMessage("Semantic model switched. Re-indexing continues in background.");
    } catch (error) {
      setRuntimeStatus(
        "error",
        error instanceof Error ? error.message : "Failed to switch semantic model",
      );
      setEmbeddingDownloadProgress({
        percent: null,
        loadedBytes: null,
        totalBytes: null,
      });
      setModelActivityTone("error");
      setModelActivityMessage("Could not switch semantic model. Keyword search fallback remains active.");
    }
  }, [
    activeModelId,
    enabled,
    runtimeStatus,
    setEmbeddingDownloadProgress,
    setIndexStats,
    setModel,
    setRuntimeStatus,
  ]);

  const handleModelModeChange = useCallback((nextValue: string | null) => {
    if (typeof nextValue !== "string") {
      return;
    }

    setModelMode(nextValue);

    if (!enabled) {
      return;
    }

    if (nextValue === "manual") {
      void handleSearchModelSwitch(selectedModelId);
      return;
    }

    if (nextValue === "auto" && resolvedAutoModelIdFromCatalog) {
      void handleSearchModelSwitch(
        resolvedAutoModelIdFromCatalog,
        resolvedAutoModelIdFromCatalog,
      );
    }
  }, [
    enabled,
    handleSearchModelSwitch,
    resolvedAutoModelIdFromCatalog,
    selectedModelId,
    setModelMode,
  ]);

  const handleEmbeddingModelChange = useCallback((nextValue: string | null) => {
    if (typeof nextValue !== "string") {
      return;
    }

    setModelId(nextValue);
    if (!enabled || selectedMode !== "manual") {
      return;
    }

    void handleSearchModelSwitch(nextValue);
  }, [enabled, handleSearchModelSwitch, selectedMode, setModelId]);

  const handleCleanupModelChange = useCallback((nextValue: string | null) => {
    if (typeof nextValue !== "string") {
      return;
    }

    const resolved = resolveCleanupModelId(nextValue);
    setCleanupModelId(resolved);
    setCleanupModelSetting(resolved);
    persistCleanupModelPreference(resolved);
    setModelActivityTone("info");
    setModelActivityMessage("Switching cleanup engine…");
    void switchCleanupModel(resolved);
  }, [setCleanupModelId, setCleanupModelSetting]);

  const dependentDisabled = !enabled;
  const semanticProgressLabel = useMemo(
    () => formatDownloadProgressLabel(
      embeddingDownloadPercent,
      embeddingDownloadLoadedBytes,
      embeddingDownloadTotalBytes,
    ),
    [embeddingDownloadLoadedBytes, embeddingDownloadPercent, embeddingDownloadTotalBytes],
  );
  const cleanupProgressLabel = useMemo(
    () => formatDownloadProgressLabel(
      cleanupDownloadPercent,
      cleanupDownloadLoadedBytes,
      cleanupDownloadTotalBytes,
    ),
    [cleanupDownloadLoadedBytes, cleanupDownloadPercent, cleanupDownloadTotalBytes],
  );
  const showSemanticModelActivity = runtimeStatus === "loading" || embeddingDownloadPercent !== null;
  const showCleanupModelActivity = cleanupRuntimeStatus === "loading" || cleanupDownloadPercent !== null;
  const showModelActivityPanel = showSemanticModelActivity || showCleanupModelActivity || Boolean(modelActivityMessage);
  const selectedCleanupModel = cleanupModels.find((model) => model.id === selectedCleanupModelId);

  return (
    <>
      <SettingRowShell
        label="Smart Search"
        description={(
          <span>
            Understands search intent beyond keywords. Downloads model files once.
            <span className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
              Experimental
            </span>
          </span>
        )}
        icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled)}
        trailing={(
          <Switch
            id={`setting-${INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled}`}
            checked={enabled}
            onCheckedChange={(nextValue) => setSmartSearchEnabled(nextValue)}
            aria-label="Smart Search"
            className="mt-1"
          />
        )}
      />

      <SettingRowShell
        label="Cleanup Engine"
        description={cleanupRuntimeStatus === "error"
          ? (cleanupLastError ?? "Could not initialize cleanup engine. Falling back to raw OCR text.")
          : `Used for OCR denoising before copy. Selected: ${selectedCleanupModel?.label ?? selectedCleanupModelId}.`}
        icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.cleanupModelId)}
        trailing={(
          <div className="w-full sm:w-56">
            <Select value={selectedCleanupModelId} onValueChange={handleCleanupModelChange}>
              <SelectTrigger id={`setting-${INTELLIGENCE_SETTINGS_IDS.cleanupModelId}`} className="h-10 w-full rounded-xl px-3.5 text-sm">
                <SelectValue>{selectedCleanupModel?.label ?? selectedCleanupModelId}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cleanupModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="flex items-center gap-2">
                      {model.label}
                      <span className="rounded-full border border-border/50 bg-muted/60 px-1.5 py-px text-[10px] text-muted-foreground">
                        {model.sizeMb} MB
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <div className={cn(dependentDisabled && "opacity-45 pointer-events-none select-none transition-opacity duration-300")}>
        <SettingRowShell
          label="OCR for Handwritten Notes"
          description="Attempts to read image files and scanned PDFs. Slower and battery-intensive."
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.ocrEnabled)}
          disabled={dependentDisabled}
          trailing={(
            <Switch
              id={`setting-${INTELLIGENCE_SETTINGS_IDS.ocrEnabled}`}
              checked={ocrToggle}
              onCheckedChange={(nextValue) => setOcrEnabled(nextValue)}
              aria-label="OCR for handwritten notes"
              disabled={dependentDisabled}
              className="mt-1"
            />
          )}
        />

        <SettingRowShell
          label="Model Selection Mode"
          description="Auto picks the best model for your device. Manual lets you choose explicitly."
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.modelMode)}
          disabled={dependentDisabled}
          trailing={(
            <div className="w-full sm:w-48">
              <Select value={selectedMode} onValueChange={handleModelModeChange}>
                <SelectTrigger id={`setting-${INTELLIGENCE_SETTINGS_IDS.modelMode}`} className="h-10 w-full rounded-xl px-3.5 text-sm">
                  <SelectValue>{selectedMode === "auto" ? "Auto" : "Manual"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <SettingRowShell
          label="Embedding Model"
          description={selectedMode === "auto"
            ? `Auto selected: ${resolvedAutoModel?.label ?? "deciding…"}`
            : "Choose which model powers semantic search."}
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.modelId)}
          disabled={dependentDisabled}
          trailing={(
            <div className="w-full sm:w-56">
              <Select
                value={selectedModelId}
                onValueChange={handleEmbeddingModelChange}
                disabled={dependentDisabled || selectedMode !== "manual" || models.length === 0}
              >
                <SelectTrigger id={`setting-${INTELLIGENCE_SETTINGS_IDS.modelId}`} className="h-10 w-full rounded-xl px-3.5 text-sm">
                  <SelectValue>{selectedModel?.label ?? selectedModelId}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex items-center gap-2">
                        {model.label}
                        <span className="rounded-full border border-border/50 bg-muted/60 px-1.5 py-px text-[10px] text-muted-foreground">
                          {model.sizeMb} MB
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <AnimatePresence initial={false}>
          {showModelActivityPanel ? (
            <motion.div
              key="model-activity-panel"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-3.5 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Model Activity
                  </p>
                  <div className="flex items-center gap-1.5">
                    <RuntimeStatusBadge status={runtimeStatus} />
                    <RuntimeStatusBadge status={cleanupRuntimeStatus} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/70 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground">Semantic Search Model</span>
                      <span className="text-[10px] text-muted-foreground">
                        {semanticProgressLabel ?? (runtimeStatus === "loading" ? "Preparing…" : "Idle")}
                      </span>
                    </div>
                    <Progress
                      value={semanticProgressLabel ? embeddingDownloadPercent : null}
                      className="h-1.5"
                    />
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/70 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground">Cleanup Engine Model</span>
                      <span className="text-[10px] text-muted-foreground">
                        {cleanupProgressLabel ?? (cleanupRuntimeStatus === "loading" ? "Preparing…" : "Idle")}
                      </span>
                    </div>
                    <Progress
                      value={cleanupProgressLabel ? cleanupDownloadPercent : null}
                      className="h-1.5"
                    />
                  </div>
                </div>

                {modelActivityMessage ? (
                  <motion.p
                    key={modelActivityMessage}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={cn(
                      "mt-2 text-[11px]",
                      modelActivityTone === "success" && "text-emerald-700 dark:text-emerald-400",
                      modelActivityTone === "error" && "text-rose-700 dark:text-rose-400",
                      modelActivityTone === "info" && "text-muted-foreground",
                    )}
                  >
                    {modelActivityMessage}
                  </motion.p>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <SettingRowShell
          label="Search Balance"
          description={
            semanticWeightValue <= 20
              ? "Mostly keyword matching"
              : semanticWeightValue >= 80
                ? "Mostly meaning-based"
                : `${semanticWeightValue}% meaning-based, ${100 - semanticWeightValue}% keyword`
          }
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.semanticWeight)}
          disabled={dependentDisabled}
          trailing={(
            <div className="w-full sm:w-56">
              <Slider
                id={`setting-${INTELLIGENCE_SETTINGS_IDS.semanticWeight}`}
                min={0}
                max={100}
                step={1}
                value={semanticWeightValue}
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.currentTarget.value, 10);
                  if (Number.isFinite(nextValue)) {
                    setSemanticWeight(nextValue);
                  }
                }}
                disabled={dependentDisabled}
                aria-label="Search balance"
              />
            </div>
          )}
        />

        <SettingRowShell
          label="Duplicate Detection"
          description="Flags files that appear to be duplicates. Runs quietly in the background."
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.duplicateDetectionEnabled)}
          disabled={dependentDisabled}
          trailing={(
            <Switch
              id={`setting-${INTELLIGENCE_SETTINGS_IDS.duplicateDetectionEnabled}`}
              checked={duplicateToggle}
              onCheckedChange={(nextValue) => setDuplicateDetectionEnabled(nextValue)}
              aria-label="Duplicate Detection"
              disabled={dependentDisabled}
              className="mt-1"
            />
          )}
        />

        <SettingRowShell
          label="Search Index"
          description={
            catalogError
              ? catalogError
              : (
                <span className="flex items-center gap-2 flex-wrap">
                  <span>{indexStatusText}</span>
                  <RuntimeStatusBadge status={runtimeStatus} />
                </span>
              )
          }
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.clearIndex)}
          disabled={dependentDisabled}
          trailing={(
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs"
                    disabled={dependentDisabled}
                  >
                    Clear Index
                  </Button>
                }
              />
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear search index?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all local search data. Your files are not affected — the index will rebuild automatically next time you use Smart Search.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" className="rounded-xl" onClick={handleClearIndex}>
                    Clear Index
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        />
        <SettingRowShell
          label="Clear Model Cache"
          description={
            <span className="flex items-center gap-2 flex-wrap">
              <span>Delete downloaded language models (~{(selectedModel?.sizeMb ?? 0) + (selectedCleanupModel?.sizeMb ?? 0)} MB). They will re-download when needed.</span>
            </span>
          }
          icon={getSettingIcon(INTELLIGENCE_SETTINGS_IDS.clearModelCache)}
          disabled={dependentDisabled}
          trailing={(
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    disabled={dependentDisabled}
                  >
                    Clear Cache
                  </Button>
                }
              />
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear model cache?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all locally cached inference models. Next time you use Smart Search or OCR, they will be downloaded again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    className="rounded-xl"
                    onClick={() => void onDangerAction?.(INTELLIGENCE_SETTINGS_IDS.clearModelCache)}
                  >
                    Clear Cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        />
      </div>
    </>
  );
}

export const IntelligenceSettingsSection = memo(IntelligenceSettingsSectionComponent);
