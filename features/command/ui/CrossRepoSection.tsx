"use client";

import { FolderHeart } from "lucide-react";

import { CommandResultRow } from "@/features/command/ui/CommandResultRow";
import type { IntelligenceSearchHit } from "@/features/intelligence/intelligence.types";

type CrossRepoSectionProps = {
  results: IntelligenceSearchHit[];
  query: string;
  onSelect: (hit: IntelligenceSearchHit) => void;
  resolveSubtitle?: (hit: IntelligenceSearchHit) => string;
};

export function CrossRepoSection({
  results,
  query,
  onSelect,
  resolveSubtitle,
}: CrossRepoSectionProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section aria-label="Results from your Personal Repository" className="px-1 pb-1">
      <div className="my-2 h-px bg-border/80" />
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
        <FolderHeart className="size-3.5" />
        <span>Also in Personal Repository</span>
      </div>

      <div className="space-y-1">
        {results.map((hit) => (
          <CommandResultRow
            key={`cross-repo-row-${hit.id}`}
            hit={hit}
            query={query}
            leftAccent
            subtitle={resolveSubtitle?.(hit)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
