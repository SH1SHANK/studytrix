"use client";

import { IconTag } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import type { FilterMode } from "@/features/tags/tag.types";
import { getTagChipTextColor } from "@/features/tags/tag.filter";

export type DashboardTagFilterOption = {
  id: string;
  label: string;
  color: string;
  uses: number;
  count: number;
};

type TagFilterRowProps = {
  options: readonly DashboardTagFilterOption[];
  activeTagIds: readonly string[];
  filterMode: FilterMode;
  onToggleTag: (tagId: string) => void;
  onFilterModeChange: (mode: FilterMode) => void;
  onClearFilters: () => void;
};

export function TagFilterRow({
  options,
  activeTagIds,
  onToggleTag,
}: TagFilterRowProps) {
  const activeSet = new Set(activeTagIds);

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
      {options.length > 0 ? (
        options.map((option) => {
          const isActive = activeSet.has(option.id);
          const textColor = getTagChipTextColor(option.color);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggleTag(option.id)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all duration-150 active:scale-[0.97]",
                isActive
                  ? "border-transparent shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
              style={
                isActive
                  ? { backgroundColor: option.color, color: textColor }
                  : undefined
              }
              aria-pressed={isActive}
            >
              <IconTag className="size-3" />
              {option.label}
            </button>
          );
        })
      ) : (
        <p className="py-1 text-xs text-muted-foreground/80">
          No tags yet
        </p>
      )}
    </div>
  );
}
