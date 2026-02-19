"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowUpRight,
  IconCircleCheck,
  IconCloudDown,
  IconDeviceFloppy,
  IconDotsVertical,
  IconShare,
  IconStar,
  IconTag,
  IconTagOff,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { formatFileSize, getMimeLabel } from "@/features/drive/drive.types";
import { cn } from "@/lib/utils";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import { useTagStore } from "@/features/tags/tag.store";
import type { EntityType, Tag } from "@/features/tags/tag.types";
import { Button } from "@/components/ui/button";
import { TagManagerPanel } from "@/components/tags/TagManagerPanel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { shareNativeFile } from "@/features/share/share.service";
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

type RankedTag = {
  id: string;
  name: string;
  color: string;
  updatedAt: number;
};

const QUICK_TAG_LIMIT = 5;
const EMPTY_TAG_IDS: string[] = [];

function triggerHaptic(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

function normalizeTagCandidates(tags: readonly Tag[]): RankedTag[] {
  return [...tags]
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      updatedAt: Math.max(tag.updatedAt, tag.createdAt),
    }))
    .sort((left, right) => right.updatedAt - left.updatedAt);
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
  const hydrationRequestedRef = useRef(false);
  const [isTagDrawerOpen, setIsTagDrawerOpen] = useState(false);
  const {
    tags,
    assignments,
    isHydrated,
    hydrate,
    assignTag,
    removeTagFromEntity,
    toggleStar,
  } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
      isHydrated: state.isHydrated,
      hydrate: state.hydrate,
      assignTag: state.assignTag,
      removeTagFromEntity: state.removeTagFromEntity,
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

  const rankedTags = useMemo(() => normalizeTagCandidates(tags), [tags]);

  const quickTags = useMemo(() => rankedTags.slice(0, QUICK_TAG_LIMIT), [rankedTags]);

  const assignedTags = useMemo(
    () =>
      rankedTags.filter((tag) => {
        return assignedTagIdSet.has(tag.id);
      }),
    [assignedTagIdSet, rankedTags],
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

  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (assignedTagIdSet.has(tagId)) {
        triggerHaptic(6);
        void removeTagFromEntity(entityId, tagId).catch(() => undefined);
        return;
      }

      triggerHaptic(6);
      void assignTag(entityId, tagId, entityType).catch(() => undefined);
    },
    [assignTag, assignedTagIdSet, entityId, entityType, removeTagFromEntity],
  );

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
                "size-10 rounded-lg text-stone-500 transition-all duration-200 hover:-translate-y-px hover:bg-stone-100 hover:text-stone-700 active:scale-[0.98] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200",
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
          className="w-72 rounded-xl border border-stone-200/70 bg-white/95 p-1.5 shadow-xl shadow-stone-900/10 backdrop-blur-md dark:border-stone-700/80 dark:bg-stone-900/95"
        >
        <div className="mb-1 rounded-lg border border-stone-200/70 bg-stone-50/80 px-3 py-2.5 dark:border-stone-700/80 dark:bg-stone-800/70">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
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
                <span className="inline-flex items-center rounded-full border border-stone-300/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:border-stone-600/80 dark:bg-stone-900/70 dark:text-stone-300">
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
            <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
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
            <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
              {isStarred ? "Remove pinned priority" : "Pin this item to the top"}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="min-h-11 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-indigo-50 focus:text-indigo-700 dark:focus:bg-indigo-500/20 dark:focus:text-indigo-200"
          onClick={(event) => {
            event.stopPropagation();
            triggerHaptic(8);
            setIsTagDrawerOpen(true);
          }}
        >
          <IconTag className="size-4 text-indigo-500 dark:text-indigo-300" />
          <div className="flex flex-col gap-0.5">
            <span>Manage Tags</span>
            <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
              Create and organize tags
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
                void shareNativeFile(entityId, title, entityDetails?.mimeType ?? "application/octet-stream");
              }}
            >
              <IconShare className="size-4 text-violet-500 dark:text-violet-300" />
              <div className="flex flex-col gap-0.5">
                <span>Share File</span>
                <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
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
                <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
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
                <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
                  Free storage and keep cloud-only
                </span>
              </div>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1.5 px-2.5">
            <IconTag className="size-3.5" />
            Tags
          </DropdownMenuLabel>

          {quickTags.length > 0 ? (
            quickTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={assignedTagIdSet.has(tag.id)}
                onCheckedChange={() => {
                  handleToggleTag(tag.id);
                }}
                onClick={(event) => event.stopPropagation()}
                className="rounded-lg px-2.5"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <DropdownMenuItem
              disabled
              className="rounded-lg px-2.5 text-stone-500 dark:text-stone-400"
              onClick={(event) => event.stopPropagation()}
            >
              <IconTagOff className="size-4" />
              No tags yet
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        {rankedTags.length > QUICK_TAG_LIMIT ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg px-2.5">
              <IconTag className="size-4 text-stone-500 dark:text-stone-300" />
              Browse all tags
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              {rankedTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={assignedTagIdSet.has(tag.id)}
                  onCheckedChange={() => {
                    handleToggleTag(tag.id);
                  }}
                  className="rounded-lg px-2.5"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}

          {assignedTags.length > 0 ? (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 text-[11px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Applied
                </DropdownMenuLabel>
                {assignedTags.map((tag) => (
                  <DropdownMenuItem
                    key={`assigned-${tag.id}`}
                    className="rounded-lg px-2.5"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleTag(tag.id);
                    }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Remove
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          ) : null}

        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isTagDrawerOpen} onOpenChange={setIsTagDrawerOpen}>
        <DialogContent
          className="top-auto right-auto bottom-0 left-1/2 max-h-[85vh] w-full max-w-[min(42rem,100vw)] -translate-x-1/2 translate-y-0 rounded-t-2xl rounded-b-none border-x border-t border-b-0 border-stone-200 p-0 dark:border-stone-800"
          showCloseButton
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="h-full overflow-y-auto p-4 pb-6">
            <section className="mb-4 rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 dark:border-stone-700/80 dark:bg-stone-900/70">
              <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                {title}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                {mimeLabel}
                {sizeLabel ? ` · ${sizeLabel}` : ""}
                {modifiedLabel ? ` · Updated ${modifiedLabel}` : ""}
              </p>
              {entityType === "file" ? (
                <p className="mt-2 text-xs text-stone-600 dark:text-stone-300">
                  New tags appear as color badges below this file name in both list and grid view.
                </p>
              ) : null}
              <div className="mt-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {assignedTagCountLabel}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assignedTags.length > 0 ? (
                    assignedTags.map((tag) => (
                      <span
                        key={`sheet-assigned-${tag.id}`}
                        className="inline-flex items-center rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: tag.color,
                          color: getTagChipTextColor(tag.color),
                        }}
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      No tags assigned yet.
                    </span>
                  )}
                </div>
              </div>
            </section>
            <TagManagerPanel />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
