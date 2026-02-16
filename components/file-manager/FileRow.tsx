"use client";

import { memo, useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import {
  IconArrowUpRight,
  IconCircleCheck,
  IconCloudDown,
  IconDeviceFloppy,
  IconDotsVertical,
  IconFile,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypePng,
  IconFolder,
  IconPin,
  IconTrashX,
  IconTrash,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FileRowProps = {
  id: string;
  type: "folder" | "file";
  title: string;
  subtitle: string;
  isOffline?: boolean;
  isDownloading?: boolean;
  viewMode: "grid" | "list";
  isOpen: boolean;
  swipeEnabled: boolean;
  onToggleOpen: (id: string | null) => void;
  onOpen?: () => void;
  onMakeOffline?: () => void;
  onRemoveOffline?: () => void;
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

function renderIcon(isFolder: boolean, ext: string) {
  const Icon = isFolder ? IconFolder : (FILE_ICON_MAP[ext] ?? IconFile);
  return <Icon className="size-5" />;
}

const ACTION_PANEL_WIDTH = 120;

function FileRowComponent({
  id,
  type,
  title,
  subtitle,
  isOffline = false,
  isDownloading = false,
  viewMode,
  isOpen,
  swipeEnabled,
  onToggleOpen,
  onOpen,
  onMakeOffline,
  onRemoveOffline,
}: FileRowProps) {
  const suppressClickRef = useRef(false);
  const isFolder = type === "folder";
  const ext = isFolder ? "" : getFileExtension(title);
  const icon = renderIcon(isFolder, ext);
  const iconColor = isFolder
    ? "text-indigo-600 dark:text-indigo-400"
    : getFileIconColor(ext);
  const menuStatus = isOffline
    ? "Saved for offline access"
    : isDownloading
      ? "Downloading offline copy"
      : isFolder
        ? "Folder actions"
        : "Online only";

  const triggerHaptic = (duration = 8) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const handleOpenAction = () => {
    triggerHaptic();
    onOpen?.();
  };

  const handleMakeOfflineAction = () => {
    if (isFolder || isOffline || isDownloading) {
      return;
    }

    triggerHaptic();
    onMakeOffline?.();
  };

  const handleRemoveOfflineAction = () => {
    if (!isOffline || isDownloading) {
      return;
    }

    triggerHaptic();
    onRemoveOffline?.();
  };

  const renderActionMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-lg text-stone-500 transition-all duration-200 hover:-translate-y-px hover:bg-stone-100 hover:text-stone-700 active:scale-[0.98] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              triggerHaptic(6);
            }}
          />
        }
      >
        <IconDotsVertical className="size-4" />
        <span className="sr-only">Open actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-xl border border-stone-200/70 bg-white/95 p-1.5 shadow-xl shadow-stone-900/10 backdrop-blur-md dark:border-stone-700/80 dark:bg-stone-900/95"
      >
        <div className="mb-1 rounded-lg border border-stone-200/70 bg-stone-50/80 px-3 py-2.5 dark:border-stone-700/80 dark:bg-stone-800/70">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
            {menuStatus}
          </p>
        </div>
        <DropdownMenuItem
          className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-indigo-50 focus:text-indigo-700 dark:focus:bg-indigo-500/20 dark:focus:text-indigo-200"
          onClick={handleOpenAction}
        >
          <IconArrowUpRight className="size-4 text-indigo-500 dark:text-indigo-300" />
          <div className="flex flex-col gap-0.5">
            <span>{isFolder ? "Open Folder" : "Open File"}</span>
            <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
              {isFolder ? "Navigate into this folder" : "Open in a new tab"}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-12 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-sky-50 focus:text-sky-700 disabled:opacity-45 dark:focus:bg-sky-500/20 dark:focus:text-sky-200"
          onClick={handleMakeOfflineAction}
          disabled={isFolder || isOffline || isDownloading}
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
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="min-h-11 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5 focus:bg-rose-50 focus:text-rose-700 disabled:opacity-45 dark:focus:bg-rose-500/20 dark:focus:text-rose-200"
          onClick={handleRemoveOfflineAction}
          disabled={!isOffline || isDownloading}
        >
          <IconTrashX className="size-4 text-rose-500 dark:text-rose-300" />
          <div className="flex flex-col gap-0.5">
            <span>Remove Offline Copy</span>
            <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
              Free storage and keep cloud-only
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
          "group relative cursor-pointer rounded-lg border p-4 ring-1 ring-transparent transition-all duration-200",
          "hover:-translate-y-px hover:shadow-md active:scale-[0.99]",
          "focus-within:ring-2 focus-within:ring-indigo-400/40 focus-within:outline-none",
          isFolder
            ? "border-indigo-200/40 bg-indigo-50/40 dark:border-indigo-800/40 dark:bg-indigo-950/20"
            : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
        )}
      >
        <div className="absolute right-2 top-2">
          {renderActionMenu()}
        </div>

        <div className="space-y-3">
          {/* Upgraded icon container */}
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border shadow-inner transition-colors duration-200",
              isFolder
                ? "border-indigo-200/60 bg-indigo-100 group-hover:bg-indigo-200/70 dark:border-indigo-800/60 dark:bg-indigo-900/40 dark:group-hover:bg-indigo-900/60"
                : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800",
              iconColor,
            )}
          >
            {icon}
          </div>
          <div className="space-y-1 pr-8">
            <p
              className={cn(
                "line-clamp-1 text-stone-900 dark:text-stone-100",
                isFolder
                  ? "text-base font-semibold tracking-tight"
                  : "text-sm font-medium",
              )}
            >
              {title}
            </p>
            <p className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
              {subtitle}
            </p>
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
    if (isOpen) {
      onToggleOpen(null);
      return;
    }
    onOpen?.();
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe action panel — static behind content */}
      <div className="absolute inset-y-0 right-0 z-0 flex w-[120px] items-center justify-around bg-linear-to-l from-stone-900 to-stone-800 dark:from-stone-800 dark:to-stone-700">
        <button
          type="button"
          aria-label="Pin"
          className="flex size-10 items-center justify-center rounded-md text-amber-400 transition-colors duration-200 hover:bg-stone-700 hover:text-amber-300"
          onClick={(event) => event.stopPropagation()}
        >
          <IconPin className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Make available offline"
          className={cn(
            "flex size-10 items-center justify-center rounded-md transition-colors duration-200 active:scale-[0.96]",
            isFolder || isOffline || isDownloading
              ? "cursor-not-allowed text-stone-500"
              : "text-sky-400 hover:bg-stone-700 hover:text-sky-300",
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (!isFolder && !isOffline && !isDownloading) {
              handleMakeOfflineAction();
            }
          }}
          disabled={isFolder || isOffline || isDownloading}
        >
          <IconCloudDown className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          className="flex size-10 items-center justify-center rounded-md text-rose-400 transition-colors duration-200 hover:bg-stone-700 hover:text-rose-300"
          onClick={(event) => event.stopPropagation()}
        >
          <IconTrash className="size-4" />
        </button>
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
          "relative z-10 cursor-pointer rounded-lg border transition-all duration-200",
          "hover:-translate-y-1px hover:shadow-md active:scale-[0.99]",
          "focus-within:ring-2 focus-within:ring-indigo-400/40 focus-within:outline-none",
          isOpen && "ring-1 ring-indigo-400/30",
          isFolder
            ? "border-indigo-200/40 bg-indigo-50 dark:border-indigo-800/40 dark:bg-stone-900"
            : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
        )}
        onClick={handleRowClick}
      >
        <div className="flex h-16 items-center gap-4 px-4">
          {/* Upgraded icon container */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-inner transition-colors duration-200",
              isFolder
                ? "border-indigo-200/60 bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-900/40"
                : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800",
              iconColor,
            )}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-stone-900 dark:text-stone-100",
                isFolder
                  ? "text-base font-semibold tracking-tight"
                  : "text-sm font-medium",
              )}
            >
              {title}
            </p>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
              {subtitle}
            </p>
          </div>

          {renderActionMenu()}
        </div>
      </motion.div>
    </div>
  );
}

export const FileRow = memo(FileRowComponent);
FileRow.displayName = "FileRow";
