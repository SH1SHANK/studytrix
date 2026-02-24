"use client";

import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useSetting } from "@/ui/hooks/useSettings";
import { INTELLIGENCE_SETTINGS_IDS } from "@/features/intelligence/intelligence.constants";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";

function toMb(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.0";
  }

  return (value / (1024 * 1024)).toFixed(1);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function truncateFileName(value: string, max = 35): string {
  const normalized = value.trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, max - 1))}…`;
}

function ProgressBar({
  percent,
  indeterminate,
}: {
  percent: number;
  indeterminate?: boolean;
}) {
  return (
    <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
      {indeterminate ? (
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary/70"
          animate={{ x: ["-120%", "320%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${clampPercent(percent)}%` }}
        />
      )}
    </div>
  );
}

export function IntelligenceStatusBox() {
  const [semanticSearchEnabled] = useSetting(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled);

  const runtimeStatus = useIntelligenceStore((state) => state.runtimeStatus);
  const downloadProgress = useIntelligenceStore((state) => state.downloadProgress);
  const indexProgress = useIntelligenceStore((state) => state.indexProgress);
  const indexSize = useIntelligenceStore((state) => state.indexSize);
  const transientStatus = useIntelligenceStore((state) => state.transientStatus);
  const transientStatusCount = useIntelligenceStore((state) => state.transientStatusCount);
  const cancelDownload = useIntelligenceStore((state) => state.cancelDownload);
  const cancelIndexing = useIntelligenceStore((state) => state.cancelIndexing);

  const enabled = semanticSearchEnabled === true;

  const isDownloading = enabled && runtimeStatus === "loading" && downloadProgress !== null;
  const isIndexing = enabled && runtimeStatus === "indexing" && indexProgress !== null;
  const isCancelled = enabled && transientStatus === "cancelled";
  const isComplete = enabled && transientStatus === "complete";

  const shouldRender = isDownloading || isIndexing || isCancelled || isComplete;

  const totalIndexed = transientStatusCount > 0 ? transientStatusCount : indexSize;
  const indexingPercent = indexProgress && indexProgress.total > 0
    ? (indexProgress.processed / indexProgress.total) * 100
    : 0;

  const downloadKnownTotal = downloadProgress && downloadProgress.total > 0;
  const downloadPercent = downloadKnownTotal
    ? ((downloadProgress?.loaded ?? 0) / (downloadProgress?.total ?? 1)) * 100
    : 0;

  return (
    <AnimatePresence initial={false}>
      {shouldRender ? (
        <motion.div
          key="intelligence-status-box"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              opacity: { duration: 0.2, ease: "easeOut" },
              height: { type: "spring", stiffness: 360, damping: 34, mass: 0.8 },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              opacity: { duration: 0.18, ease: "easeInOut" },
              height: { duration: 0.18, ease: "easeInOut" },
            },
          }}
          className="overflow-hidden px-3 pt-2"
        >
          <div className="relative rounded-xl border border-border/50 bg-card px-3.5 py-2.5">
            <div className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary/70" />

            {isDownloading ? (
              <>
                <p className="text-xs font-medium text-foreground">🧠 Downloading AI model <span className="text-muted-foreground">(~34MB · once only)</span></p>
                <ProgressBar percent={downloadPercent} indeterminate={!downloadKnownTotal} />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    {downloadKnownTotal
                      ? `${toMb(downloadProgress.loaded)} MB of ${toMb(downloadProgress.total)} MB`
                      : `${toMb(downloadProgress?.loaded ?? 0)} MB downloaded`}
                  </p>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="h-5 rounded-md px-2"
                    onClick={cancelDownload}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : null}

            {isIndexing ? (
              <>
                <p className="text-xs font-medium text-foreground">📚 Indexing your library <span className="text-muted-foreground">(one-time setup)</span></p>
                <ProgressBar percent={indexingPercent} />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {indexProgress.processed} of {indexProgress.total} files
                    </p>
                    <p className="truncate text-[11px] text-foreground/85">
                      Currently: {truncateFileName(indexProgress.currentFileName || "Preparing files")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="h-5 rounded-md px-2"
                    onClick={() => {
                      void cancelIndexing();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : null}

            {isCancelled ? (
              <>
                <p className="text-xs font-medium text-foreground">⏸ Indexing paused · {totalIndexed} files indexed</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Smart search will use partial results.</p>
              </>
            ) : null}

            {isComplete ? (
              <p className="text-xs font-medium text-foreground">✓ Smart search ready · {totalIndexed} files indexed</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
