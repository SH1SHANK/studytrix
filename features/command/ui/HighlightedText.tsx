"use client";

import { useMemo } from "react";
import { highlightText } from "@/features/command/highlight";

interface HighlightedTextProps {
  text: string;
  query: string;
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const segments = useMemo(() => highlightText(text, query), [text, query]);

  return (
    <span className="inline">
      {segments.map((seg, i) =>
        seg.matched ? (
          <span
            key={i}
            className="rounded-sm bg-primary/20 px-0.5 font-semibold text-foreground ring-1 ring-ring/35 transition-colors"
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
