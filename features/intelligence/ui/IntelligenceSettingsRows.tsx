"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IndexStatsSheet } from "@/features/intelligence/ui/IndexStatsSheet";
import { SettingRowShell } from "@/features/settings/ui/SettingCardShell";
import { getSettingIcon } from "@/features/settings/ui/setting-icons";
import {
  DEFAULT_MODEL_ID,
  INTELLIGENCE_LEARN_MORE_PATH,
} from "@/features/intelligence/intelligence.constants";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "Never";
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type IntelligenceIndexStatusRowProps = {
  onAction?: (id: string) => Promise<void> | void;
  onDangerAction?: (id: string) => Promise<void> | void;
};

export function IntelligenceIndexStatusRow({ onAction, onDangerAction }: IntelligenceIndexStatusRowProps) {
  const indexSize = useIntelligenceStore((state) => state.indexSize);
  const indexLastCompletedAt = useIntelligenceStore((state) => state.indexLastCompletedAt);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"rebuild" | "clear" | null>(null);

  const description = useMemo(
    () => `${indexSize} files indexed · Last updated ${formatRelativeTime(indexLastCompletedAt)}`,
    [indexLastCompletedAt, indexSize],
  );

  return (
    <>
      <SettingRowShell
        label="Index Status"
        description={description}
        icon={getSettingIcon("semantic_search_index_status")}
        onClick={() => setSheetOpen(true)}
      />

      <IndexStatsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRebuildIndex={() => setConfirmAction("rebuild")}
        onClearIndex={() => setConfirmAction("clear")}
      />

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => {
        if (!open) {
          setConfirmAction(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "rebuild" ? "Rebuild search index?" : "Clear search index?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "rebuild"
                ? "This will clear current vectors, scan your repositories again, and rebuild from scratch."
                : "This deletes the local search index. Smart search will stop working until you rebuild."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (confirmAction === "rebuild") {
                  void onAction?.("semantic_search_rebuild_index");
                } else {
                  void onDangerAction?.("semantic_search_clear_index");
                }
                setConfirmAction(null);
                setSheetOpen(false);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function IntelligenceModelStatusRow() {
  const modelDownloaded = useIntelligenceStore((state) => state.modelDownloaded);
  const activeModelId = useIntelligenceStore((state) => state.activeModelId);

  const modelLabel = activeModelId ?? DEFAULT_MODEL_ID;

  return (
    <SettingRowShell
      label="Model Status"
      description={`${modelLabel.split("/").pop() ?? modelLabel} · ${modelDownloaded ? "Downloaded" : "Not downloaded"}`}
      icon={getSettingIcon("semantic_search_model_status")}
    />
  );
}

type IntelligenceRemoveModelRowProps = {
  onDangerAction?: (id: string) => Promise<void> | void;
};

export function IntelligenceRemoveModelRow({ onDangerAction }: IntelligenceRemoveModelRowProps) {
  const modelDownloaded = useIntelligenceStore((state) => state.modelDownloaded);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!modelDownloaded) {
    return null;
  }

  return (
    <>
      <SettingRowShell
        label="Remove Model"
        description="Delete the downloaded AI model to free ~34MB of storage."
        tone="danger"
        icon={getSettingIcon("semantic_search_remove_model")}
        onClick={() => setConfirmOpen(true)}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove downloaded model?</AlertDialogTitle>
            <AlertDialogDescription>
              Smart Search model files will be deleted. Semantic search will need to download the model again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void onDangerAction?.("semantic_search_remove_model");
                setConfirmOpen(false);
              }}
            >
              Remove Model
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function IntelligenceLearnMoreRow() {
  const router = useRouter();

  return (
    <SettingRowShell
      label="Learn how Smart Search works"
      description="Open a detailed explanation of semantic ranking and indexing."
      icon={getSettingIcon("semantic_search_learn_more")}
      onClick={() => router.push(INTELLIGENCE_LEARN_MORE_PATH)}
    />
  );
}

export function IntelligenceExperimentalNoticeRow() {
  return (
    <SettingRowShell
      label="Smart Search is experimental."
      description="Results may be inaccurate."
      icon={getSettingIcon("semantic_search_experimental_notice")}
    />
  );
}
