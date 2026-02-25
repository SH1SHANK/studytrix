"use client";

import { AnimatePresence, motion } from "framer-motion";

type TagSuggestionRowProps = {
  tags: string[];
  onAccept: (tag: string) => void;
  onDismissAll: () => void;
};

function triggerHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
}

export function TagSuggestionRow({ tags, onAccept, onDismissAll }: TagSuggestionRowProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Suggested tags:</span>
          {tags.map((tag) => (
            <motion.button
              key={tag}
              type="button"
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[11px] font-medium"
              onClick={() => {
                triggerHaptic();
                onAccept(tag);
              }}
            >
              {tag}
              <span aria-hidden="true">✓</span>
            </motion.button>
          ))}
          <button
            type="button"
            onClick={onDismissAll}
            className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Dismiss all
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

