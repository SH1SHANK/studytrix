"use client";

import { BookOpenCheck } from "lucide-react";

import type { StudySet } from "@/features/custom-folders/study-sets.store";

type StudySetsShelfProps = {
  sets: StudySet[];
  onOpenSet: (setId: string) => void;
};

export function StudySetsShelf({ sets, onOpenSet }: StudySetsShelfProps) {
  if (sets.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 space-y-2">
      <header className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <BookOpenCheck className="size-3.5" />
        Study Sets
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {sets.map((setItem) => (
          <button
            key={setItem.id}
            type="button"
            onClick={() => onOpenSet(setItem.id)}
            className="h-20 w-[120px] shrink-0 rounded-xl border border-border bg-card p-2.5 text-left"
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-0.5 inline-flex size-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: setItem.colour }}
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-foreground">{setItem.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{setItem.fileIds.length} files</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
