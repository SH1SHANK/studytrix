"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowUpRight,
  IconArchive,
  IconCircleCheck,
  IconCloudDown,
  IconDeviceFloppy,
  IconDotsVertical,
  IconShare,
  IconStar,
  IconTag,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { formatFileSize, getMimeLabel } from "@/features/drive/drive.types";
import { cn } from "@/lib/utils";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import { useTagStore } from "@/features/tags/tag.store";
import type { EntityType, Tag } from "@/features/tags/tag.types";
import { Button } from "@/components/ui/button";
import { shareNativeFile } from "@/features/share/share.service";
import { downloadFolderAsZip, shareFolderAsZip } from "@/features/folder/folder.zip";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

const EMPTY_TAG_IDS: string[] = [];

function triggerHaptic(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}


function formatModifiedTimeLabel(modifiedTime: string | null | undefined): string {
  if (!modifiedTime) {
    return "";
  }

  const timestamp = Date.parse(modifiedTime);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
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
  const [folderZipBusy, setFolderZipBusy] = useState(false);
  const hydrationRequestedRef = useRef(false);
  const {
    tags,
    assignments,
    isHydrated,
    hydrate,
    toggleStar,
  } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
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
  const assignedTagIds = assignment?.tagIds ?? EMPTY_TAG_IDS;
  const assignedTagIdSet = useMemo(() => new Set(assignedTagIds), [assignedTagIds]);
  const isStarred = assignment?.starred ?? false;
  const supportsOfflineActions = entityType === "file";

  const assignedTags = useMemo(
    () => tags.filter((tag) => assignedTagIdSet.has(tag.id)),
    [assignedTagIdSet, tags],
  );

  const sizeLabel =
    entityType === "file" ? formatFileSize(entityDetails?.sizeBytes ?? null) : "";
  const mimeLabel =
    entityType === "file"
      ? getMimeLabel(entityDetails?.mimeType ?? "", title)
      : "Folder";
  const modifiedLabel = formatModifiedTimeLabel(entityDetails?.modifiedTime ?? null);
  const assignedTagCountLabel =
    assignedTags.length === 1 ? "1 tag applied" : `${assignedTags.length} tags applied`;

  const handleToggleStar = useCallback(() => {
    triggerHaptic();
    void toggleStar(entityId).catch(() => undefined);
  }, [entityId, toggleStar]);

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

        {entityType === "folder" ? (
          <>
            <DropdownMenuItem
              className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-sky-50 focus:text-sky-700 disabled:opacity-45 dark:focus:bg-sky-500/20 dark:focus:text-sky-200"
              onClick={(event) => {
                event.stopPropagation();
                if (folderZipBusy) {
                  return;
                }
                triggerHaptic();
                setFolderZipBusy(true);
                void downloadFolderAsZip(entityId, title)
                  .catch(() => undefined)
                  .finally(() => setFolderZipBusy(false));
              }}
              disabled={folderZipBusy}
            >
              <IconArchive className="size-4 text-sky-500 dark:text-sky-300" />
              <div className="flex flex-col gap-0.5">
                <span>{folderZipBusy ? "Preparing..." : "Download Folder (.zip)"}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Zip and download complete folder contents
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-violet-50 focus:text-violet-700 disabled:opacity-45 dark:focus:bg-violet-500/20 dark:focus:text-violet-200"
              onClick={(event) => {
                event.stopPropagation();
                if (folderZipBusy) {
                  return;
                }
                triggerHaptic();
                setFolderZipBusy(true);
                void shareFolderAsZip(entityId, title)
                  .catch(() => undefined)
                  .finally(() => setFolderZipBusy(false));
              }}
              disabled={folderZipBusy}
            >
              <IconShare className="size-4 text-violet-500 dark:text-violet-300" />
              <div className="flex flex-col gap-0.5">
                <span>{folderZipBusy ? "Preparing..." : "Share Folder (.zip)"}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Share zipped folder via system share sheet
                </span>
              </div>
            </DropdownMenuItem>
          </>
        ) : null}

        {supportsOfflineActions ? (
          <>
            <DropdownMenuItem
              className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-violet-50 focus:text-violet-700 disabled:opacity-45 dark:focus:bg-violet-500/20 dark:focus:text-violet-200"
              onClick={(event) => {
                event.stopPropagation();
                triggerHaptic();
                void shareNativeFile(entityId, title, entityDetails?.mimeType ?? "application/octet-stream");
              }}
            >
              <IconShare className="size-4 text-violet-500 dark:text-violet-300" />
              <div className="flex flex-col gap-0.5">
                <span>Share File</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Send to people, apps, or AI chatbots
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
                onMakeOffline?.(event.currentTarget as HTMLElement);
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
