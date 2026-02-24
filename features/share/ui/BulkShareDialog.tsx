"use client";

import { useCallback, useState, type ComponentType } from "react";
import { IconAlertTriangle, IconArchive, IconLoader2, IconShare } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { bulkShare } from "@/features/bulk/bulk.share";
import type { BulkShareMode, ResolvedSelection } from "@/features/bulk/bulk.types";
import { formatFileSize } from "@/features/drive/drive.types";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";

type BulkShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: ResolvedSelection | null;
  onComplete?: () => void;
};

type DialogPhase = "choose" | "processing";

type ModeCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
};

function ModeCard({ icon: Icon, title, description, onClick, disabled }: ModeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        "border-border bg-card hover:border-indigo-300 hover:bg-indigo-50/40",
        "dark:border-border dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}

export function BulkShareDialog({
  open,
  onOpenChange,
  selection,
  onComplete,
}: BulkShareDialogProps) {
  const gateDownloadRisk = useDownloadRiskGate();
  const [phase, setPhase] = useState<DialogPhase>("choose");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (phase === "processing") return;
    setPhase("choose");
    setProgress({ done: 0, total: 0 });
    setErrorMessage(null);
    onOpenChange(false);
  }, [phase, onOpenChange]);

  const handleShare = useCallback(
    async (mode: BulkShareMode) => {
      if (!selection || selection.files.length === 0) return;

      const proceed = await gateDownloadRisk(
        selection.files.map((file) => ({
          id: file.id,
          name: file.name,
          sizeBytes: file.size,
          kind: "file",
        })),
        {
          actionLabel: mode === "zip" ? "zip preparation" : "file sharing",
          confirmButtonLabel: mode === "zip" ? "Prepare ZIP" : "Continue Sharing",
        },
      );
      if (!proceed) {
        return;
      }

      setErrorMessage(null);
      setPhase("processing");
      setProgress({ done: 0, total: selection.files.length });

      try {
        const summary = await bulkShare(selection.files, mode, (done, total) => {
          setProgress({ done, total });
        });

        if (summary.failedFiles.length > 0) {
          const failedPreview = summary.failedFiles.slice(0, 3).join(", ");
          const moreCount = summary.failedFiles.length - Math.min(summary.failedFiles.length, 3);
          setErrorMessage(
            moreCount > 0
              ? `${summary.failedFiles.length} files could not be included (${failedPreview} and ${moreCount} more).`
              : `${summary.failedFiles.length} files could not be included (${failedPreview}).`,
          );
          setPhase("choose");
          setProgress({ done: 0, total: 0 });
          return;
        }

        setPhase("choose");
        setProgress({ done: 0, total: 0 });
        onOpenChange(false);
        onComplete?.();
      } catch (error) {
        setPhase("choose");
        setProgress({ done: 0, total: 0 });
        setErrorMessage(
          error instanceof Error ? error.message : "Could not prepare files for sharing.",
        );
      }
    },
    [gateDownloadRisk, selection, onOpenChange, onComplete],
  );

  if (!selection) return null;

  const { files, totalSize, hasLargeFiles, largeFileCount, largeFiles } = selection;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" showCloseButton={phase !== "processing"}>
        <AnimatePresence mode="wait">
          {phase === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconLoader2 className="size-4 animate-spin" />
                  Preparing Files…
                </DialogTitle>
                <DialogDescription>
                  Please wait while your files are being prepared for sharing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Progress value={progress.done} max={progress.total || 1} />
                <p className="text-center text-xs text-muted-foreground">
                  {progress.done} / {progress.total} files
                </p>
              </div>
            </motion.div>
          )}

          {phase === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Share {files.length} Files</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground/90">
                    {files.length} file{files.length > 1 ? "s" : ""}
                  </span>{" "}
                  selected ({formatFileSize(totalSize)} total)
                </DialogDescription>
              </DialogHeader>

              {hasLargeFiles && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <IconAlertTriangle className="size-3.5 shrink-0" />
                    {largeFileCount} large file{largeFileCount > 1 ? "s" : ""} detected (over 25 MB)
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-600 dark:text-amber-500">
                    These files may take longer to download or share depending on your connection speed.
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {largeFiles.slice(0, 5).map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-500"
                      >
                        <span className="mr-2 truncate">{file.name}</span>
                        <span className="shrink-0 font-medium">{formatFileSize(file.size)}</span>
                      </li>
                    ))}
                    {largeFiles.length > 5 && (
                      <li className="text-[10px] text-amber-500">+{largeFiles.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {errorMessage ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400">
                  {errorMessage}
                </div>
              ) : null}

              <div className="space-y-2">
                <ModeCard
                  icon={IconArchive}
                  title="Download as ZIP"
                  description="Bundle all files into a single .zip archive for easy sharing."
                  onClick={() => void handleShare("zip")}
                />
                <ModeCard
                  icon={IconShare}
                  title="Share Individually"
                  description="Share files one at a time via your device's share sheet."
                  onClick={() => void handleShare("individual")}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
