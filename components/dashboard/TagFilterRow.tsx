"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const tags = [
  { label: "All", color: "indigo" },
  { label: "PYQ", color: "indigo" },
  { label: "Notes", color: "blue" },
  { label: "Lab", color: "emerald" },
  { label: "Important", color: "rose" },
  { label: "Revision", color: "amber" },
] as const;

const activeColorMap: Record<string, string> = {
  indigo:
    "bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-sm dark:from-indigo-500 dark:to-indigo-400",
  blue: "bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-sm dark:from-blue-500 dark:to-blue-400",
  emerald:
    "bg-linear-to-r from-emerald-600 to-emerald-500 text-white shadow-sm dark:from-emerald-500 dark:to-emerald-400",
  rose: "bg-linear-to-r from-rose-600 to-rose-500 text-white shadow-sm dark:from-rose-500 dark:to-rose-400",
  amber:
    "bg-linear-to-r from-amber-600 to-amber-500 text-white shadow-sm dark:from-amber-500 dark:to-amber-400",
};

const hoverTintMap: Record<string, string> = {
  indigo: "hover:bg-stone-100 dark:hover:bg-stone-700",
  blue: "hover:bg-stone-100 dark:hover:bg-stone-700",
  emerald: "hover:bg-stone-100 dark:hover:bg-stone-700",
  rose: "hover:bg-stone-100 dark:hover:bg-stone-700",
  amber: "hover:bg-stone-100 dark:hover:bg-stone-700",
};

export function TagFilterRow() {
  const [activeTag, setActiveTag] = useState("All");

  return (
    <div className="flex gap-2 overflow-x-auto px-4 no-scrollbar">
      {tags.map((tag) => {
        const isActive = tag.label === activeTag;

        return (
          <Badge
            key={tag.label}
            render={
              <button type="button" onClick={() => setActiveTag(tag.label)} />
            }
            variant="secondary"
            className={cn(
              "h-9 shrink-0 cursor-pointer rounded-md px-3.5 text-xs font-medium tracking-tight transition-all duration-150 active:scale-[0.97]",
              isActive
                ? cn(activeColorMap[tag.color], "animate-tag-press")
                : cn(
                    "border border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400",
                    hoverTintMap[tag.color],
                  ),
            )}
          >
            {tag.label}
          </Badge>
        );
      })}
    </div>
  );
}
