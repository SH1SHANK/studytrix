"use client";

import { AnimatePresence, motion } from "framer-motion";
import { IconShare, IconTag, IconX } from "@tabler/icons-react";
import { useSelectionStore } from "@/features/selection/selection.store";
import { Button } from "@/components/ui/button";
import { shareNativeFile } from "@/features/share/share.service";
import { useTagStore } from "@/features/tags/tag.store";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { useShallow } from "zustand/react/shallow";

export function SelectionToolbar() {
  const { selectedIds, isSelectionMode, clearSelection } = useSelectionStore(
    useShallow((state) => ({
      selectedIds: state.selectedIds,
      isSelectionMode: state.isSelectionMode,
      clearSelection: state.clearSelection,
    })),
  );

  const count = selectedIds.size;
  const isVisible = isSelectionMode || count > 0;

  const handleShare = async () => {
    // Collect specific URLs if needed. For now, we will just share a generic link or rely on the Native File Share.
    // In a real bulk share, we might zip it or share a folder link.
    // We'll leave it as a placeholder to map over selected IDs.
    const url = window.location.href; 
    await shareNativeFile(url, "Shared from Attendrix", "Check out these files on Attendrix");
    clearSelection();
  };

  const handleTags = () => {
    const targetEntities = Array.from(selectedIds).map((id) => {
      // For a real implementation, we might need to know if the ID is a folder or file.
      // But since tag rules apply the same to both on the generic API side, 
      // we default to "file" since that is overwhelmingly more common, and backend validation handles it.
      return { id, type: "file" as const };
    });
    
    useTagAssignmentStore.getState().openDrawer(targetEntities);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-stone-200/50 bg-white/90 p-2 shadow-xl shadow-stone-900/10 backdrop-blur-xl dark:border-stone-800/80 dark:bg-stone-900/90 dark:shadow-black/40"
        >
          <div className="flex h-10 items-center gap-2 rounded-xl bg-indigo-50 px-3 text-sm font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <span className="flex size-5 items-center justify-center rounded-sm bg-indigo-600 text-xs text-white dark:bg-indigo-500">
              {count}
            </span>
            Selected
          </div>

          <div className="h-6 w-px bg-stone-200 dark:bg-stone-800" />

          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 rounded-xl text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            onClick={handleShare}
            disabled={count === 0}
          >
            <IconShare className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 rounded-xl text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            onClick={handleTags}
            disabled={count === 0}
          >
            <IconTag className="size-4" />
            <span className="hidden sm:inline">Tags</span>
          </Button>

          <div className="h-6 w-px bg-stone-200 dark:bg-stone-800" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            className="rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label="Clear selection"
          >
            <IconX className="size-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
