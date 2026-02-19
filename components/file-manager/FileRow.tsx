// Design tokens inherited from Dashboard — do not redefine
// Cards: rounded-xl, border-stone-200 bg-white shadow-sm, dark:border-stone-800 dark:bg-stone-900
// Card hover: hover:-translate-y-0.5 hover:shadow-md, active:scale-[0.98]
// Card focus: focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2
// Icon container: h-11 w-11 rounded-lg, shadow-inner on Dashboard FolderCard
// Folder tint: bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400
// File PDF tint: bg-rose-50 text-rose-500, Doc: bg-blue-50 text-blue-500, Image: bg-emerald-50 text-emerald-500
// Typography: title text-sm font-medium, subtitle text-xs text-stone-500
// Transition: transition-all duration-200
// Tag badges: rounded-full, text-[10px] font-semibold

"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  IconCircle,
  IconCircleCheckFilled,
  IconCloudDown,
  IconFile,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypePng,
  IconFolderOpen,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/utils";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import { useTagStore } from "@/features/tags/tag.store";
import { useSelectionStore } from "@/features/selection/selection.store";
import { Button } from "@/components/ui/button";
import { EntityActionsMenu } from "@/components/file-manager/EntityActionsMenu";

type FileRowProps = {
  id: string;
  type: "folder" | "file";
  title: string;
  subtitle: string;
  mimeType: string | null;
  sizeBytes: number;
  modifiedTime: string | null;
  isOffline?: boolean;
  isDownloading?: boolean;
  viewMode: "grid" | "list";
  isOpen: boolean;
  swipeEnabled: boolean;
  onToggleOpen: (id: string | null) => void;
  onOpen?: () => void;
  onMakeOffline?: (sourceElement?: HTMLElement) => void;
  onRemoveOffline?: () => void;
  /** Stagger index for entrance animation */
  animationIndex?: number;
};

type FileTagBadge = {
  id: string;
  name: string;
  color: string;
};

/* Derive file extension for semantic icon + color */
function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

const FILE_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  pdf: IconFileTypePdf,
  docx: IconFileTypeDocx,
  doc: IconFileTypeDocx,
  png: IconFileTypePng,
  jpg: IconFileTypePng,
  jpeg: IconFileTypePng,
  webp: IconFileTypePng,
};

/* Icon color classes — derived from existing Dashboard palette */
function getFileIconColor(extension: string): string {
  switch (extension) {
    case "pdf":
      return "text-rose-500 dark:text-rose-400";
    case "docx":
    case "doc":
      return "text-blue-500 dark:text-blue-400";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "text-emerald-500 dark:text-emerald-400";
    default:
      return "text-stone-500 dark:text-stone-400";
  }
}

/* Icon container background tint — derived from Dashboard palette */
function getFileIconBgClass(extension: string): string {
  switch (extension) {
    case "pdf":
      return "bg-rose-50 dark:bg-rose-950/30";
    case "docx":
    case "doc":
      return "bg-blue-50 dark:bg-blue-950/30";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "bg-emerald-50 dark:bg-emerald-950/30";
    default:
      return "bg-stone-100 dark:bg-stone-800";
  }
}

function renderIcon(isFolder: boolean, ext: string) {
  const Icon = isFolder ? IconFolderOpen : (FILE_ICON_MAP[ext] ?? IconFile);
  return <Icon className="size-5" />;
}

const ACTION_PANEL_WIDTH = 120;
const EMPTY_TAG_IDS: string[] = [];
const FILE_TAG_PREVIEW_LIMIT = 3;

function FileRowComponent({
  id,
  type,
  title,
  subtitle,
  mimeType,
  sizeBytes,
  modifiedTime,
  isOffline = false,
  isDownloading = false,
  viewMode,
  isOpen,
  swipeEnabled,
  onToggleOpen,
  onOpen,
  onMakeOffline,
  onRemoveOffline,
  animationIndex = 0,
}: FileRowProps) {
  const suppressClickRef = useRef(false);
  const isFolder = type === "folder";
  const ext = isFolder ? "" : getFileExtension(title);
  const icon = renderIcon(isFolder, ext);
  const iconColor = isFolder
    ? "text-indigo-600 dark:text-indigo-400"
    : getFileIconColor(ext);
  const iconBg = isFolder
    ? "bg-indigo-50 dark:bg-indigo-950/30"
    : getFileIconBgClass(ext);
  const { isStarred, toggleStar, tags, assignedTagIds } = useTagStore(
    useShallow((state) => ({
      isStarred: Boolean(state.assignments[id]?.starred),
      toggleStar: state.toggleStar,
      tags: state.tags,
      assignedTagIds: state.assignments[id]?.tagIds ?? EMPTY_TAG_IDS,
    })),
  );

  const { isSelectionMode, selectedIds, toggleSelection } = useSelectionStore(
    useShallow((state) => ({
      isSelectionMode: state.isSelectionMode,
      selectedIds: state.selectedIds,
      toggleSelection: state.toggleSelection,
    })),
  );

  const isSelected = selectedIds.has(id);
  const menuStatus = isOffline
    ? "Saved for offline access"
    : isDownloading
      ? "Downloading offline copy"
      : isFolder
        ? "Folder actions"
        : "Online only";
  const fileTags = useMemo<FileTagBadge[]>(() => {
    if (isFolder || assignedTagIds.length === 0) {
      return [];
    }

    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    const mapped: FileTagBadge[] = [];

    for (const tagId of assignedTagIds) {
      const tag = tagById.get(tagId);
      if (!tag) {
        continue;
      }

      mapped.push({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      });
    }

    return mapped;
  }, [assignedTagIds, isFolder, tags]);
  const visibleFileTags = fileTags.slice(0, FILE_TAG_PREVIEW_LIMIT);
  const hiddenTagCount = fileTags.length - visibleFileTags.length;

  const triggerHaptic = (duration = 8) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const handleOpenAction = () => {
    triggerHaptic();
    onOpen?.();
  };

  const handleMakeOfflineAction = (sourceElement?: HTMLElement) => {
    if (isFolder || isOffline || isDownloading) {
      return;
    }

    triggerHaptic();
    onMakeOffline?.(sourceElement);
  };

  const handleRemoveOfflineAction = () => {
    if (!isOffline || isDownloading) {
      return;
    }

    triggerHaptic();
    onRemoveOffline?.();
  };

  const handleToggleStarAction = useCallback(() => {
    triggerHaptic(6);
    void toggleStar(id).catch(() => undefined);
  }, [id, toggleStar]);

  const renderActionMenu = () => (
    <EntityActionsMenu
      entityId={id}
      entityType={isFolder ? "folder" : "file"}
      title={title}
      description={menuStatus}
      entityDetails={{
        mimeType,
        sizeBytes,
        modifiedTime,
      }}
      align="end"
      triggerClassName="size-11"
      onOpen={handleOpenAction}
      onMakeOffline={(sourceElement) => {
        handleMakeOfflineAction(sourceElement);
      }}
      onRemoveOffline={handleRemoveOfflineAction}
      isOffline={isOffline}
      isDownloading={isDownloading}
    />
  );

  const renderTagBadges = () => {
    if (isFolder || visibleFileTags.length === 0) {
      return null;
    }

    return (
      <div
        className="mt-1.5 flex flex-wrap gap-1"
        aria-label={`${fileTags.length} tags applied`}
      >
        {visibleFileTags.map((tag) => (
          <span
            key={`${id}-tag-${tag.id}`}
            className="inline-flex max-w-full items-center truncate rounded-full border border-black/10 px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: tag.color,
              color: getTagChipTextColor(tag.color),
            }}
          >
            {tag.name}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-stone-300 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:border-stone-600 dark:text-stone-300">
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>
    );
  };

  const renderStatusBadge = () => {
    if (isFolder) return null;

    if (isOffline) {
      return (
        <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-300/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          Offline
        </span>
      );
    }

    if (isDownloading) {
      return (
        <span className="inline-flex shrink-0 items-center rounded-full border border-sky-300/80 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
          Syncing
        </span>
      );
    }

    return null;
  };

  /* ─── Grid View ─── */
  if (viewMode === "grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen?.();
          }
        }}
        className={cn(
          "group card-entrance relative cursor-pointer rounded-xl border p-4 shadow-sm transition-all duration-200 data-[compact=true]:p-3",
          "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2",
          isSelected && "ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30",
          !isSelected && isFolder
            ? "border-indigo-200/40 bg-indigo-50/40 dark:border-indigo-800/40 dark:bg-indigo-950/20"
            : !isSelected && "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
        )}
        style={{ animationDelay: `${animationIndex * 40}ms` }}
      >
        <div className="absolute left-2 top-2 z-20">
          <AnimatePresence>
            {(isSelectionMode || isSelected) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(5);
                  toggleSelection(id);
                }}
                className="flex size-6 items-center justify-center rounded-full bg-white/80 text-stone-400 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-stone-600 dark:bg-stone-900/80 dark:hover:bg-stone-800"
              >
                {isSelected ? (
                  <IconCircleCheckFilled className="size-6 text-indigo-500 dark:text-indigo-400" />
                ) : (
                  <IconCircle className="size-6" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {renderActionMenu()}
        </div>

        <div className="space-y-3">
          {/* Icon container */}
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200",
              iconBg,
              iconColor,
            )}
          >
            {icon}
          </div>
          <div className="space-y-1 pr-8">
            <div
              className={cn(
                "flex items-center gap-1.5 text-stone-900 dark:text-stone-100",
                isFolder
                  ? "text-base font-medium tracking-tight"
                  : "text-sm font-medium",
              )}
            >
              <span className="line-clamp-2">{title}</span>
              {renderStatusBadge()}
              {isStarred ? (
                <IconStar className="size-3.5 shrink-0 text-amber-500 dark:text-amber-300" />
              ) : null}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {subtitle}
            </p>
            {renderTagBadges()}
          </div>
        </div>
      </div>
    );
  }

  /* ─── List View ─── */
  const handleDragStart = () => {
    suppressClickRef.current = true;
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -60) {
      onToggleOpen(id);
    } else {
      onToggleOpen(null);
    }

    requestAnimationFrame(() => {
      suppressClickRef.current = false;
    });
  };

  const handleRowClick = () => {
    if (suppressClickRef.current) return;
    
    if (isSelectionMode) {
      triggerHaptic(5);
      toggleSelection(id);
      return;
    }

    if (isOpen) {
      onToggleOpen(null);
      return;
    }
    onOpen?.();
  };

  return (
    <div
      className="card-entrance relative overflow-hidden rounded-xl"
      style={{ animationDelay: `${animationIndex * 40}ms` }}
    >
      {/* Swipe action panel — static behind content */}
      <div className="absolute inset-y-0 right-0 z-0 flex w-[120px] items-center justify-around bg-linear-to-l from-stone-900 to-stone-800 dark:from-stone-800 dark:to-stone-700">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isStarred ? "Unstar item" : "Star item"}
          className={cn(
            "flex size-11 items-center justify-center rounded-md transition-colors duration-200 hover:bg-stone-700",
            isStarred
              ? "text-amber-300 hover:text-amber-200"
              : "text-amber-500 hover:text-amber-300",
          )}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleStarAction();
          }}
        >
          <IconStar className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Make available offline"
          className={cn(
            "flex size-11 items-center justify-center rounded-md transition-colors duration-200 active:scale-[0.96]",
            isFolder || isOffline || isDownloading
              ? "cursor-not-allowed text-stone-500"
              : "text-sky-400 hover:bg-stone-700 hover:text-sky-300",
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (!isFolder && !isOffline && !isDownloading) {
              handleMakeOfflineAction(event.currentTarget);
            }
          }}
          disabled={isFolder || isOffline || isDownloading}
        >
          <IconCloudDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete"
          className="flex size-11 items-center justify-center rounded-md text-rose-400 transition-colors duration-200 hover:bg-stone-700 hover:text-rose-300"
          onClick={(event) => event.stopPropagation()}
        >
          <IconTrash className="size-4" />
        </Button>
      </div>

      {/* Draggable content layer */}
      <motion.div
        drag={swipeEnabled ? "x" : false}
        dragConstraints={{ left: -ACTION_PANEL_WIDTH, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -ACTION_PANEL_WIDTH : 0 }}
        transition={{ type: "spring", stiffness: 230, damping: 28, mass: 0.6 }}
        className={cn(
          "relative z-10 cursor-pointer rounded-xl border shadow-sm transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]",
          "focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2",
          isOpen && !isSelected && "ring-1 ring-indigo-400/30",
          isSelected && "ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30",
          !isSelected && isFolder
            ? "border-indigo-200/70 bg-indigo-50 dark:border-indigo-800/50 dark:bg-stone-900"
            : !isSelected && "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
        )}
        onClick={handleRowClick}
      >
        <div className="flex min-h-[64px] items-center gap-3 px-4 py-3 data-[compact=true]:min-h-[52px] data-[compact=true]:px-3 data-[compact=true]:py-2">
          
          {/* Checkbox Overlay for List View */}
          <AnimatePresence>
            {(isSelectionMode || isSelected) && (
              <motion.button
                initial={{ opacity: 0, width: 0, paddingRight: 0 }}
                animate={{ opacity: 1, width: "auto", paddingRight: 4 }}
                exit={{ opacity: 0, width: 0, paddingRight: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(5);
                  toggleSelection(id);
                }}
                className="flex items-center justify-center text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
              >
                {isSelected ? (
                  <IconCircleCheckFilled className="size-6 text-indigo-500 dark:text-indigo-400" />
                ) : (
                  <IconCircle className="size-6" />
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Icon container */}
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 data-[compact=true]:h-9 data-[compact=true]:w-9",
              iconBg,
              iconColor,
            )}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "flex items-center gap-1.5 truncate text-stone-900 dark:text-stone-100",
                isFolder
                  ? "text-sm font-medium tracking-tight"
                  : "text-sm font-medium",
              )}
            >
              <span className="truncate">{title}</span>
              {renderStatusBadge()}
              {isStarred ? (
                <IconStar className="size-3.5 shrink-0 text-amber-500 dark:text-amber-300" />
              ) : null}
            </div>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
              {subtitle}
            </p>
            {renderTagBadges()}
          </div>

          {renderActionMenu()}
        </div>
      </motion.div>
    </div>
  );
}

export const FileRow = memo(FileRowComponent);
FileRow.displayName = "FileRow";
