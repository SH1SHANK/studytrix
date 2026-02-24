"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconArchive,
  IconCloudDown,
  IconDownload,
  IconLoader2,
  IconShare,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { useSelectionStore } from "@/features/selection/selection.store";
import { computeTotalSize, resolveAllFiles } from "@/features/bulk/bulk.service";
import { downloadAsZip } from "@/features/bulk/bulk.share";
import { makeFilesOffline } from "@/features/bulk/bulk.offline";
import type { ResolvedSelection } from "@/features/bulk/bulk.types";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { deleteOfflineRecords } from "@/features/storage/storage.service";
import { BulkShareDialog } from "@/features/share/ui/BulkShareDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

const ZIP_LIMIT_BYTES = 500 * 1024 * 1024;

type ToolbarAction =
  | "download"
  | "offline"
  | "share"
  | "tags"
  | "zip"
  | "delete"
  | null;

function ActionButton({
  label,
  icon,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-10 rounded-xl px-2.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {loading ? <IconLoader2 className="size-4 animate-spin" /> : icon}
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}

export function SelectionToolbar() {
  const { selectedIds, isSelectionMode, contextItems, clearSelection } = useSelectionStore(
    useShallow((state) => ({
      selectedIds: state.selectedIds,
      isSelectionMode: state.isSelectionMode,
      contextItems: state.contextItems,
      clearSelection: state.clearSelection,
    })),
  );
  const count = selectedIds.size;
  const isVisible = isSelectionMode || count > 0;

  const { startDownload, openDrawer } = useDownloadManager();

  const [activeAction, setActiveAction] = useState<ToolbarAction>(null);
  const [prepareProgress, setPrepareProgress] = useState({ done: 0, total: 0, label: "Preparing selection..." });
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [resolvedSelection, setResolvedSelection] = useState<ResolvedSelection | null>(null);
  const [isBulkShareOpen, setIsBulkShareOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<Array<{ id: string; name: string }>>([]);

  const totalKnownBytes = useMemo(() => {
    const selected = contextItems.filter((item) => selectedIds.has(item.id));
    return computeTotalSize(selected);
  }, [contextItems, selectedIds]);

  const zipDisabled = totalKnownBytes > ZIP_LIMIT_BYTES;

  const resolveSelection = useCallback(async () => {
    const total = Math.max(1, count);
    setPrepareProgress({ done: 0, total, label: "Resolving selected files..." });
    return await resolveAllFiles(new Set(selectedIds), contextItems, (done, all) => {
      setPrepareProgress({ done, total: all || total, label: "Resolving selected files..." });
    });
  }, [contextItems, count, selectedIds]);

  const handleShare = useCallback(async () => {
    if (count === 0) {
      return;
    }

    setPrepareError(null);
    setActiveAction("share");
    try {
      const resolved = await resolveSelection();
      if (resolved.files.length === 0) {
        throw new Error("No shareable files found in the selected items.");
      }
      setResolvedSelection(resolved);
      setIsBulkShareOpen(true);
    } catch (error) {
      setPrepareError(error instanceof Error ? error.message : "Failed to prepare selected files for sharing.");
    } finally {
      setActiveAction(null);
    }
  }, [count, resolveSelection]);

  const handleTags = useCallback(() => {
    const targetEntities = Array.from(selectedIds).map((id) => ({ id, type: "file" as const }));
    useTagAssignmentStore.getState().openDrawer(targetEntities);
  }, [selectedIds]);

  const handleDownload = useCallback(async () => {
    if (count === 0) {
      return;
    }

    setPrepareError(null);
    setActiveAction("download");
    try {
      const resolved = await resolveSelection();
      if (resolved.files.length === 0) {
        throw new Error("No files available to download.");
      }
      openDrawer();
      let done = 0;
      for (const file of resolved.files) {
        await startDownload(file.id);
        done += 1;
        setDownloadStatus(`${done} of ${resolved.files.length} downloaded`);
      }
      toast.success(`Queued ${resolved.files.length} files for download.`);
      clearSelection();
      window.setTimeout(() => setDownloadStatus(null), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to queue downloads.";
      setPrepareError(message);
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  }, [clearSelection, count, openDrawer, resolveSelection, startDownload]);

  const handleOffline = useCallback(async () => {
    if (count === 0) {
      return;
    }

    setPrepareError(null);
    setActiveAction("offline");
    try {
      const resolved = await resolveSelection();
      if (resolved.files.length === 0) {
        throw new Error("No files available for offline caching.");
      }
      setPrepareProgress({ done: 0, total: resolved.files.length, label: "Queueing offline files..." });
      await makeFilesOffline(resolved.files, undefined, (done, total) => {
        setPrepareProgress({ done, total, label: "Queueing offline files..." });
      });
      window.dispatchEvent(new CustomEvent("studytrix:offline-batch-queued", {
        detail: { fileIds: resolved.files.map((file) => file.id) },
      }));
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to queue offline files.";
      setPrepareError(message);
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  }, [clearSelection, count, resolveSelection]);

  const handleZipDownload = useCallback(async () => {
    if (count === 0 || zipDisabled) {
      return;
    }

    setPrepareError(null);
    setActiveAction("zip");
    try {
      const resolved = await resolveSelection();
      if (resolved.files.length === 0) {
        throw new Error("No files available to archive.");
      }
      setPrepareProgress({ done: 0, total: resolved.files.length, label: "Building archive..." });
      await downloadAsZip(resolved.files, (done, total) => {
        setPrepareProgress({ done, total, label: "Building archive..." });
      });
      clearSelection();
      toast.success("Zip download started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create archive.";
      setPrepareError(message);
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  }, [clearSelection, count, resolveSelection, zipDisabled]);

  const openDeleteConfirmation = useCallback(async () => {
    if (count === 0) {
      return;
    }

    setPrepareError(null);
    setActiveAction("delete");
    try {
      const resolved = await resolveSelection();
      setDeleteTargets(resolved.files.map((file) => ({ id: file.id, name: file.name })));
      setDeleteConfirmOpen(true);
    } catch (error) {
      setPrepareError(error instanceof Error ? error.message : "Failed to resolve selected files.");
    } finally {
      setActiveAction(null);
    }
  }, [count, resolveSelection]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (deleteTargets.length === 0) {
      setDeleteConfirmOpen(false);
      return;
    }

    setActiveAction("delete");
    try {
      await deleteOfflineRecords(deleteTargets.map((item) => item.id));
      toast.success(`Removed ${deleteTargets.length} offline file${deleteTargets.length === 1 ? "" : "s"}.`);
      setDeleteConfirmOpen(false);
      clearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove offline files.");
    } finally {
      setActiveAction(null);
    }
  }, [clearSelection, deleteTargets]);

  const progressLabel = `${prepareProgress.done} / ${Math.max(prepareProgress.total, 1)}`;
  const showProgressDialog = activeAction === "download" || activeAction === "offline" || activeAction === "zip";

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-1/2 z-50 flex w-[min(96vw,980px)] -translate-x-1/2 items-center justify-between gap-2 rounded-2xl border border-[hsl(var(--border)/0.60)] bg-[hsl(var(--card)/0.80)] px-2 py-2 shadow-[0_-4px_32px_0_hsl(var(--primary)/0.20)] backdrop-blur-[20px] sm:bottom-6"
          >
            <div className="flex items-center gap-2">
              <motion.span
                key={count}
                initial={{ scale: 0.85, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="inline-flex h-9 items-center rounded-full border border-border/70 bg-card/70 px-3 text-sm font-semibold text-foreground"
              >
                {count} selected
              </motion.span>
              {downloadStatus ? <span className="hidden text-xs text-muted-foreground md:inline">{downloadStatus}</span> : null}
            </div>

            <div className="flex flex-row-reverse items-center gap-1">
              <ActionButton
                label="Download"
                icon={<IconDownload className="size-4" />}
                loading={activeAction === "download"}
                disabled={count === 0 || activeAction !== null}
                onClick={() => void handleDownload()}
              />
              <ActionButton
                label="Make Offline"
                icon={<IconCloudDown className="size-4" />}
                loading={activeAction === "offline"}
                disabled={count === 0 || activeAction !== null}
                onClick={() => void handleOffline()}
              />
              <ActionButton
                label="Share"
                icon={<IconShare className="size-4" />}
                loading={activeAction === "share"}
                disabled={count === 0 || activeAction !== null}
                onClick={() => void handleShare()}
              />
              <ActionButton
                label="Add Tags"
                icon={<IconTag className="size-4" />}
                disabled={count === 0 || activeAction !== null}
                onClick={handleTags}
              />
              <ActionButton
                label="Zip & Download"
                icon={<IconArchive className="size-4" />}
                loading={activeAction === "zip"}
                disabled={count === 0 || zipDisabled || activeAction !== null}
                onClick={() => void handleZipDownload()}
              />
              <ActionButton
                label="Delete Offline"
                icon={<IconTrash className="size-4 text-destructive" />}
                loading={activeAction === "delete"}
                disabled={count === 0 || activeAction !== null}
                onClick={() => void openDeleteConfirmation()}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="size-10 rounded-xl text-muted-foreground hover:bg-muted/60"
                aria-label="Clear selection"
              >
                <IconX className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={showProgressDialog || prepareError !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && activeAction === null) {
            setPrepareError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={activeAction === null}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeAction !== null ? <IconLoader2 className="size-4 animate-spin" /> : null}
              {activeAction !== null ? "Working on Selection" : "Couldn’t Complete Action"}
            </DialogTitle>
            <DialogDescription>
              {activeAction !== null ? prepareProgress.label : prepareError}
            </DialogDescription>
          </DialogHeader>

          {activeAction !== null ? (
            <div className="space-y-2">
              <Progress value={prepareProgress.done} max={Math.max(prepareProgress.total, 1)} />
              <p className="text-center text-xs text-muted-foreground">{progressLabel}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-h-[70dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete from Offline</DialogTitle>
            <DialogDescription>
              This removes cached files from device storage only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {deleteTargets.map((item) => (
              <p key={item.id} className="truncate rounded-md bg-muted/60 px-2 py-1 text-xs text-foreground">
                {item.name}
              </p>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDeleteConfirmed()}>
              Delete Offline Copies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkShareDialog
        open={isBulkShareOpen}
        onOpenChange={(nextOpen) => {
          setIsBulkShareOpen(nextOpen);
          if (!nextOpen) {
            setResolvedSelection(null);
          }
        }}
        selection={resolvedSelection}
        onComplete={() => {
          clearSelection();
          setResolvedSelection(null);
        }}
      />
    </>
  );
}
