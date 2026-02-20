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
        {" "}
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {" "}
            <div
              className={cn(
                "relative flex items-start gap-3 rounded-xl border px-4 py-3",
                "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20",
              )}
            >
              {" "}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                {" "}
                <IconFolder className="size-4" />{" "}
              </div>{" "}
              <div className="min-w-0 flex-1">
                {" "}
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {" "}
                  Offline folder disconnected{" "}
                </p>{" "}
                <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                  {" "}
                  {error?.message ??
                    "We couldn't access your previous offline storage folder."}{" "}
                  {displayPath && (
                    <span className="mt-0.5 block text-xs text-amber-600/80 dark:text-amber-500/80">
                      {" "}
                      Previous location: {displayPath}{" "}
                    </span>
                  )}{" "}
                </p>{" "}
                <div className="mt-2 flex items-center gap-2">
                  {" "}
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setSheetOpen(true)}
                  >
                    {" "}
                    <IconAlertTriangle className="size-3" /> Relink Folder{" "}
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute right-2 top-2 rounded-md p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300"
                aria-label="Dismiss"
              >
                {" "}
                <IconX className="size-3.5" />{" "}
              </button>{" "}
            </div>{" "}
          </motion.div>
        )}{" "}
      </AnimatePresence>{" "}
      <StorageSetupSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="relink"
      />{" "}
    </>
  );
}
