"use client";
import { useCallback, useState } from "react";
import { IconAlertTriangle, IconFolder, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";
import { cn } from "@/lib/utils";
import { StorageSetupSheet } from "./StorageSetupSheet";
export function StorageRelinkBanner() {
  const status = useStorageLocationStore((s) => s.status);
  const error = useStorageLocationStore((s) => s.error);
  const displayPath = useStorageLocationStore((s) => s.displayPath);
  const [dismissed, setDismissed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const shouldShow = status === "missing" && !dismissed;
  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);
  return (
    <>
      {" "}
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.97, filter: "blur(4px)" }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.97, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "relative flex items-start gap-3.5 rounded-2xl border px-4 py-3.5 shadow-sm backdrop-blur-xl transition-all",
                "border-amber-200/60 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-600 shadow-inner dark:bg-amber-900/40 dark:text-amber-400">
                <IconFolder className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-semibold tracking-tight text-amber-900 dark:text-amber-200">
                  Offline storage disconnected
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-amber-700/90 dark:text-amber-400/90">
                  {error?.message ??
                    "We lost access to your downloads folder. Please relink it to restore offline access."}
                  {displayPath && (
                    <span className="mt-1 block truncate text-[11px] font-medium text-amber-600/70 dark:text-amber-500/70">
                      Previous: {displayPath}
                    </span>
                  )}
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg bg-amber-500/10 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                    variant="ghost"
                    onClick={() => setSheetOpen(true)}
                  >
                    <IconAlertTriangle className="size-3.5" />
                    Relink Folder
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute right-2 top-2 rounded-full p-1.5 text-amber-500/70 transition-colors hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400/70 dark:hover:bg-amber-500/20 dark:hover:text-amber-300"
                aria-label="Dismiss message"
              >
                <IconX className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>{" "}
      <StorageSetupSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="relink"
      />{" "}
    </>
  );
}
