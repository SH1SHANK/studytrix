"use client";

import { AnimatePresence, motion } from "framer-motion";
import { IconDownload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

export function DownloadFloatingIndicator() {
  const { activeCount, openDrawer } = useDownloadManager();

  return (
    <AnimatePresence>
      {activeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-live="polite"
          aria-atomic="true"
        >
          <Button
            type="button"
            variant="outline"
            onClick={openDrawer}
            aria-label={`Open downloads (${activeCount} active)`}
            className="gap-1.5 rounded-full border-sky-200 bg-card px-3 shadow-md dark:border-sky-800 bg-card"
          >
            <IconDownload className="size-4 text-sky-500" />
            <span className="text-xs font-semibold tabular-nums text-sky-600 dark:text-sky-400">
              {activeCount}
            </span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
