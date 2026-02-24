"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconCopy, IconDownload, IconShare, IconStar, IconStarFilled, IconTag } from "@tabler/icons-react";
import { PencilLine, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { expandFolders } from "@/features/bulk/bulk.service";
import { downloadAsZip, shareAsZip } from "@/features/bulk/bulk.share";
import { useShareStore } from "@/features/share/share.store";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { useTagStore } from "@/features/tags/tag.store";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";
import { cn } from "@/lib/utils";

type PersonalFolderMenuProps = {
  entityId: string;
  folderLabel: string;
  itemCountLabel: string;
  refreshing: boolean;
  onRename: () => void;
  onRefresh: () => Promise<void> | void;
  onEdit: () => void;
  onRemove: () => void;
};

type MenuActionProps = {
  icon: ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "accent" | "destructive";
};

type DockActionButtonProps = {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
};

function triggerHaptic(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

function sanitizeZipPrefix(value: string): string {
  return value
    .trim()
    .replace(/[<>:\"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "-")
    .toLowerCase() || "folder";
}

function summarizeFailedFiles(summary: { failedFiles: string[] }, fallback: string): string | null {
  if (summary.failedFiles.length === 0) {
    return null;
  }

  const preview = summary.failedFiles.slice(0, 3).join(", ");
  const remainder = summary.failedFiles.length - Math.min(summary.failedFiles.length, 3);
  if (remainder > 0) {
    return `${summary.failedFiles.length} files could not be included (${preview} and ${remainder} more).`;
  }

  return `${summary.failedFiles.length} files could not be included (${preview || fallback}).`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function MenuAction({
  icon,
  label,
  description,
  onSelect,
  disabled = false,
  tone = "default",
}: MenuActionProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
        tone === "accent"
          ? "bg-muted/30 hover:bg-muted/55"
          : tone === "destructive"
            ? "hover:bg-destructive/10"
            : "hover:bg-muted/45",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      disabled={disabled}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm ring-1 ring-border/80">
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-[13px] font-semibold",
            tone === "destructive" ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block line-clamp-1 text-[11px] text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function DockActionButton({ icon, label, onSelect }: DockActionButtonProps) {
  return (
    <button
      type="button"
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border border-border/70 bg-card/70 px-1 text-[11px] font-medium text-foreground transition-all duration-150 hover:-translate-y-px hover:border-border hover:bg-card/95"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function PersonalFolderMenu({
  entityId,
  folderLabel,
  itemCountLabel,
  refreshing,
  onRename,
  onRefresh,
  onEdit,
  onRemove,
}: PersonalFolderMenuProps) {
  const [open, setOpen] = useState(false);
  const hydrationRequestedRef = useRef(false);
  const gateDownloadRisk = useDownloadRiskGate();

  const {
    assignments,
    isHydrated,
    hydrate,
    toggleStar,
  } = useTagStore(
    useShallow((state) => ({
      assignments: state.assignments,
      isHydrated: state.isHydrated,
      hydrate: state.hydrate,
      toggleStar: state.toggleStar,
    })),
  );

  useEffect(() => {
    if (isHydrated || hydrationRequestedRef.current) {
      return;
    }

    hydrationRequestedRef.current = true;
    void hydrate().catch(() => {
      hydrationRequestedRef.current = false;
    });
  }, [hydrate, isHydrated]);

  const isStarred = assignments[entityId]?.starred ?? false;

  const runAction = useCallback((action: () => void | Promise<void>) => {
    setOpen(false);
    void action();
  }, []);

  const handleToggleStar = useCallback(() => {
    triggerHaptic(8);
    runAction(async () => {
      await toggleStar(entityId).catch(() => undefined);
    });
  }, [entityId, runAction, toggleStar]);

  const handleAssignTags = useCallback(() => {
    triggerHaptic(8);
    runAction(() => {
      useTagAssignmentStore.getState().openDrawer([{ id: entityId, type: "folder" }]);
    });
  }, [entityId, runAction]);

  const handleCopyLink = useCallback(() => {
    triggerHaptic(6);
    runAction(async () => {
      const link = `https://drive.google.com/drive/folders/${encodeURIComponent(entityId)}`;
      const copied = await copyToClipboard(link);
      if (copied) {
        toast.success("Folder link copied.");
        return;
      }
      toast.error("Clipboard is not available in this browser.");
    });
  }, [entityId, runAction]);

  const handleShare = useCallback(() => {
    triggerHaptic(8);
    runAction(async () => {
      const shareStore = useShareStore.getState();

      try {
        shareStore.startShare(folderLabel, 1, {
          unit: "items",
          title: "Preparing Folder Files",
        });

        const files = await expandFolders(
          [{ id: entityId, name: folderLabel }],
          {
            onProgress: (done, total) => {
              shareStore.updateProgress(done, total);
            },
          },
        );

        if (files.length === 0) {
          throw new Error("Folder is empty");
        }

        const proceed = await gateDownloadRisk(
          files.map((file) => ({
            id: file.id,
            name: file.name,
            sizeBytes: file.size,
            kind: "file" as const,
          })),
          {
            actionLabel: "folder share",
            confirmButtonLabel: "Share Anyway",
          },
        );

        if (!proceed) {
          shareStore.endShare();
          return;
        }

        shareStore.startShare(`${folderLabel}.zip`, files.length, {
          unit: "items",
          title: "Preparing Folder ZIP",
        });

        const summary = await shareAsZip(
          files,
          (done, total) => {
            shareStore.updateProgress(done, total);
          },
          `${sanitizeZipPrefix(folderLabel)}-share.zip`,
        );

        const failureMessage = summarizeFailedFiles(summary, folderLabel);
        if (failureMessage) {
          shareStore.setError(failureMessage);
          return;
        }

        shareStore.endShare();
      } catch (error) {
        shareStore.setError(
          error instanceof Error
            ? error.message
            : `Failed to share "${folderLabel}"`,
        );
      }
    });
  }, [entityId, folderLabel, gateDownloadRisk, runAction]);

  const handleDownload = useCallback(() => {
    triggerHaptic(8);
    runAction(async () => {
      const shareStore = useShareStore.getState();

      try {
        shareStore.startShare(folderLabel, 1, {
          unit: "items",
          title: "Preparing Folder Files",
        });

        const files = await expandFolders(
          [{ id: entityId, name: folderLabel }],
          {
            onProgress: (done, total) => {
              shareStore.updateProgress(done, total);
            },
          },
        );

        if (files.length === 0) {
          throw new Error("Folder is empty");
        }

        const proceed = await gateDownloadRisk(
          files.map((file) => ({
            id: file.id,
            name: file.name,
            sizeBytes: file.size,
            kind: "file" as const,
          })),
          {
            actionLabel: "folder download",
            confirmButtonLabel: "Download Anyway",
          },
        );

        if (!proceed) {
          shareStore.endShare();
          return;
        }

        shareStore.startShare(`${folderLabel}.zip`, files.length, {
          unit: "items",
          title: "Preparing Folder Download",
        });

        const summary = await downloadAsZip(
          files,
          (done, total) => {
            shareStore.updateProgress(done, total);
          },
          `${sanitizeZipPrefix(folderLabel)}-download.zip`,
        );

        const failureMessage = summarizeFailedFiles(summary, folderLabel);
        if (failureMessage) {
          shareStore.setError(failureMessage);
          return;
        }

        shareStore.endShare();
      } catch (error) {
        shareStore.setError(
          error instanceof Error
            ? error.message
            : `Failed to download "${folderLabel}"`,
        );
      }
    });
  }, [entityId, folderLabel, gateDownloadRisk, runAction]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={(
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${folderLabel}`}
            className="size-9"
          />
        )}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <span className="sr-only">Open menu</span>
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(19rem,calc(100vw-0.85rem))] rounded-2xl border border-border/85 bg-card/95 p-2 shadow-xl backdrop-blur-md"
      >
        <div className="rounded-xl border border-border/80 bg-muted/65 px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-foreground">{folderLabel}</p>
          <p className="truncate text-xs text-muted-foreground">{itemCountLabel}</p>
          <div className="mt-1.5">
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Personal Repository
            </span>
          </div>
        </div>

        <section className="mt-1.5 rounded-xl border border-border/70 bg-card/80 p-1">
          <MenuAction
            icon={isStarred ? <IconStarFilled className="size-4 text-amber-500" /> : <IconStar className="size-4 text-amber-500" />}
            label={isStarred ? "Unstar" : "Star"}
            description={isStarred ? "Remove pinned priority" : "Pin this folder for quick access"}
            onSelect={handleToggleStar}
          />
          <MenuAction
            icon={<IconTag className="size-4 text-indigo-500" />}
            label="Assign Tags"
            description="Categorize this folder"
            onSelect={handleAssignTags}
          />
        </section>

        <section className="mt-1.5 rounded-xl border border-border/70 bg-card/80 p-1">
          <MenuAction
            icon={<PencilLine className="size-4 text-primary" />}
            label="Rename"
            description="Update how this folder appears"
            onSelect={() => runAction(onRename)}
          />
          <MenuAction
            icon={<RefreshCw className={cn("size-4 text-sky-500", refreshing ? "animate-spin" : undefined)} />}
            label={refreshing ? "Refreshing..." : "Refresh"}
            description="Sync counts and latest linked contents"
            disabled={refreshing}
            onSelect={() => runAction(onRefresh)}
          />
          <MenuAction
            icon={<Settings2 className="size-4 text-indigo-500" />}
            label="Edit"
            description="Adjust color and pin behavior"
            onSelect={() => runAction(onEdit)}
          />
          <MenuAction
            icon={<Trash2 className="size-4 text-destructive" />}
            label="Remove"
            description="Remove from Personal Repository list"
            tone="destructive"
            onSelect={() => runAction(onRemove)}
          />
        </section>

        <section className="mt-1.5 rounded-xl border border-border/75 bg-muted/35 px-2 pb-2 pt-1.5">
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <DockActionButton
              icon={<IconDownload className="size-5 text-sky-500" />}
              label="Download"
              onSelect={handleDownload}
            />
            <DockActionButton
              icon={<IconCopy className="size-5 text-slate-500" />}
              label="Copy Link"
              onSelect={handleCopyLink}
            />
            <DockActionButton
              icon={<IconShare className="size-5 text-violet-500" />}
              label="Share"
              onSelect={handleShare}
            />
          </div>
        </section>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
