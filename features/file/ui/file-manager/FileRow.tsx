"use client";

import { memo, useMemo } from "react";
import {
  File as IconFile,
  FileText as IconFileTypePdf,
  FileText as IconFileTypeDocx,
  FileImage as IconFileTypePng,
  Folder as IconFolder,
  FolderOpen as IconFolderOpen,
  CheckCircle2 as IconCircleCheckFilled,
  Circle as IconCircle,
  CloudDownload as IconCloudDown,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/utils";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import { useTagStore } from "@/features/tags/tag.store";
import { useSelectionStore } from "@/features/selection/selection.store";
import { EntityActionsMenu } from "@/features/file/ui/file-manager/EntityActionsMenu";

type FileRowProps = {
  id: string;
  type: "folder" | "file";
  title: string;
  subtitle: string;
  mimeType: string | null;
  sizeBytes: number;
  modifiedTime: string | null;
  webViewLink: string | null;
  isOffline?: boolean;
  isDownloading?: boolean;
  viewMode: "grid" | "list";
  isOpen: boolean;
  parentFolderId?: string | null;
  fullPath?: string | null;
  onToggleOpen?: (id: string | null) => void;
  onOpen?: () => void;
  onMakeOffline?: (sourceElement?: HTMLElement) => void;
  onRemoveOffline?: () => void;
  animationIndex?: number;
  compact?: boolean;
};

type FileTagBadge = {
  id: string;
  name: string;
  color: string;
};

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

const FILE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: IconFileTypePdf,
  docx: IconFileTypeDocx,
  doc: IconFileTypeDocx,
  png: IconFileTypePng,
  jpg: IconFileTypePng,
  jpeg: IconFileTypePng,
  webp: IconFileTypePng,
};

function getFileToneVar(extension: string): string {
  switch (extension) {
    case "pdf":
      return "--color-file-pdf";
    case "docx":
    case "doc":
      return "--color-file-docx";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "--color-file-image";
    default:
      return "--color-file-other";
  }
}

const FILE_TAG_PREVIEW_LIMIT = 2;

function triggerHaptic(duration = 8): void {
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore vibration errors
    }
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
  webViewLink,
  isOffline = false,
  isDownloading = false,
  viewMode,
  isOpen,
  onOpen,
  onMakeOffline,
  onRemoveOffline,
}: FileRowProps) {
  const isFolder = type === "folder";
  const ext = useMemo(() => (isFolder ? "" : getFileExtension(title)), [isFolder, title]);

  const { tags, assignedTagIds } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignedTagIds: state.assignments[id]?.tagIds ?? [],
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
    if (isFolder || assignedTagIds.length === 0) return [];
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    const mapped: FileTagBadge[] = [];
    for (const tagId of assignedTagIds) {
      const tag = tagById.get(tagId);
      if (tag) {
        mapped.push({ id: tag.id, name: tag.name, color: tag.color });
      }
    }
    return mapped;
  }, [assignedTagIds, isFolder, tags]);

  const visibleFileTags = fileTags.slice(0, FILE_TAG_PREVIEW_LIMIT);
  const hiddenTagCount = fileTags.length - visibleFileTags.length;

  const handleMakeOfflineAction = (sourceElement?: HTMLElement) => {
    if (isFolder || isOffline || isDownloading) return;
    triggerHaptic();
    onMakeOffline?.(sourceElement);
  };

  const handleRemoveOfflineAction = () => {
    if (!isOffline || isDownloading) return;
    triggerHaptic();
    onRemoveOffline?.();
  };

  const renderIcon = () => {
    if (isFolder) {
      return (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          {isOpen ? <IconFolderOpen className="size-5" /> : <IconFolder className="size-5" />}
        </div>
      );
    }

    const IconComp = FILE_ICON_MAP[ext] || IconFile;
    const toneVar = getFileToneVar(ext);

    return (
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors"
        style={{
          backgroundColor: `color-mix(in srgb, var(${toneVar}, var(--primary)) 12%, transparent)`,
          color: `var(${toneVar}, var(--primary))`,
        }}
      >
        <IconComp className="size-5" />
      </div>
    );
  };

  const renderActionMenu = () => (
    <EntityActionsMenu
      entityId={id}
      entityType={isFolder ? "folder" : "file"}
      title={title}
      description={menuStatus}
      repositoryKind="global"
      sourceKind="drive"
      entityDetails={{
        mimeType,
        sizeBytes,
        modifiedTime,
        webViewLink,
      }}
      isOffline={isOffline}
      isDownloading={isDownloading}
      onMakeOffline={handleMakeOfflineAction}
      onRemoveOffline={handleRemoveOfflineAction}
    />
  );

  if (viewMode === "grid") {
    return (
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
          isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/70 hover:border-border",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            onClick={() => {
              if (isSelectionMode) {
                toggleSelection(id);
              } else {
                onOpen?.();
              }
            }}
            className="flex flex-1 cursor-pointer items-center gap-3 min-w-0"
          >
            {renderIcon()}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h4>
              <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isSelectionMode ? (
              <button
                type="button"
                onClick={() => toggleSelection(id)}
                className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {isSelected ? (
                  <IconCircleCheckFilled className="size-4 text-primary" />
                ) : (
                  <IconCircle className="size-4 opacity-40" />
                )}
              </button>
            ) : (
              renderActionMenu()
            )}
          </div>
        </div>

        {visibleFileTags.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            {visibleFileTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-1.5 py-0.2 text-[9px] font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
                  color: getTagChipTextColor(tag.color),
                }}
              >
                {tag.name}
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="text-[9px] text-muted-foreground font-medium">
                +{hiddenTagCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  // List View Mode
  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border/60 bg-card hover:bg-accent/40",
      )}
    >
      <div
        onClick={() => {
          if (isSelectionMode) {
            toggleSelection(id);
          } else {
            onOpen?.();
          }
        }}
        className="flex flex-1 cursor-pointer items-center gap-3 min-w-0"
      >
        {renderIcon()}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h4>
            {visibleFileTags.map((tag) => (
              <span
                key={tag.id}
                className="hidden sm:inline-block rounded-full px-1.5 py-0.2 text-[9px] font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
                  color: getTagChipTextColor(tag.color),
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOffline ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <IconCloudDown className="size-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        ) : null}

        {isSelectionMode ? (
          <button
            type="button"
            onClick={() => toggleSelection(id)}
            className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {isSelected ? (
              <IconCircleCheckFilled className="size-4 text-primary" />
            ) : (
              <IconCircle className="size-4 opacity-40" />
            )}
          </button>
        ) : (
          renderActionMenu()
        )}
      </div>
    </div>
  );
}

export const FileRow = memo(FileRowComponent);
