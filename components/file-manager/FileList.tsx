// Design tokens inherited from Dashboard — do not redefine
// Section label: text-xs font-medium uppercase tracking-widest text-muted-foreground/80
// Count pill: bg-indigo-100 px-2 text-[11px] font-semibold text-indigo-600
// Accent bar: w-1 h-4 rounded-full bg-indigo-500
// Skeleton: @/components/ui/skeleton
// Separator: bg-linear-to-r from-transparent via-border to-transparent
// Card entrance: card-entrance class defined in globals.css 280ms ease-out
// Transition: transition-all duration-200, collapse duration-300

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconChevronDown, IconFolderOff, IconLoader2 } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

import { useFileManagerViewMode } from "@/components/file-manager/ControlsBar";
import { FileRow } from "@/components/file-manager/FileRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDriveFolder } from "@/features/drive/drive.hooks";
import type { DownloadTask as DownloadManagerTask } from "@/features/download/download.types";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import { autoPrefetch } from "@/features/offline/offline.prefetch";
import { type DownloadTask } from "@/features/offline/offline.types";
import { useSettingsStore } from "@/features/settings/settings.store";
import { useMotionTokens } from "@/features/motion/motion.tokens";
import {
  formatFileSize,
  getMimeLabel,
} from "@/features/drive/drive.types";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

type FileListProps = {
  driveFolderId: string | null;
  courseName: string;
};

type FileListRow = {
  id: string;
  type: "folder" | "file";
  title: string;
  subtitle: string;
  mimeType: string | null;
  sizeBytes: number;
  modifiedTime: string | null;
  webViewLink: string | null;
};

/* ─── Section Header — matches dashboard section labels with accent bar ── */

function SectionHeader({
  label,
  count,
  isOpen,
  onToggle,
  sectionId,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  sectionId: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-lg px-1 py-3 text-left transition-colors duration-200 hover:bg-muted/50"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={sectionId}
    >
      {/* Accent bar */}
      <span className="h-4 w-1 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden="true" />

      {/* Label */}
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
        {label}
      </span>

      {/* Count pill — matches Dashboard badge */}
      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
        {count}
      </span>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Collapse chevron — rotates on toggle */}
      <IconChevronDown
        className="size-4 text-muted-foreground/80 transition-transform duration-300 ease-out"
        style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
        aria-hidden="true"
      />
    </button>
  );
}

/* ─── Skeleton Card — matches real card dimensions ────────────────────── */

function SkeletonCard({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
    </div>
  );
}

export function FileList({ driveFolderId, courseName }: FileListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { viewMode, layoutMode } = useFileManagerViewMode();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const motionTokens = useMotionTokens();
  const offlineFiles = useOfflineIndexStore((state) => state.snapshot.offlineFiles);
  const removeOffline = useOfflineIndexStore((state) => state.removeOffline);
  const autoPrefetchEnabled = useSettingsStore((state) => {
    const candidate = state.values.auto_prefetch;
    return typeof candidate === "boolean" ? candidate : true;
  });
  const virtualizedListsEnabled = useSettingsStore((state) => {
    const candidate = state.values.virtualized_lists;
    return typeof candidate === "boolean" ? candidate : true;
  });
  const [visibleCount, setVisibleCount] = useState(120);
  const { tasks: downloadTasks, startDownload, animateDownload } = useDownloadManager();

  const { folders, files, isLoading, error } = useDriveFolder(driveFolderId);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateSwipeCapability = () => setSwipeEnabled(mediaQuery.matches);

    updateSwipeCapability();
    mediaQuery.addEventListener("change", updateSwipeCapability);
    return () =>
      mediaQuery.removeEventListener("change", updateSwipeCapability);
  }, []);

  const folderRows = useMemo<FileListRow[]>(
    () =>
      folders.map((item): FileListRow => ({
        id: item.id,
        type: "folder",
        title: item.name,
        subtitle: "Folder",
        mimeType: item.mimeType,
        sizeBytes: 0,
        modifiedTime: item.modifiedTime,
        webViewLink: item.webViewLink,
      })),
    [folders],
  );

  const fileRows = useMemo<FileListRow[]>(
    () =>
      files.map((item): FileListRow => {
        const sizeLabel = formatFileSize(item.size);
        const mimeLabel = getMimeLabel(item.mimeType, item.name);
        const subtitle = [sizeLabel, mimeLabel].filter(Boolean).join(" · ");

        return {
          id: item.id,
          type: "file",
          title: item.name,
          subtitle,
          mimeType: item.mimeType,
          sizeBytes: item.size ?? 0,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink,
        };
      }),
    [files],
  );

  const allRows = useMemo<FileListRow[]>(() => [...folderRows, ...fileRows], [folderRows, fileRows]);
  const visibleRows = useMemo(() => {
    if (!virtualizedListsEnabled) {
      return {
        folders: folderRows,
        files: fileRows,
        all: allRows,
        hasMore: false,
      };
    }

    const folders = folderRows.slice(0, visibleCount);
    const remainingForFiles = Math.max(0, visibleCount - folders.length);
    const files = fileRows.slice(0, remainingForFiles);
    const all = allRows.slice(0, visibleCount);

    return {
      folders,
      files,
      all,
      hasMore: allRows.length > all.length,
    };
  }, [allRows, fileRows, folderRows, visibleCount, virtualizedListsEnabled]);

  const isGridView = viewMode === "grid";
  // Apply data-compact via group modifier implicitly when layout wraps it, 
  // or use basic CSS targeting depending on how Settings provider sets it on HTML. 
  // We use Tailwind arbitrary variants targeting the data-attribute on :root
  const rowContainerClass = isGridView 
    ? "grid grid-cols-2 gap-3 data-[compact=true]:gap-2" 
    : "flex flex-col gap-2 data-[compact=true]:gap-1";
  const pathSegments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const departmentSegment = pathSegments[0];
  const semesterSegment = pathSegments[1];

  const onToggleOpen = useCallback((id: string | null) => {
    setOpenRowId(id);
  }, []);

  const handleMakeOffline = useCallback(
    async (item: FileListRow, sourceElement?: HTMLElement): Promise<void> => {
      if (item.type !== "file") {
        return;
      }

      animateDownload(sourceElement ?? null);
      await startDownload(item.id);
    },
    [animateDownload, startDownload],
  );

  const handleRemoveOffline = useCallback(
    async (item: FileListRow): Promise<void> => {
      if (item.type !== "file") {
        return;
      }

      await removeOffline(item.id);
    },
    [removeOffline],
  );

  const fileRowsById = useMemo(() => {
    return new Map(fileRows.map((row) => [row.id, row]));
  }, [fileRows]);

  const enqueuePrefetch = useCallback(
    (task: DownloadTask): void => {
      const item = fileRowsById.get(task.fileId);
      if (!item || item.type !== "file") {
        return;
      }

      void startDownload(item.id).catch(() => undefined);
    },
    [fileRowsById, startDownload],
  );

  const activeDownloadsByFileId = useMemo(() => {
    const index = new Map<string, DownloadManagerTask>();

    for (const task of Object.values(downloadTasks)) {
      if (task.state === "completed" || task.state === "canceled" || task.state === "failed") {
        continue;
      }

      const existing = index.get(task.fileId);
      if (!existing || existing.updatedAt < task.updatedAt) {
        index.set(task.fileId, task);
      }
    }

    return index;
  }, [downloadTasks]);

  const getRowSubtitle = useCallback(
    (item: FileListRow): string => {
      if (item.type !== "file") {
        return item.subtitle;
      }

      const active = activeDownloadsByFileId.get(item.id);
      if (active) {
        const pct = Math.round(active.progress);
        if (active.state === "paused") {
          return `Paused at ${pct}%`;
        }

        if (active.state === "queued") {
          return pct > 0 ? `Queued ${pct}%` : "Queued";
        }

        return `Downloading ${pct}%`;
      }

      if (offlineFiles[item.id]) {
        return item.subtitle ? `${item.subtitle} · Offline` : "Available Offline";
      }

      return item.subtitle;
    },
    [activeDownloadsByFileId, offlineFiles],
  );

  const handleOpenRow = useCallback(
    (item: FileListRow) => {
      if (item.type === "folder") {
        if (!departmentSegment || !semesterSegment) {
          return;
        }

        router.push(
          `/${encodeURIComponent(departmentSegment)}/${encodeURIComponent(semesterSegment)}/${encodeURIComponent(item.id)}?name=${encodeURIComponent(item.title)}`,
        );
        return;
      }

      if (item.webViewLink) {
        if (autoPrefetchEnabled) {
          autoPrefetch(
            item.id,
            fileRows.map((row) => row.id),
            enqueuePrefetch,
          );
        }

        if (offlineFiles[item.id]) {
          void openLocalFirst(
            item.id,
            `/api/file/${encodeURIComponent(item.id)}/stream`,
          );
          return;
        }

        window.open(item.webViewLink, "_blank", "noopener,noreferrer");
      }
    },
    [autoPrefetchEnabled, departmentSegment, enqueuePrefetch, fileRows, offlineFiles, router, semesterSegment],
  );

  // Loading state — skeleton cards matching real card dimensions
  if (isLoading) {
    return (
      <div className="mt-4 px-4 pb-32">
        <div className="space-y-4">
          {/* Skeleton section header */}
          <div className="flex items-center gap-2.5 px-1 py-3">
            <Skeleton className="h-4 w-1 rounded-full" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className={isGridView ? "grid grid-cols-2 gap-3" : "space-y-2"}>
            {Array.from({ length: isGridView ? 4 : 3 }, (_, index) => (
              <SkeletonCard key={`sk-folder-${index}`} viewMode={viewMode} />
            ))}
          </div>

          {/* Separator */}
          <div className="h-px bg-linear-to-r from-transparent via-border/80 to-transparent" />

          {/* Skeleton section header */}
          <div className="flex items-center gap-2.5 px-1 py-3">
            <Skeleton className="h-4 w-1 rounded-full" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className={isGridView ? "grid grid-cols-2 gap-3" : "space-y-2"}>
            {Array.from({ length: isGridView ? 4 : 3 }, (_, index) => (
              <SkeletonCard key={`sk-file-${index}`} viewMode={viewMode} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mt-6 flex min-h-[50vh] flex-col items-center justify-center px-4 pb-32 text-center">
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Could not load files for {courseName}.
        </p>
      </div>
    );
  }

  // Empty state
  if (allRows.length === 0) {
    return (
      <div className="mt-6 flex min-h-[50vh] flex-col items-center justify-center px-4 pb-32 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
          <IconFolderOff className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground/90">
          This folder is empty.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          No files found in Drive for this course.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-4 px-4 pb-32"
      >
        {layoutMode === "separated" ? (
          <div className="space-y-4">
            {/* Folders section */}
            {visibleRows.folders.length > 0 && (
              <section>
                <SectionHeader
                  label="Folders"
                  count={visibleRows.folders.length}
                  isOpen={foldersOpen}
                  onToggle={() => setFoldersOpen((prev) => !prev)}
                  sectionId="fm-folders-section"
                />
                <div
                  id="fm-folders-section"
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: foldersOpen ? "9999px" : "0",
                    opacity: foldersOpen ? 1 : 0,
                  }}
                >
                  <div className={rowContainerClass}>
                    {visibleRows.folders.map((item, index) => (
                      <FileRow
                        key={item.id}
                        id={item.id}
                        type={item.type}
                        title={item.title}
                        subtitle={getRowSubtitle(item)}
                        mimeType={item.mimeType}
                        sizeBytes={item.sizeBytes}
                        modifiedTime={item.modifiedTime}
                        isOffline={Boolean(offlineFiles[item.id])}
                        isDownloading={Boolean(activeDownloadsByFileId.get(item.id))}
                        viewMode={viewMode}
                        isOpen={openRowId === item.id}
                        swipeEnabled={swipeEnabled && !isGridView}
                        onToggleOpen={onToggleOpen}
                        onOpen={() => handleOpenRow(item)}
                        onRemoveOffline={() => {
                          void handleRemoveOffline(item);
                        }}
                        animationIndex={index}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {visibleRows.folders.length > 0 && visibleRows.files.length > 0 && (
              <div className="h-px bg-linear-to-r from-transparent via-border/80 to-transparent" />
            )}

            {/* Files section */}
            {visibleRows.files.length > 0 && (
              <section>
                <SectionHeader
                  label="Files"
                  count={visibleRows.files.length}
                  isOpen={filesOpen}
                  onToggle={() => setFilesOpen((prev) => !prev)}
                  sectionId="fm-files-section"
                />
                <div
                  id="fm-files-section"
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: filesOpen ? "9999px" : "0",
                    opacity: filesOpen ? 1 : 0,
                  }}
                >
                  <div className={rowContainerClass}>
                    {visibleRows.files.map((item, index) => (
                      <FileRow
                        key={item.id}
                        id={item.id}
                        type={item.type}
                        title={item.title}
                        subtitle={getRowSubtitle(item)}
                        mimeType={item.mimeType}
                        sizeBytes={item.sizeBytes}
                        modifiedTime={item.modifiedTime}
                        isOffline={Boolean(offlineFiles[item.id])}
                        isDownloading={Boolean(activeDownloadsByFileId.get(item.id))}
                        viewMode={viewMode}
                        isOpen={openRowId === item.id}
                        swipeEnabled={swipeEnabled && !isGridView}
                        onToggleOpen={onToggleOpen}
                        onOpen={() => handleOpenRow(item)}
                        onMakeOffline={(sourceElement) => {
                          void handleMakeOffline(item, sourceElement);
                        }}
                        onRemoveOffline={() => {
                          void handleRemoveOffline(item);
                        }}
                        animationIndex={visibleRows.folders.length + index}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className={rowContainerClass}>
            {visibleRows.all.map((item, index) => (
              <FileRow
                key={item.id}
                id={item.id}
                type={item.type}
                title={item.title}
                subtitle={getRowSubtitle(item)}
                mimeType={item.mimeType}
                sizeBytes={item.sizeBytes}
                modifiedTime={item.modifiedTime}
                isOffline={Boolean(offlineFiles[item.id])}
                isDownloading={Boolean(activeDownloadsByFileId.get(item.id))}
                viewMode={viewMode}
                isOpen={openRowId === item.id}
                swipeEnabled={swipeEnabled && !isGridView}
                onToggleOpen={onToggleOpen}
                onOpen={() => handleOpenRow(item)}
                onMakeOffline={(sourceElement) => {
                  void handleMakeOffline(item, sourceElement);
                }}
                onRemoveOffline={() => {
                  void handleRemoveOffline(item);
                }}
                animationIndex={index}
              />
            ))}
          </div>
        )}

        {visibleRows.hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-border px-4 text-xs font-medium shadow-sm"
              onClick={() => {
                setVisibleCount((current) => current + 120);
              }}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
