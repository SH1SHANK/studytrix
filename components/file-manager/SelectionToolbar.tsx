"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconLoader2, IconShare, IconTag, IconX } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { useSelectionStore } from "@/features/selection/selection.store";
import { resolveAllFiles } from "@/features/bulk/bulk.service";
import type { ResolvedSelection } from "@/features/bulk/bulk.types";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { BulkShareDialog } from "@/components/share/BulkShareDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export function SelectionToolbar() {
  const { selectedIds, isSelectionMode, contextItems, clearSelection } = useSelectionStore(
    useShallow((state) => ({
      selectedIds: state.selectedIds,
      isSelectionMode: state.isSelectionMode,
      contextItems: state.contextItems,
      clearSelection: state.clearSelection,
    })),
  );
  const count = selectedIds.size;
  const isVisible = isSelectionMode || count > 0;

  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState({ done: 0, total: 0 });
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [resolvedSelection, setResolvedSelection] = useState<ResolvedSelection | null>(null);
  const [isBulkShareOpen, setIsBulkShareOpen] = useState(false);

  const progressLabel = useMemo(() => {
    const total = Math.max(prepareProgress.total, count);
    const done = Math.min(prepareProgress.done, total);
    return `${done} / ${total} selected items`;
  }, [count, prepareProgress.done, prepareProgress.total]);

  const handleShare = useCallback(async () => {
    if (count === 0) {
      return;
    }

    setPrepareError(null);
    setPrepareProgress({ done: 0, total: count });
    setIsPreparingShare(true);

    try {
      const resolved = await resolveAllFiles(
        new Set(selectedIds),
        contextItems,
        (done, total) => {
          setPrepareProgress({ done, total });
        },
      );

      if (resolved.files.length === 0) {
        throw new Error("No shareable files found in the selected items.");
      }

      setResolvedSelection(resolved);
      setIsBulkShareOpen(true);
    } catch (error) {
      setPrepareError(
        error instanceof Error
          ? error.message
          : "Failed to prepare selected items for sharing.",
      );
    } finally {
      setIsPreparingShare(false);
    }
  }, [contextItems, count, selectedIds]);

  const handleTags = useCallback(() => {
    const targetEntities = Array.from(selectedIds).map((id) => ({
      id,
      type: "file" as const,
    }));

    useTagAssignmentStore.getState().openDrawer(targetEntities);
  }, [selectedIds]);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border/80 bg-card/90 p-2 shadow-xl backdrop-blur-xl"
          >
            <div className="flex h-10 items-center gap-2 rounded-xl bg-indigo-50 px-3 text-sm font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <span className="flex size-5 items-center justify-center rounded-sm bg-indigo-600 text-xs text-primary-foreground dark:bg-indigo-500">
                {count}
              </span>
              Selected
            </div>

            <div className="h-6 w-px bg-muted" />

            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-2 rounded-xl text-muted-foreground hover:bg-muted"
              onClick={() => void handleShare()}
              disabled={count === 0 || isPreparingShare}
            >
              {isPreparingShare ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconShare className="size-4" />
              )}
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-2 rounded-xl text-muted-foreground hover:bg-muted"
              onClick={handleTags}
              disabled={count === 0 || isPreparingShare}
            >
              <IconTag className="size-4" />
              <span className="hidden sm:inline">Tags</span>
            </Button>

            <div className="h-6 w-px bg-muted" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear selection"
            >
              <IconX className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={isPreparingShare || prepareError !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isPreparingShare) {
            setPrepareError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isPreparingShare}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isPreparingShare ? <IconLoader2 className="size-4 animate-spin" /> : null}
              {isPreparingShare ? "Preparing Selection" : "Couldn’t Prepare Selection"}
            </DialogTitle>
            <DialogDescription>
              {isPreparingShare
                ? "Resolving selected files and nested folders before sharing."
                : prepareError}
            </DialogDescription>
          </DialogHeader>

          {isPreparingShare ? (
            <div className="space-y-2">
              <Progress value={prepareProgress.done} max={prepareProgress.total || count || 1} />
              <p className="text-center text-xs text-muted-foreground">{progressLabel}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <BulkShareDialog
        open={isBulkShareOpen}
        onOpenChange={(nextOpen) => {
          setIsBulkShareOpen(nextOpen);
          if (!nextOpen) {
            setResolvedSelection(null);
          }
        }}
        selection={resolvedSelection}
        onComplete={() => {
          clearSelection();
          setResolvedSelection(null);
        }}
      />
    </>
  );
}
