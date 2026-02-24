"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconCloudDown,
  IconCopy,
  IconDeviceFloppy,
  IconDownload,
  IconDotsVertical,
  IconShare,
  IconSparkles,
  IconStar,
  IconTag,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/utils";
import { useTagStore } from "@/features/tags/tag.store";
import type { EntityType } from "@/features/tags/tag.types";
import { Button } from "@/components/ui/button";
import { shareNativeFile } from "@/features/share/share.service";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { expandFolders } from "@/features/bulk/bulk.service";
import { makeFilesOffline } from "@/features/bulk/bulk.offline";
import { toast } from "sonner";
import { downloadAsZip, shareAsZip } from "@/features/bulk/bulk.share";
import { useShareStore } from "@/features/share/share.store";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";
import { startDownload } from "@/features/download/download.controller";
import { useDownloadStore } from "@/features/download/download.store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SummarizeDialog = dynamic(
  () => import("@/features/intelligence/ui/SummarizeDialog").then((module) => module.SummarizeDialog),
  { ssr: false },
);

type EntityActionsMenuProps = {
  entityId: string;
  entityType: EntityType;
  title: string;
  description?: string;
  entityDetails?: {
    mimeType?: string | null;
    sizeBytes?: number | null;
    modifiedTime?: string | null;
    webViewLink?: string | null;
  };
  align?: "start" | "end";
  triggerClassName?: string;
  onMakeOffline?: (sourceElement?: HTMLElement) => void;
  onRemoveOffline?: () => void;
  isOffline?: boolean;
  isDownloading?: boolean;
  customActions?: EntityActionsMenuCustomAction[];
  customActionsLabel?: string;
};

export type EntityActionsMenuCustomAction = {
  id: string;
  icon: ReactNode;
  label: string;
  description: string;
  onSelect: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "default" | "accent" | "destructive";
};

function triggerHaptic(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

function emitOfflineDebug(step: string): void {
  const message = `[Offline Debug] ${step}`;
  console.debug(message);
}

function sanitizeZipPrefix(value: string): string {
  return value
    .trim()
    .replace(/[<>:\"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "-")
    .toLowerCase() || "folder";
}

function sanitizeDownloadFileName(value: string): string {
  return value.trim().replace(/[<>:\"/\\|?*\x00-\x1f]/g, "_") || "download";
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

function triggerFileDownload(path: string, fileName: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const anchor = document.createElement("a");
  anchor.href = path;
  anchor.download = sanitizeDownloadFileName(fileName);
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  try {
    document.body.appendChild(anchor);
    anchor.click();
    return true;
  } catch {
    return false;
  } finally {
    anchor.remove();
  }
}

function downloadBlob(blob: Blob, fileName: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = sanitizeDownloadFileName(fileName);
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";

  try {
    document.body.appendChild(anchor);
    anchor.click();
    return true;
  } catch {
    return false;
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    anchor.remove();
  }
}

function parseDownloadFileName(
  fileName: string,
  contentDisposition: string | null,
): string {
  const fallback = sanitizeDownloadFileName(fileName);
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return sanitizeDownloadFileName(decodeURIComponent(utf8Match[1]));
    } catch {
      return fallback;
    }
  }

  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (asciiMatch?.[1]) {
    return sanitizeDownloadFileName(asciiMatch[1]);
  }

  return fallback;
}

function buildDriveShareLink(input: {
  entityId: string;
  entityType: EntityType;
  webViewLink?: string | null;
}): string {
  const webViewLink = parseString(input.webViewLink);
  if (webViewLink && /^https?:\/\//i.test(webViewLink)) {
    return webViewLink;
  }

  const encodedId = encodeURIComponent(input.entityId);
  if (input.entityType === "folder") {
    return `https://drive.google.com/drive/folders/${encodedId}`;
  }

  return `https://drive.google.com/file/d/${encodedId}/view`;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

async function downloadFileWithFallback(path: string, fileName: string): Promise<boolean> {
  if (!isStandaloneMode()) {
    return triggerFileDownload(path, fileName);
  }

  try {
    const response = await fetch(path, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return triggerFileDownload(path, fileName);
    }

    const blob = await response.blob();
    const resolvedName = parseDownloadFileName(
      fileName,
      response.headers.get("content-disposition"),
    );
    return downloadBlob(blob, resolvedName) || triggerFileDownload(path, resolvedName);
  } catch {
    return triggerFileDownload(path, fileName);
  }
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

type MenuActionRowProps = {
  icon: ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "accent" | "destructive";
};

function MenuActionRow({
  icon,
  label,
  description,
  onSelect,
  disabled = false,
  tone = "default",
}: MenuActionRowProps) {
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

type DockActionButtonProps = {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
};

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

export function EntityActionsMenu({
  entityId,
  entityType,
  title,
  description,
  entityDetails,
  align = "end",
  triggerClassName,
  onRemoveOffline,
  isOffline = false,
  isDownloading = false,
  customActions = [],
  customActionsLabel = "Additional actions",
}: EntityActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  const gateDownloadRisk = useDownloadRiskGate();
  const hydrationRequestedRef = useRef(false);
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

  const assignment = assignments[entityId];
  const isStarred = assignment?.starred ?? false;

  const handleToggleStar = useCallback(() => {
    triggerHaptic();
    void toggleStar(entityId).catch(() => undefined);
  }, [entityId, toggleStar]);

  const fileStreamPath = `/api/file/${encodeURIComponent(entityId)}/stream`;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleCopyAction = useCallback(() => {
    triggerHaptic(6);
    closeMenu();

    const linkToCopy = buildDriveShareLink({
      entityId,
      entityType,
      webViewLink: entityDetails?.webViewLink,
    });
    if (!linkToCopy) {
      toast.error(
        entityType === "folder"
          ? "Could not prepare link for this folder."
          : "Could not prepare link for this file.",
      );
      return;
    }

    void copyToClipboard(linkToCopy).then((copied) => {
      if (copied) {
        toast.success(entityType === "folder" ? "Folder link copied." : "File link copied.");
        return;
      }

      toast.error("Clipboard is not available in this browser.");
    });
  }, [closeMenu, entityDetails?.webViewLink, entityId, entityType]);

  const isPdfFile = entityType === "file" && entityDetails?.mimeType === "application/pdf";

  const handleSummarize = useCallback(() => {
    if (!isPdfFile) {
      return;
    }

    triggerHaptic(6);
    closeMenu();
    setSummarizeOpen(true);
  }, [closeMenu, isPdfFile]);

  const handleShare = useCallback(() => {
    triggerHaptic();
    closeMenu();

    if (entityType === "folder") {
      void (async () => {
        const shareStore = useShareStore.getState();
        try {
          shareStore.startShare(
            title,
            1,
            {
              unit: "items",
              title: "Preparing Folder Files",
            },
          );

          const files = await expandFolders(
            [{ id: entityId, name: title }],
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
              kind: "file",
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

          shareStore.startShare(
            `${title}.zip`,
            files.length,
            {
              unit: "items",
              title: "Preparing Folder ZIP",
            },
          );

          const summary = await shareAsZip(
            files,
            (done, total) => {
              shareStore.updateProgress(done, total);
            },
            `${sanitizeZipPrefix(title)}-share.zip`,
          );
          const failureMessage = summarizeFailedFiles(summary, title);
          if (failureMessage) {
            shareStore.setError(failureMessage);
            return;
          }

          shareStore.endShare();
        } catch (error) {
          shareStore.setError(
            error instanceof Error
              ? error.message
              : `Failed to share "${title}"`,
          );
        }
      })();
      return;
    }

    void (async () => {
      const proceed = await gateDownloadRisk(
        [
          {
            id: entityId,
            name: title,
            sizeBytes: entityDetails?.sizeBytes ?? null,
            kind: "file",
          },
        ],
        {
          actionLabel: "file sharing",
          confirmButtonLabel: "Share File",
        },
      );
      if (!proceed) {
        return;
      }

      await shareNativeFile(
        entityId,
        title,
        entityDetails?.mimeType ?? "application/octet-stream",
      );
    })();
  }, [closeMenu, entityDetails?.mimeType, entityDetails?.sizeBytes, entityId, entityType, gateDownloadRisk, title]);

  const handleDownload = useCallback(() => {
    triggerHaptic();
    closeMenu();

    if (entityType === "folder") {
      void (async () => {
        const shareStore = useShareStore.getState();

        try {
          shareStore.startShare(title, 1, {
            unit: "items",
            title: "Preparing Folder Files",
          });

          const files = await expandFolders(
            [{ id: entityId, name: title }],
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
              kind: "file",
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

          shareStore.startShare(`${title}.zip`, files.length, {
            unit: "items",
            title: "Preparing Folder Download",
          });

          const summary = await downloadAsZip(
            files,
            (done, total) => {
              shareStore.updateProgress(done, total);
            },
            `${sanitizeZipPrefix(title)}-download.zip`,
          );
          const failureMessage = summarizeFailedFiles(summary, title);
          if (failureMessage) {
            shareStore.setError(failureMessage);
            return;
          }

          shareStore.endShare();
        } catch (error) {
          shareStore.setError(
            error instanceof Error
              ? error.message
              : `Failed to download "${title}"`,
          );
        }
      })();
      return;
    }

    void (async () => {
      const proceed = await gateDownloadRisk(
        [
          {
            id: entityId,
            name: title,
            sizeBytes: entityDetails?.sizeBytes ?? null,
            kind: "file",
          },
        ],
        {
          actionLabel: "download",
          confirmButtonLabel: "Download",
        },
      );
      if (!proceed) {
        return;
      }

      const started = await downloadFileWithFallback(fileStreamPath, title);
      if (started) {
        toast.success(`Downloading "${title}"`);
        return;
      }

      toast.error(`Could not download "${title}"`);
    })();
  }, [closeMenu, entityDetails?.sizeBytes, entityId, entityType, fileStreamPath, gateDownloadRisk, title]);

  const handleManageTags = useCallback(() => {
    triggerHaptic(8);
    closeMenu();
    useTagAssignmentStore.getState().openDrawer([
      { id: entityId, type: entityType },
    ]);
  }, [closeMenu, entityId, entityType]);

  const handleOfflineToggle = useCallback(() => {
    emitOfflineDebug(`Action tapped for ${entityType}: "${title}"`);

    if (isDownloading) {
      useDownloadStore.getState().openDrawer();
      toast.message("Offline download already in progress.");
      emitOfflineDebug("Blocked: item is already downloading. Opened Downloads drawer.");
      return;
    }

    triggerHaptic();
    closeMenu();

    if (isOffline) {
      emitOfflineDebug("Removing offline copy.");
      onRemoveOffline?.();
      return;
    }

    if (entityType === "folder") {
      emitOfflineDebug("Expanding folder to resolve files...");
      const downloadPromise = expandFolders([entityId])
        .then(async (files) => {
          emitOfflineDebug(`Folder expansion completed. Files found: ${files.length}`);
          if (files.length === 0) {
            toast.info("Folder is empty.");
            emitOfflineDebug("Stopped: folder is empty.");
            return;
          }

          emitOfflineDebug("Opening risk gate for folder files...");
          const proceed = await gateDownloadRisk(
            files.map((file) => ({
              id: file.id,
              name: file.name,
              sizeBytes: file.size,
              kind: "file",
            })),
            {
              actionLabel: "offline save",
              confirmButtonLabel: "Save Offline",
            },
          );
          if (!proceed) {
            emitOfflineDebug("Stopped: user canceled at risk gate.");
            return;
          }

          emitOfflineDebug("Risk gate passed. Opening Downloads drawer and queueing files...");
          useDownloadStore.getState().openDrawer();
          await makeFilesOffline(files, {
            group: {
              id: `folder:${entityId}`,
              label: title,
            },
          });
          emitOfflineDebug(`Queue request submitted for ${files.length} folder files.`);
        });

      toast.promise(downloadPromise, {
        loading: `Gathering files in "${title}"...`,
        success: `Started downloading folder "${title}"`,
        error: (error) => (
          error instanceof Error ? error.message : `Failed to download "${title}"`
        ),
      });
      return;
    }

    void (async () => {
      emitOfflineDebug("Opening risk gate for file...");
      const proceed = await gateDownloadRisk(
        [
          {
            id: entityId,
            name: title,
            sizeBytes: entityDetails?.sizeBytes ?? null,
            kind: "file",
          },
        ],
        {
          actionLabel: "offline save",
          confirmButtonLabel: "Save Offline",
        },
      );
      if (!proceed) {
        emitOfflineDebug("Stopped: user canceled at risk gate.");
        return;
      }

      try {
        emitOfflineDebug("Risk gate passed. Queueing file...");
        const taskId = await startDownload(entityId);
        if (!taskId) {
          throw new Error("Could not queue offline download.");
        }
        emitOfflineDebug(`Download task queued. Task ID: ${taskId}`);
        useDownloadStore.getState().openDrawer();
      } catch (error) {
        emitOfflineDebug(
          `Queue failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to queue "${title}" for offline`,
        );
      }
    })();
  }, [closeMenu, entityDetails?.sizeBytes, entityId, entityType, gateDownloadRisk, isDownloading, isOffline, onRemoveOffline, title]);

  const offlineActionLabel = isOffline
    ? "Remove Offline Copy"
    : isDownloading
      ? "Downloading..."
      : "Make Available Offline";
  const offlineActionDescription = isOffline
    ? "Free storage and keep this cloud-only"
    : isDownloading
      ? "Offline copy is currently being prepared"
      : "Save for quick access without internet";

  const hasCustomActions = customActions.length > 0;

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              aria-label={`Open actions for ${title}`}
              variant="ghost"
              size="icon"
              className={cn(
                "size-10 rounded-lg text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:bg-muted hover:text-foreground active:scale-[0.98]",
                triggerClassName,
              )}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                event.stopPropagation();
                triggerHaptic(6);
              }}
            />
          }
        >
          <IconDotsVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className="max-h-[min(78dvh,36rem)] w-[min(19.5rem,calc(100vw-0.75rem))] overflow-y-auto rounded-2xl border border-border/85 bg-card/95 p-2 shadow-xl backdrop-blur-md"
        >
          <div className="space-y-1.5">
            <div className="rounded-xl border border-border/80 bg-muted/65 px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {description ?? "Quick actions"}
              </p>
              <div className="mt-1.5">
                {isOffline ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-300/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Available Offline
                  </span>
                ) : isDownloading ? (
                  <span className="inline-flex items-center rounded-full border border-sky-300/80 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
                    Downloading
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-border/80 bg-card/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Cloud only
                  </span>
                )}
              </div>
            </div>

            <section className="rounded-xl border border-border/70 bg-card/80 p-1">
              <MenuActionRow
                icon={<IconStar className="size-4 text-amber-500 dark:text-amber-300" />}
                label={isStarred ? "Unstar" : "Star"}
                description={isStarred ? "Remove pinned priority" : "Pin this item for quick access"}
                onSelect={handleToggleStar}
              />
              <MenuActionRow
                icon={<IconTag className="size-4 text-indigo-500 dark:text-indigo-300" />}
                label="Assign Tags"
                description="Categorize and organize"
                onSelect={handleManageTags}
              />
              <MenuActionRow
                icon={isOffline ? (
                  <IconCloudDown className="size-4 text-rose-500 dark:text-rose-300" />
                ) : isDownloading ? (
                  <IconDeviceFloppy className="size-4 text-sky-500 dark:text-sky-300" />
                ) : (
                  <IconDeviceFloppy className="size-4 text-sky-500 dark:text-sky-300" />
                )}
                label={offlineActionLabel}
                description={offlineActionDescription}
                onSelect={handleOfflineToggle}
                disabled={isDownloading}
              />
            </section>

            {isPdfFile ? (
              <section className="rounded-xl border border-border/70 bg-card/80 p-1">
                <MenuActionRow
                  icon={<IconSparkles className="size-4 text-teal-500 dark:text-teal-300" />}
                  label="Summarize"
                  description="Generate a study summary from this PDF"
                  onSelect={handleSummarize}
                />
              </section>
            ) : null}

            {hasCustomActions ? (
              <section className="rounded-xl border border-border/70 bg-card/80 p-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                  {customActionsLabel}
                </p>
                {customActions.map((action) => (
                  <MenuActionRow
                    key={action.id}
                    icon={action.icon}
                    label={action.label}
                    description={action.description}
                    tone={action.tone ?? "default"}
                    disabled={action.disabled}
                    onSelect={() => {
                      closeMenu();
                      void action.onSelect();
                    }}
                  />
                ))}
              </section>
            ) : null}

            <section className="rounded-xl border border-border/75 bg-muted/35 px-2 pb-2 pt-1.5">
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                <DockActionButton
                  icon={<IconDownload className="size-5 text-sky-500 dark:text-sky-300" />}
                  label="Download"
                  onSelect={handleDownload}
                />
                <DockActionButton
                  icon={<IconCopy className="size-5 text-slate-500 dark:text-slate-300" />}
                  label="Copy Link"
                  onSelect={handleCopyAction}
                />
                <DockActionButton
                  icon={<IconShare className="size-5 text-violet-500 dark:text-violet-300" />}
                  label="Share"
                  onSelect={handleShare}
                />
              </div>
            </section>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {isPdfFile ? (
        <SummarizeDialog
          open={summarizeOpen}
          onOpenChange={setSummarizeOpen}
          fileId={entityId}
          fileName={title}
        />
      ) : null}
    </>
  );
}
