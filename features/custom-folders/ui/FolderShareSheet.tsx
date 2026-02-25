"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { IconCopy, IconShare3, IconLink } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { buildFolderImportShareLink } from "@/features/custom-folders/custom-folders.constants";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";

type FolderShareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderLabel: string;
};

function formatRelativeTime(timestamp: number): string {
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) {
    return "just now";
  }

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 30) {
    return `${deltaDays}d`;
  }

  const deltaMonths = Math.floor(deltaDays / 30);
  if (deltaMonths < 12) {
    return `${deltaMonths}mo`;
  }

  const deltaYears = Math.floor(deltaMonths / 12);
  return `${deltaYears}y`;
}

async function copyLinkToClipboard(link: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

export function FolderShareSheet({
  open,
  onOpenChange,
  folderId,
  folderLabel,
}: FolderShareSheetProps) {
  const recentlyShared = useCustomFoldersStore((state) => state.recentlyShared);
  const recordFolderShared = useCustomFoldersStore((state) => state.recordFolderShared);
  const recordShareLinkCopy = useCustomFoldersStore((state) => state.recordShareLinkCopy);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const shareLink = useMemo(() => buildFolderImportShareLink(folderId) ?? "", [folderId]);
  const sharedEntry = useMemo(
    () => recentlyShared.find((entry) => entry.folderId === folderId) ?? null,
    [folderId, recentlyShared],
  );

  const markShared = useCallback(() => {
    recordFolderShared(folderId, folderLabel);
    recordShareLinkCopy(folderId);
  }, [folderId, folderLabel, recordFolderShared, recordShareLinkCopy]);

  const runCopyAndClose = useCallback(async (recordAnalytics = true) => {
    if (!shareLink) {
      toast.error("Could not build this share link.");
      return;
    }

    const copied = await copyLinkToClipboard(shareLink);
    if (!copied) {
      toast.error("Clipboard is not available in this browser.");
      return;
    }

    if (recordAnalytics) {
      markShared();
    }
    setCopyState("copied");
    window.setTimeout(() => {
      setCopyState("idle");
      onOpenChange(false);
    }, 500);
  }, [markShared, onOpenChange, shareLink]);

  const handleShareVia = useCallback(async () => {
    if (!shareLink) {
      toast.error("Could not build this share link.");
      return;
    }

    markShared();

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Study folder: ${folderLabel}`,
          url: shareLink,
        });
        onOpenChange(false);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          onOpenChange(false);
          return;
        }
      }
    }

    await runCopyAndClose(false);
  }, [folderLabel, markShared, onOpenChange, runCopyAndClose, shareLink]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border/70 bg-background/97">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <DrawerHeader>
            <DrawerTitle className="truncate">Share "{folderLabel}"</DrawerTitle>
            {sharedEntry ? (
              <p className="text-xs text-muted-foreground">Shared {formatRelativeTime(sharedEntry.sharedAt)} ago</p>
            ) : null}
            <DrawerDescription className="mt-1 whitespace-pre-line">
              Anyone with this link can view and add this folder
              {"\n"}
              to their Studytrix Personal Repository.
              {"\n\n"}
              Make sure your folder is set to
              {"\n"}
              "Anyone with the link can view" in Google Drive.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-3">
            <div className="rounded-xl border border-border/70 bg-card/50 p-2.5">
              <label htmlFor="share-folder-link" className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <IconLink className="size-3.5" />
                Share link
              </label>
              <Input
                id="share-folder-link"
                value={shareLink}
                readOnly
                onClick={() => {
                  void runCopyAndClose();
                }}
                className="h-10 cursor-copy text-xs"
              />
            </div>
          </div>

          <DrawerFooter className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => void runCopyAndClose()}>
              <IconCopy className="size-4" />
              {copyState === "copied" ? "Copied!" : "Copy Link"}
            </Button>
            <Button type="button" onClick={() => void handleShareVia()}>
              <IconShare3 className="size-4" />
              Share via...
            </Button>
          </DrawerFooter>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
}
