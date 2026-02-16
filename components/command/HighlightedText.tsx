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
    <>
      {segments.map((seg, i) =>
        seg.matched ? (
          <span
            key={i}
            className="bg-indigo-200/60 dark:bg-indigo-800/60 rounded-sm px-0.5"
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
