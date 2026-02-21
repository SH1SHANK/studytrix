// Design tokens inherited from Dashboard — do not redefine
// Cards: rounded-xl, border-border bg-card shadow-sm
// Card hover: hover:-translate-y-0.5 hover:shadow-md, active:scale-[0.98]
// Card focus: focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
// Icon container: h-11 w-11 rounded-lg, shadow-inner on Dashboard FolderCard
// Folder tint: bg-primary/10 text-primary
// File icon tint: derived from semantic theme tokens via color-mix
// Typography: title text-sm font-medium, subtitle text-xs text-muted-foreground
// Transition: transition-all duration-200
// Tag badges: rounded-full, text-[10px] font-semibold

"use client";

import { memo, useCallback, useMemo, useRef, type CSSProperties } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
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
  IconStarFilled,
  IconTag,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/utils";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import { useTagStore } from "@/features/tags/tag.store";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
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
  compact?: boolean;
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

/* Map file extensions to semantic theme tokens */
function getFileToneVar(extension: string): string {
  switch (extension) {
    case "pdf":
      return "--destructive";
    case "docx":
    case "doc":
      return "--primary";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "--chart-3";
    default:
      return "--muted-foreground";
  }
}

function getFileIconStyle(extension: string): CSSProperties {
  const toneVar = getFileToneVar(extension);
  if (toneVar === "--muted-foreground") {
    return {
      color: "var(--muted-foreground)",
      backgroundColor: "var(--muted)",
    };
  }

  return {
    color: `var(${toneVar})`,
    backgroundColor: `color-mix(in oklab, var(${toneVar}) 16%, var(--card))`,
  };
}

function renderIcon(isFolder: boolean, ext: string) {
  const Icon = isFolder ? IconFolderOpen : (FILE_ICON_MAP[ext] ?? IconFile);
  return <Icon className="size-5" />;
}

const ACTION_PANEL_WIDTH = 210;
const SNAP_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 250;
const EMPTY_TAG_IDS: string[] = [];
const FILE_TAG_PREVIEW_LIMIT = 3;

const SPRING_CONFIG = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.8 };

function triggerHaptic(duration = 8) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

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
  compact = false,
}: FileRowProps) {
  const suppressClickRef = useRef(false);
  const isFolder = type === "folder";
  const ext = isFolder ? "" : getFileExtension(title);
  const icon = renderIcon(isFolder, ext);
  const fileIconStyle = isFolder ? undefined : getFileIconStyle(ext);
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

  const { openDrawer } = useTagAssignmentStore(
    useShallow((state) => ({
      openDrawer: state.openDrawer,
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

  const handleManageTagsAction = useCallback(() => {
    triggerHaptic();
    openDrawer([{ id, type: isFolder ? "folder" : "file" }]);
  }, [id, isFolder, openDrawer]);

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
            className="inline-flex max-w-full items-center truncate rounded-full border border-border/30 px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: tag.color,
              color: getTagChipTextColor(tag.color),
            }}
          >
            {tag.name}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>
    );
  };

  const renderStatusBadge = () => {
    if (isOffline) {
      return (
        <span className="inline-flex shrink-0 items-center rounded-full border border-primary/35 bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          Offline
        </span>
      );
    }

    if (isDownloading) {
      return (
        <span className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Syncing
        </span>
      );
    }

    return null;
  };

  // Motion values for swipe
  const x = useMotionValue(0);
  const progress = useTransform(
    x,
    [-ACTION_PANEL_WIDTH, -ACTION_PANEL_WIDTH * 0.3, 0],
    [1, 0.3, 0],
  );
  const starOpacity = useTransform(progress, [0, 0.25, 0.6], [0, 0, 1]);
  const offlineOpacity = useTransform(progress, [0, 0.35, 0.7], [0, 0, 1]);
  const tagsOpacity = useTransform(progress, [0, 0.45, 0.8], [0, 0, 1]);

  const snapOpen = useCallback(() => {
    triggerHaptic(6);
    void animate(x, -ACTION_PANEL_WIDTH, SPRING_CONFIG);
    onToggleOpen(id);
  }, [id, onToggleOpen, x]);

  const snapClose = useCallback(() => {
    void animate(x, 0, SPRING_CONFIG);
    onToggleOpen(null);
  }, [onToggleOpen, x]);

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
          "group card-entrance relative cursor-pointer rounded-xl border shadow-sm transition-all duration-200",
          compact ? "p-3" : "p-4",
          "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
          isSelected && "ring-2 ring-ring bg-primary/10",
          !isSelected && isStarred && "border-amber-300 bg-gradient-to-br from-amber-50/80 to-amber-100/30 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-amber-950/15 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/25",
          !isSelected && !isStarred && isFolder && "border-primary/20 bg-primary/5",
          !isSelected && !isStarred && (!isFolder) && "border-border bg-card",
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
                className="flex size-6 items-center justify-center rounded-full bg-card/80 text-muted-foreground/80 shadow-sm backdrop-blur-md transition-colors hover:bg-card hover:text-muted-foreground"
              >
                {isSelected ? (
                  <IconCircleCheckFilled className="size-6 text-primary" />
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
              "flex items-center justify-center rounded-lg transition-colors duration-200",
              compact ? "h-9 w-9" : "h-11 w-11",
              isFolder && "bg-primary/10 text-primary",
            )}
            style={fileIconStyle}
          >
            {icon}
          </div>
          <div className="space-y-1 pr-8">
            <div
              className={cn(
                "flex items-center gap-1.5 text-foreground",
                isFolder
                  ? "text-base font-medium tracking-tight"
                  : "text-sm font-medium",
              )}
            >
              <span className="line-clamp-2">{title}</span>
              {renderStatusBadge()}
              {isStarred ? (
                <IconStarFilled className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
            {renderTagBadges()}
          </div>
        </div>
      </div>
    );
  }

  /* ─── List View (swipeable) ─── */

  // Sync with parent open state
  const currentX = x.get();
  if (isOpen && currentX > -ACTION_PANEL_WIDTH + 5) {
    void animate(x, -ACTION_PANEL_WIDTH, SPRING_CONFIG);
  } else if (!isOpen && currentX < -5) {
    void animate(x, 0, SPRING_CONFIG);
  }

  const handleDragStart = () => {
    suppressClickRef.current = true;
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const shouldOpen =
      info.offset.x < -SNAP_THRESHOLD ||
      info.velocity.x < -VELOCITY_THRESHOLD;

    if (shouldOpen) {
      snapOpen();
    } else {
      snapClose();
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

    if (x.get() < -10) {
      snapClose();
      return;
    }
    onOpen?.();
  };

  return (
    <div
      className="card-entrance relative overflow-hidden rounded-xl"
      style={{ animationDelay: `${animationIndex * 40}ms` }}
    >
      {/* ── Swipe Action Panel ─────────────────────────────── */}
      <motion.div
        className="absolute inset-y-0 right-0 z-0 flex w-[210px] items-center justify-around rounded-r-xl bg-gradient-to-l from-muted/95 via-muted/85 to-muted/70 px-1"
        style={{ opacity: progress }}
      >
        {/* Star */}
        <motion.div style={{ opacity: starOpacity }}>
          <Button
            type="button"
            variant="ghost"
            aria-label={isStarred ? "Unstar item" : "Star item"}
            className={cn(
              "flex h-14 w-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors duration-150",
              isStarred
                ? "text-amber-300 hover:bg-amber-500/15 hover:text-amber-200"
                : "text-amber-500 hover:bg-amber-500/15 hover:text-amber-300",
            )}
            onClick={(event) => {
              event.stopPropagation();
              handleToggleStarAction();
            }}
          >
            {isStarred ? <IconStarFilled className="size-5" /> : <IconStar className="size-5" />}
            <span>{isStarred ? "Unstar" : "Star"}</span>
          </Button>
        </motion.div>

        {/* Offline */}
        <motion.div style={{ opacity: offlineOpacity }}>
          <Button
            type="button"
            variant="ghost"
            aria-label="Make available offline"
            className={cn(
              "flex h-14 w-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors duration-150",
              isFolder || isOffline || isDownloading
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-sky-400 hover:bg-sky-500/15 hover:text-sky-300",
            )}
            onClick={(event) => {
              event.stopPropagation();
              if (!isFolder && !isOffline && !isDownloading) {
                handleMakeOfflineAction(event.currentTarget);
              }
            }}
            disabled={isFolder || isOffline || isDownloading}
          >
            <IconCloudDown className="size-5" />
            <span>Offline</span>
          </Button>
        </motion.div>

        {/* Tags */}
        <motion.div style={{ opacity: tagsOpacity }}>
          <Button
            type="button"
            variant="ghost"
            aria-label="Manage Tags"
            className="flex h-14 w-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-primary transition-colors duration-150 hover:bg-primary/15 hover:text-primary"
            onClick={(event) => {
              event.stopPropagation();
              handleManageTagsAction();
            }}
          >
            <IconTag className="size-5" />
            <span>Tags</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* ── Draggable Content ─────────────────────────────── */}
      <motion.div
        className={cn(
          "relative z-10 cursor-pointer rounded-xl border shadow-sm transition-shadow duration-200",
          "hover:shadow-md active:scale-[0.99]",
          "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
          isOpen && !isSelected && "ring-1 ring-ring/35",
          isSelected && "ring-2 ring-ring bg-primary/10",
          !isSelected && isStarred && "border-amber-300 bg-gradient-to-r from-amber-50/80 to-amber-50/10 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-amber-950/15 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/20",
          !isSelected && !isStarred && isFolder && "border-primary/25 bg-primary/8",
          !isSelected && !isStarred && (!isFolder) && "border-border bg-card",
        )}
        style={{ x, touchAction: "pan-y" }}
        drag={swipeEnabled ? "x" : false}
        dragConstraints={{ left: -ACTION_PANEL_WIDTH, right: 0 }}
        dragDirectionLock
        dragElastic={0.08}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            compact ? "min-h-[52px] px-3 py-2" : "min-h-[64px] px-4 py-3",
          )}
        >

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
                className="flex items-center justify-center text-muted-foreground/80 transition-colors hover:text-muted-foreground"
              >
                {isSelected ? (
                  <IconCircleCheckFilled className="size-6 text-primary" />
                ) : (
                  <IconCircle className="size-6" />
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Icon container */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
              compact ? "h-9 w-9" : "h-11 w-11",
              isFolder && "bg-primary/10 text-primary",
            )}
            style={fileIconStyle}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "flex items-center gap-1.5 truncate text-foreground",
                isFolder
                  ? "text-sm font-medium tracking-tight"
                  : "text-sm font-medium",
              )}
            >
              <span className="truncate">{title}</span>
              {renderStatusBadge()}
              {isStarred ? (
                <IconStarFilled className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
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
