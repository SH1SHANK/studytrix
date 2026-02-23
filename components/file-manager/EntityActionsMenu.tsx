"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  IconCloudDown,
  IconCopy,
  IconDeviceFloppy,
  IconDownload,
  IconDotsVertical,
  IconFileText,
  IconInfoCircle,
  IconShare,
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
import { extractFullFileContent, isExtractableMimeType } from "@/features/intelligence/extractors/content.extractor";
import { cleanTextForClipboard } from "@/features/intelligence/intelligence.cleanup.client";
import { toast } from "sonner";
import { downloadAsZip, shareAsZip } from "@/features/bulk/bulk.share";
import { useShareStore } from "@/features/share/share.store";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";
import { useSetting } from "@/ui/hooks/useSettings";
import { formatFileSize, getMimeLabel } from "@/features/drive/drive.types";
import { INTELLIGENCE_SETTINGS_IDS } from "@/features/intelligence/intelligence.constants";
import { resolveCleanupModelId } from "@/features/intelligence/intelligence.cleanup.utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function legacyCopyToClipboard(text: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0
    ? selection.getRangeAt(0)
    : null;

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();

  if (selection && previousRange) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }

  return copied;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for browser/PWA contexts that block async clipboard.
    }
  }

  return legacyCopyToClipboard(text);
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

function formatModifiedTime(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type MenuActionRowProps = {
  icon: ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "accent";
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
        "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        tone === "accent"
          ? "bg-muted/30 hover:bg-muted/55"
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
        <span className="block truncate text-[13px] font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{description}</span>
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
      className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card/70 text-[11px] font-medium text-foreground transition-all duration-150 hover:-translate-y-px hover:border-border hover:bg-card/95"
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
  onMakeOffline,
  onRemoveOffline,
  isOffline = false,
  isDownloading = false,
}: EntityActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [cleanupModelSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.cleanupModelId);
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

  const handleOpenInfo = useCallback(() => {
    triggerHaptic(8);
    closeMenu();
    setInfoOpen(true);
  }, [closeMenu]);

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

  const canCopyContents = entityType === "file" && isExtractableMimeType(entityDetails?.mimeType);
  const [isCopyingContents, setIsCopyingContents] = useState(false);

  const handleCopyContents = useCallback(() => {
    if (isCopyingContents) {
      return;
    }

    triggerHaptic(6);
    closeMenu();
    setIsCopyingContents(true);

    const toastId = toast.loading("Extracting content\u2026");

    void (async () => {
      try {
        const result = await extractFullFileContent(
          entityId,
          entityDetails?.mimeType ?? "",
        );

        let textToCopy = result.text;
        let usedCleanupFallback = false;

        if (result.isOcrResult && result.text.trim().length > 0) {
          toast.loading("Cleaning OCR text\u2026", { id: toastId });
          const preferredCleanupModel = typeof cleanupModelSetting === "string"
            ? resolveCleanupModelId(cleanupModelSetting)
            : undefined;
          const cleanupResult = await cleanTextForClipboard(result.text, preferredCleanupModel);
          textToCopy = cleanupResult.text;
          usedCleanupFallback = cleanupResult.usedFallback;
        }

        const copied = await copyToClipboard(textToCopy);
        if (!copied) {
          toast.error("Clipboard is not available in this browser.", { id: toastId });
          return;
        }

        if (usedCleanupFallback) {
          toast.success(
            "Copied original OCR text (cleanup fallback applied)",
            { id: toastId, duration: 5000 },
          );
          return;
        }

        if (result.isOcrResult && result.confidence < 70) {
          toast.success(
            "Content copied — some parts may be inaccurate (scanned document)",
            { id: toastId, duration: 5000 },
          );
        } else {
          toast.success("Content copied to clipboard!", { id: toastId });
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not extract text from this file.",
          { id: toastId },
        );
      } finally {
        setIsCopyingContents(false);
      }
    })();
  }, [cleanupModelSetting, closeMenu, entityDetails?.mimeType, entityId, isCopyingContents]);

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
    if (isDownloading) {
      return;
    }

    triggerHaptic();
    closeMenu();

    if (isOffline) {
      onRemoveOffline?.();
      return;
    }

    if (entityType === "folder") {
      const downloadPromise = expandFolders([entityId])
        .then(async (files) => {
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
              actionLabel: "offline save",
              confirmButtonLabel: "Save Offline",
            },
          );
          if (!proceed) {
            throw new Error("Download canceled.");
          }

          return makeFilesOffline(files, {
            group: {
              id: `folder:${entityId}`,
              label: title,
            },
          });
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
        return;
      }

      onMakeOffline?.();
    })();
  }, [closeMenu, entityDetails?.sizeBytes, entityId, entityType, gateDownloadRisk, isDownloading, isOffline, onMakeOffline, onRemoveOffline, title]);

  const infoRows = useMemo(() => {
    const typeLabel = entityType === "folder"
      ? "Folder"
      : getMimeLabel(entityDetails?.mimeType ?? "application/octet-stream", title);

    const rows: Array<{ label: string; value: string }> = [
      { label: "Name", value: title },
      { label: "Type", value: typeLabel },
    ];

    if (entityType === "file") {
      rows.push({
        label: "Size",
        value: formatFileSize(entityDetails?.sizeBytes ?? null) || "Unknown",
      });
    }

    rows.push(
      { label: "Modified", value: formatModifiedTime(entityDetails?.modifiedTime) },
      { label: "ID", value: entityId },
    );

    return rows;
  }, [entityDetails?.mimeType, entityDetails?.modifiedTime, entityDetails?.sizeBytes, entityId, entityType, title]);

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
  const infoTitle = entityType === "folder" ? "Folder Info" : "File Info";

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
          className="w-[min(22rem,calc(100vw-1.25rem))] rounded-2xl border border-border/85 bg-card/95 p-2.5 shadow-xl backdrop-blur-md"
        >
          <div className="space-y-2">
            <div className="rounded-xl border border-border/80 bg-muted/65 px-3 py-2.5">
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

            {canCopyContents ? (
              <section className="rounded-xl border border-border/70 bg-card/80 p-1">
                <MenuActionRow
                  icon={<IconFileText className="size-4 text-teal-500 dark:text-teal-300" />}
                  label="Copy Contents"
                  description="Extract and copy all text from this file"
                  onSelect={handleCopyContents}
                  disabled={isCopyingContents}
                />
              </section>
            ) : null}

            <section className="rounded-xl border border-border/75 bg-muted/35 px-2.5 pb-2.5 pt-2">
              <div className="mt-2.5 grid grid-cols-3 gap-2">
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

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-[calc(100%-1.25rem)] gap-3 rounded-2xl border-border/80 p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{infoTitle}</DialogTitle>
            <DialogDescription>
              Metadata snapshot for this {entityType === "folder" ? "folder" : "file"}.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2.5 rounded-xl border border-border/70 bg-muted/25 p-3">
            {infoRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[88px_1fr] gap-2 text-xs">
                <dt className="font-medium text-muted-foreground">{row.label}</dt>
                <dd className="break-all text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
