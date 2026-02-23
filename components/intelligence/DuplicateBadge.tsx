"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";

interface DuplicateBadgeProps {
  duplicateOf: string;
  onCompare?: (duplicateOf: string) => void;
  className?: string;
}

function DuplicateBadgeComponent({ duplicateOf, onCompare, className }: DuplicateBadgeProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onCompare?.(duplicateOf);
      }}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300",
        className,
      )}
      aria-label="Possible duplicate file. Tap to compare."
    >
      ⚠ Possible duplicate
    </button>
  );
}

export const DuplicateBadge = memo(DuplicateBadgeComponent);
