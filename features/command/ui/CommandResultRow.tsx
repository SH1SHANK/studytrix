"use client";

import { HighlightedText } from "@/features/command/ui/HighlightedText";
import type { IntelligenceSearchHit } from "@/features/intelligence/intelligence.types";
import { cn } from "@/lib/utils";

type CommandResultRowProps = {
  hit: IntelligenceSearchHit;
  query: string;
  leftAccent?: boolean;
  subtitle?: string;
  onSelect: (hit: IntelligenceSearchHit) => void;
};

export function CommandResultRow({
  hit,
  query,
  leftAccent = false,
  subtitle,
  onSelect,
}: CommandResultRowProps) {
  const score = hit.semanticScore ?? hit.score;

  return (
    <button
      type="button"
      onClick={() => onSelect(hit)}
      className={cn(
        "flex w-full items-center gap-2 min-h-[52px] rounded-lg border border-border/60 px-2.5 py-2 text-left",
        leftAccent ? "border-l-[3px] border-l-[hsl(var(--primary)/0.08)]" : "border-l-transparent",
      )}
    >
      <div className="min-w-0 basis-[60%] flex-1">
        <div className="truncate text-[12px] font-medium">
          <HighlightedText text={hit.name ?? hit.id} query={query} />
        </div>
        <div className="truncate text-[10px] text-muted-foreground">
          <HighlightedText text={subtitle ?? hit.fullPath ?? ""} query={query} />
        </div>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/8 px-1.5 py-0.5 text-[9px] text-primary">
          {score.toFixed(2)}
        </span>
      ) : null}
    </button>
  );
}
