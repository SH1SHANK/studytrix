"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Pin } from "lucide-react";

import type { SmartCollection } from "@/features/custom-folders/smart-collections.types";
import { SMART_COLLECTION_COLOURS } from "@/features/custom-folders/smart-collections.constants";
import { cn } from "@/lib/utils";

type SmartCollectionsShelfProps = {
  collections: SmartCollection[];
  onOpenCollection: (collectionId: string) => void;
  onPinCollection: (collectionId: string) => void;
  onDismissCollection: (collectionId: string) => void;
};

function triggerHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(15);
  }
}

export function SmartCollectionsShelf({
  collections,
  onOpenCollection,
  onPinCollection,
  onDismissCollection,
}: SmartCollectionsShelfProps) {
  const visibleCollections = collections.filter((collection) => !collection.dismissed);
  const [overlayCollectionId, setOverlayCollectionId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  if (visibleCollections.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 space-y-2">
      <header className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Brain className="size-3.5" />
        Smart Collections
      </header>

      <motion.div layout className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <AnimatePresence initial={false}>
          {visibleCollections.map((collection, index) => {
            const tone = SMART_COLLECTION_COLOURS[collection.colourIndex % SMART_COLLECTION_COLOURS.length] ?? "var(--card)";
            const isOverlayOpen = overlayCollectionId === collection.id;

            return (
              <motion.button
                layout
                key={collection.id}
                type="button"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 26,
                  delay: Math.min(index * 0.05, 0.25),
                }}
                className="relative h-20 w-[120px] shrink-0 overflow-hidden rounded-xl border border-border bg-card p-2.5 text-left"
                onPointerDown={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                  }

                  longPressTimerRef.current = window.setTimeout(() => {
                    triggerHaptic();
                    setOverlayCollectionId(collection.id);
                  }, 500);
                }}
                onPointerUp={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onPointerLeave={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onClick={() => {
                  if (isOverlayOpen) {
                    return;
                  }
                  onOpenCollection(collection.id);
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-foreground"
                    style={{ background: tone }}
                  >
                    {collection.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{collection.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{collection.fileCount} files</p>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isOverlayOpen ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/88 p-2"
                    >
                      <button
                        type="button"
                        className={cn(
                          "rounded-md border border-border bg-card px-2 py-1 text-xs font-medium",
                          collection.pinned ? "text-primary" : "text-foreground",
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPinCollection(collection.id);
                          setOverlayCollectionId(null);
                        }}
                      >
                        <span className="inline-flex items-center gap-1"><Pin className="size-3" />Pin</span>
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDismissCollection(collection.id);
                          setOverlayCollectionId(null);
                        }}
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
