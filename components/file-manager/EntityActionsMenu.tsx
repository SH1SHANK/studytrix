"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  IconArrowUpRight,
  IconCircleCheck,
  IconCloudDown,
  IconCopy,
  IconDeviceFloppy,
  IconDownload,
  IconDotsVertical,
  IconShare,
  IconStar,
  IconTag,
} from "@tabler/icons-react";
import { usePathname, useSearchParams } from "next/navigation";
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
import {
  buildFolderRouteHref,
  parseFolderTrailParam,
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
} from "@/features/navigation/folder-trail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EntityActionsMenuProps = {
  entityId: string;
  entityType: EntityType;
  title: string;
  description?: string;
  entityDetails?: {
    mimeType?: string | null;
    sizeBytes?: number | null;
    modifiedTime?: string | null;
  };
  align?: "start" | "end";
  triggerClassName?: string;
  onOpen?: () => void;
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

function toAbsoluteUrl(pathOrUrl: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return new URL(pathOrUrl, window.location.origin).toString();
  } catch {
    return null;
  }
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

function triggerFileDownload(path: string, fileName: string): void {
  const anchor = document.createElement("a");
  anchor.href = path;
  anchor.download = sanitizeDownloadFileName(fileName);
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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

export function EntityActionsMenu({
  entityId,
  entityType,
  title,
  description,
  entityDetails,
  align = "end",
  triggerClassName,
  onOpen,
  onMakeOffline,
  onRemoveOffline,
  isOffline = false,
  isDownloading = false,
}: EntityActionsMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  // Previously restricted offline actions and share to 'file' only. We now allow it for 'folder' as well.
  const supportsOfflineActions = true;

  const handleToggleStar = useCallback(() => {
    triggerHaptic();
    void toggleStar(entityId).catch(() => undefined);
  }, [entityId, toggleStar]);
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathDepartment = pathSegments[0]?.trim().toUpperCase() ?? "";
  const pathSemester = pathSegments[1]?.trim() ?? "";
  const pathFolderId = pathSegments[2]?.trim() ?? "";
  const isAcademicRoute = pathDepartment.length > 0 && pathSemester.length > 0;
  const currentTrailLabels = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_QUERY_PARAM));
  const currentTrailIds = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_IDS_QUERY_PARAM));

  const fileStreamPath = `/api/file/${encodeURIComponent(entityId)}/stream`;
  const fileCopyLink = toAbsoluteUrl(fileStreamPath);
  const folderRoutePath = entityType === "folder"
    ? (() => {
      if (isAcademicRoute) {
        const fallbackLabel = (searchParams.get("name") ?? "").trim();
        const trailLabels = currentTrailLabels.length > 0
          ? currentTrailLabels
          : (fallbackLabel ? [fallbackLabel] : []);
        const trailIds = currentTrailIds.length > 0
          ? currentTrailIds
          : (pathFolderId ? [pathFolderId] : []);

        return buildFolderRouteHref({
          departmentId: pathDepartment,
          semesterId: pathSemester,
          folderId: entityId,
          folderName: title,
          trailLabels: [...trailLabels, title],
          trailIds: [...trailIds, entityId],
        });
      }

      const queryDepartment = (searchParams.get("department") ?? "").trim().toUpperCase();
      const querySemester = (searchParams.get("semester") ?? "").trim();
      if (queryDepartment && querySemester) {
        return buildFolderRouteHref({
          departmentId: queryDepartment,
          semesterId: querySemester,
          folderId: entityId,
          folderName: title,
          trailLabels: [title],
          trailIds: [entityId],
        });
      }

      return null;
    })()
    : null;
  const folderCopyLink = folderRoutePath ? toAbsoluteUrl(folderRoutePath) : null;

  const handleCopyLink = useCallback(() => {
    const linkToCopy = entityType === "folder" ? folderCopyLink : fileCopyLink;
    if (!linkToCopy) {
      toast.error("Could not prepare link for this item.");
      return;
    }

    triggerHaptic(6);
    void copyToClipboard(linkToCopy).then((copied) => {
      if (copied) {
        toast.success(entityType === "folder" ? "Folder link copied." : "File link copied.");
        return;
      }

      toast.error("Clipboard is not available in this browser.");
    });
  }, [entityType, fileCopyLink, folderCopyLink]);

  const handleDownload = useCallback(() => {
    triggerHaptic();

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

    triggerFileDownload(fileStreamPath, title);
    toast.success(`Downloading "${title}"`);
  }, [entityId, entityType, fileStreamPath, title]);

  return (
    <>
      <DropdownMenu>
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
          className="w-72 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md"
        >
          <div className="mb-1 rounded-lg border border-border/80 bg-muted/70 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {description ?? "Quick actions"}
            </p>
            {supportsOfflineActions ? (
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
            ) : null}
          </div>

          <DropdownMenuItem
            className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-indigo-50 focus:text-indigo-700 dark:focus:bg-indigo-500/20 dark:focus:text-indigo-200"
            onClick={(event) => {
              event.stopPropagation();
              triggerHaptic();
              onOpen?.();
            }}
          >
            <IconArrowUpRight className="size-4 text-indigo-500 dark:text-indigo-300" />
            <div className="flex flex-col gap-0.5">
              <span>{entityType === "folder" ? "Open Folder" : "Open File"}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {entityType === "folder" ? "Navigate into this folder" : "Open preview"}
              </span>
            </div>
          </DropdownMenuItem>

        <DropdownMenuItem
          className="min-h-11 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-amber-50 focus:text-amber-700 dark:focus:bg-amber-500/20 dark:focus:text-amber-200"
          onClick={(event) => {
            event.stopPropagation();
            handleToggleStar();
          }}
        >
          <IconStar className="size-4 text-amber-500 dark:text-amber-300" />
          <div className="flex flex-col gap-0.5">
            <span>{isStarred ? "Unstar" : "Star"}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {isStarred ? "Remove pinned priority" : "Pin this item to the top"}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="min-h-11 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-indigo-50 focus:text-indigo-700 dark:focus:bg-indigo-500/20 dark:focus:text-indigo-200"
          onClick={(event) => {
            event.stopPropagation();
            triggerHaptic(8);
            useTagAssignmentStore.getState().openDrawer([
              { id: entityId, type: entityType },
            ]);
          }}
        >
          <IconTag className="size-4 text-indigo-500 dark:text-indigo-300" />
          <div className="flex flex-col gap-0.5">
            <span>Assign Tags</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Categorize and organize
            </span>
          </div>
        </DropdownMenuItem>



        {supportsOfflineActions ? (
          <>
            <DropdownMenuItem
              className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-violet-50 focus:text-violet-700 disabled:opacity-45 dark:focus:bg-violet-500/20 dark:focus:text-violet-200"
              onClick={(event) => {
                event.stopPropagation();
                triggerHaptic();
                
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

                      if (summary.failedFiles.length > 0) {
                        const preview = summary.failedFiles.slice(0, 3).join(", ");
                        const remainder = summary.failedFiles.length - Math.min(summary.failedFiles.length, 3);
                        shareStore.setError(
                          remainder > 0
                            ? `${summary.failedFiles.length} files could not be included (${preview} and ${remainder} more).`
                            : `${summary.failedFiles.length} files could not be included (${preview}).`,
                        );
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
                } else {
                  void shareNativeFile(entityId, title, entityDetails?.mimeType ?? "application/octet-stream");
                }
              }}
            >
              <IconShare className="size-4 text-violet-500 dark:text-violet-300" />
              <div className="flex flex-col gap-0.5">
                <span>{entityType === "folder" ? "Share Folder" : "Share File"}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {entityType === "folder" ? "Send as a ZIP archive" : "Send to people, apps, or AI chatbots"}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-sky-50 focus:text-sky-700 disabled:opacity-45 dark:focus:bg-sky-500/20 dark:focus:text-sky-200"
              onClick={(event) => {
                event.stopPropagation();
                handleDownload();
              }}
            >
              <IconDownload className="size-4 text-sky-500 dark:text-sky-300" />
              <div className="flex flex-col gap-0.5">
                <span>{entityType === "folder" ? "Download Folder ZIP" : "Download File"}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {entityType === "folder" ? "Create and save a ZIP archive" : "Save a local copy to this device"}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="min-h-11 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-100"
              onClick={(event) => {
                event.stopPropagation();
                handleCopyLink();
              }}
            >
              <IconCopy className="size-4 text-slate-500 dark:text-slate-300" />
              <div className="flex flex-col gap-0.5">
                <span>{entityType === "folder" ? "Copy Folder Link" : "Copy File Link"}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Paste into notes, chat, or browser
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-sky-50 focus:text-sky-700 disabled:opacity-45 dark:focus:bg-sky-500/20 dark:focus:text-sky-200"
              onClick={(event) => {
                event.stopPropagation();
                if (isOffline || isDownloading) {
                  return;
                }
                triggerHaptic();
                
                if (entityType === "folder") {
                  const downloadPromise = expandFolders([entityId])
                    .then((files) => {
                      if (files.length === 0) {
                        throw new Error("Folder is empty");
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
                    error: (err) => err instanceof Error ? err.message : `Failed to download "${title}"`,
                  });
                } else {
                  onMakeOffline?.(event.currentTarget as HTMLElement);
                }
              }}
              disabled={isOffline || isDownloading}
            >
              {isOffline ? (
                <IconCircleCheck className="size-4 text-emerald-500 dark:text-emerald-300" />
              ) : (
                <IconDeviceFloppy className="size-4 text-sky-500 dark:text-sky-300" />
              )}
              <div className="flex flex-col gap-0.5">
                <span>
                  {isOffline
                    ? "Already Offline"
                    : isDownloading
                      ? "Downloading..."
                      : "Save Offline Copy"}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {isOffline
                    ? "This file is available without internet"
                    : "Download for quick offline access"}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-rose-50 focus:text-rose-700 disabled:opacity-45 dark:focus:bg-rose-500/20 dark:focus:text-rose-200"
              onClick={(event) => {
                event.stopPropagation();
                if (!isOffline || isDownloading) {
                  return;
                }
                triggerHaptic();
                onRemoveOffline?.();
              }}
              disabled={!isOffline || isDownloading}
            >
              <IconCloudDown className="size-4 text-rose-500 dark:text-rose-300" />
              <div className="flex flex-col gap-0.5">
                <span>Remove Offline Copy</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Free storage and keep cloud-only
                </span>
              </div>
            </DropdownMenuItem>
          </>
        ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
