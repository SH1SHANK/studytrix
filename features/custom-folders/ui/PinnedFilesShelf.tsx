"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { File, FileImage, FileSpreadsheet, FileText, Pin } from "lucide-react";

import { cn } from "@/lib/utils";

type PinnedFileView = {
  id: string;
  name: string;
  sourceLabel: string;
  mimeType?: string;
};

type PinnedFilesShelfProps = {
  pinnedFileIds: string[];
  filesById: Map<string, PinnedFileView>;
  onUnpin: (fileId: string) => void;
  onReorder: (ids: string[]) => void;
};

function resolveFileIcon(mimeType: string | undefined) {
  if (!mimeType) {
    return File;
  }

  if (mimeType.startsWith("image/")) {
    return FileImage;
  }

  if (
    mimeType.includes("sheet")
    || mimeType.includes("excel")
    || mimeType.includes("csv")
  ) {
    return FileSpreadsheet;
  }

  if (mimeType.startsWith("text/") || mimeType.includes("document") || mimeType.includes("pdf")) {
    return FileText;
  }

  return File;
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(15);
  }
}

export function PinnedFilesShelf({
  pinnedFileIds,
  filesById,
  onUnpin,
  onReorder,
}: PinnedFilesShelfProps) {
  const [overlayFileId, setOverlayFileId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const visibleIds = useMemo(
    () => pinnedFileIds.filter((id) => filesById.has(id)),
    [filesById, pinnedFileIds],
  );

  if (visibleIds.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 space-y-2">
      <header className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Pin className="size-3.5" />
        Pinned
      </header>

      <Reorder.Group
        axis="x"
        values={visibleIds}
        onReorder={onReorder}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {visibleIds.map((fileId) => {
          const file = filesById.get(fileId);
          if (!file) {
            return null;
          }

          const Icon = resolveFileIcon(file.mimeType);
          const isOverlayOpen = overlayFileId === file.id;

          return (
            <Reorder.Item
              key={file.id}
              value={file.id}
              className="list-none"
              whileDrag={{ scale: 1.03, zIndex: 20 }}
              dragElastic={0.1}
              dragMomentum={false}
            >
              <motion.button
                layout
                type="button"
                className="relative h-20 w-[120px] shrink-0 overflow-hidden rounded-xl border border-border bg-card p-2.5 text-left"
                onPointerDown={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                  }
                  longPressTimerRef.current = window.setTimeout(() => {
                    triggerHaptic();
                    setOverlayFileId(file.id);
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
              >
                <div className="flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{file.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{file.sourceLabel}</p>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isOverlayOpen ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "absolute inset-0 z-10 flex items-center justify-center bg-background/88 p-2",
                      )}
                    >
                      <button
                        type="button"
                        className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          onUnpin(file.id);
                          setOverlayFileId(null);
                        }}
                      >
                        Unpin
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </section>
  );
}
