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
            className="rounded-sm bg-linear-to-r from-indigo-500/35 to-cyan-500/35 px-0.5 font-semibold text-stone-900 ring-1 ring-indigo-400/40 transition-colors dark:text-stone-100 dark:ring-indigo-300/30"
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
