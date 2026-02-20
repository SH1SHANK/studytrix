"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  IconCheck,
  IconLoader2,
  IconPlus,
  IconTag,
  IconX,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTagStore } from "@/features/tags/tag.store";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { getTagChipTextColor } from "@/features/tags/tag.filter";

export function AssignTagsDrawer() {
  const { isOpen, targetEntities, closeDrawer } = useTagAssignmentStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      targetEntities: state.targetEntities,
      closeDrawer: state.closeDrawer,
    })),
  );

  const { tags, assignments, assignTag, removeTagFromEntity, addTag } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
      assignTag: state.assignTag,
      removeTagFromEntity: state.removeTagFromEntity,
      addTag: state.addTag,
    })),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingIndex, setIsCreatingIndex] = useState(false);

  // Compute stats for each tag based on the target entities
  const tagStats = useMemo(() => {
    const stats: Record<string, { assignedCount: number }> = {};
    for (const tag of tags) {
      stats[tag.id] = { assignedCount: 0 };
    }

    if (targetEntities.length === 0) return stats;

    for (const entity of targetEntities) {
      const assignment = assignments[entity.id];
      if (!assignment) continue;
      
      for (const tagId of assignment.tagIds) {
        if (stats[tagId]) {
          stats[tagId].assignedCount += 1;
        }
      }
    }

    return stats;
  }, [assignments, tags, targetEntities]);

  const filteredTags = useMemo(() => {
    let sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sorted = sorted.filter((t) => t.name.toLowerCase().includes(q));
    }
    return sorted;
  }, [tags, searchQuery]);

  const toggleTag = async (tagId: string) => {
    const stat = tagStats[tagId];
    if (!stat) return;

    // If it's assigned to ALL targets, remove from ALL.
    // Otherwise, assign to ALL.
    const isAssignedToAll = stat.assignedCount === targetEntities.length;

    await Promise.all(
      targetEntities.map(async (entity) => {
        if (isAssignedToAll) {
          // It's checked, so uncheck it
          await removeTagFromEntity(entity.id, tagId).catch(() => {});
        } else {
          // It's unchecked or indeterminate, check it
          await assignTag(entity.id, tagId, entity.type).catch(() => {});
        }
      })
    );
  };

  const createAndAssignTag = async () => {
    if (!searchQuery.trim() || isCreatingIndex) return;
    setIsCreatingIndex(true);
    try {
      // Pick a random color from the palette to speed up workflow
      const palette = ["#2563EB", "#16A34A", "#EA580C", "#DC2626", "#7C3AED", "#0891B2"];
      const color = palette[Math.floor(Math.random() * palette.length)];
      
      const newTag = await addTag(searchQuery.trim(), color);
      
      // Instantly assign to all targets
      await Promise.all(
        targetEntities.map((entity) =>
          assignTag(entity.id, newTag.id, entity.type).catch(() => {})
        )
      );
      
      setSearchQuery("");
    } finally {
      setIsCreatingIndex(false);
    }
  };

  if (!isOpen) return null;

  const targetCount = targetEntities.length;
  const targetLabel = targetCount === 1 ? "1 item" : `${targetCount} items`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-stone-200/50 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-stone-800/80 dark:bg-stone-950/95 translate-x-0 translate-y-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <IconTag className="size-5" />
            </span>
            <div className="flex flex-col text-left">
              <span className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Assign Tags
              </span>
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Editing {targetLabel}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2">
          <Input
            autoFocus
            placeholder="Search or create a tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredTags.length === 0) {
                e.preventDefault();
                void createAndAssignTag();
              }
            }}
            className="h-12 rounded-xl border-stone-200 bg-stone-50/50 shadow-inner focus-visible:ring-indigo-500/50 dark:border-stone-800 dark:bg-stone-900/50"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-6 pt-2">
          {filteredTags.length === 0 && searchQuery.trim() && (
            <button
              onClick={() => void createAndAssignTag()}
              disabled={isCreatingIndex}
              className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-900"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                {isCreatingIndex ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconPlus className="size-4" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  Create "{searchQuery.trim()}"
                </span>
                <span className="text-xs text-stone-500">
                  Press enter or click to create and assign
                </span>
              </div>
            </button>
          )}

          {filteredTags.map((tag) => {
            const stat = tagStats[tag.id] ?? { assignedCount: 0 };
            const isAssignedToAll = stat.assignedCount === targetCount;
            const isAssignedToSome = stat.assignedCount > 0 && stat.assignedCount < targetCount;
            const chipTextColor = getTagChipTextColor(tag.color);

            return (
              <button
                key={tag.id}
                onClick={() => void toggleTag(tag.id)}
                className="group flex w-full items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none dark:hover:bg-stone-800/60 dark:focus-visible:bg-stone-800/60"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex size-8 items-center justify-center rounded-lg border border-stone-200/50 bg-white transition-colors dark:border-stone-700/50 dark:bg-stone-900">
                    {isAssignedToAll ? (
                      <IconCheck className="size-5 text-indigo-600 dark:text-indigo-400" />
                    ) : isAssignedToSome ? (
                      <div className="h-1 w-3 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                    ) : (
                      <div className="size-5 rounded-md border-2 border-stone-300 transition-colors group-hover:border-stone-400 dark:border-stone-600 dark:group-hover:border-stone-500" />
                    )}
                  </div>
                  <span
                    className="inline-flex items-center rounded-full border border-black/10 px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: tag.color, color: chipTextColor }}
                  >
                    {tag.name}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredTags.length === 0 && !searchQuery.trim() && (
            <div className="flex h-full flex-col items-center justify-center text-center text-stone-500 dark:text-stone-400">
              <IconTag className="mb-2 size-8 opacity-20" />
              <p className="text-sm font-medium">No tags found</p>
              <p className="text-xs">Create semantic tags to organize your files</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
