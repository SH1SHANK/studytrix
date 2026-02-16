"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { IconFolderOff, IconLoader2 } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

import { useFileManagerViewMode } from "@/components/file-manager/ControlsBar";
import { FileRow } from "@/components/file-manager/FileRow";
import { useDriveFolder } from "@/features/drive/drive.hooks";
import { autoPrefetch } from "@/features/offline/offline.prefetch";
import { useOfflineStore } from "@/features/offline/offline.store";
import {
  type CacheFileMetadata,
  type DownloadTask,
} from "@/features/offline/offline.types";
import {
  formatFileSize,
  getMimeLabel,
} from "@/features/drive/drive.types";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="h-4 w-1 rounded-full bg-indigo-500" />
      <span className="text-xs font-medium uppercase tracking-widest text-stone-400">
        {children}
      </span>
    </div>
  );
}

export function FileList({ driveFolderId, courseName }: FileListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { viewMode, layoutMode } = useFileManagerViewMode();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const offlineFiles = useOfflineStore((state) => state.offlineFiles);
  const downloading = useOfflineStore((state) => state.downloading);
  const startDownload = useOfflineStore((state) => state.startDownload);
  const removeOffline = useOfflineStore((state) => state.removeOffline);

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

  const isGridView = viewMode === "grid";
  const rowContainerClass = isGridView ? "grid grid-cols-2 gap-3" : "space-y-2";
  const pathSegments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const departmentSegment = pathSegments[0];
  const semesterSegment = pathSegments[1];

  const onToggleOpen = useCallback((id: string | null) => {
    setOpenRowId(id);
  }, []);

  const fetchOfflineStream = useCallback((fileId: string): Promise<Response> => {
    return fetch(`/api/file/${encodeURIComponent(fileId)}/stream`);
  }, []);

  const handleMakeOffline = useCallback(
    async (item: FileListRow): Promise<void> => {
      if (item.type !== "file") {
        return;
      }

      const metadata: CacheFileMetadata = {
        mimeType: item.mimeType ?? "application/octet-stream",
        size: item.sizeBytes,
        modifiedTime: item.modifiedTime,
        name: item.title,
        priority: 200,
      };

      await startDownload(item.id, metadata, fetchOfflineStream);
    },
    [fetchOfflineStream, startDownload],
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

      const metadata: CacheFileMetadata = {
        mimeType: item.mimeType ?? "application/octet-stream",
        size: item.sizeBytes,
        modifiedTime: item.modifiedTime,
        name: item.title,
        priority: task.priority,
      };

      void startDownload(item.id, metadata, fetchOfflineStream).catch(() => undefined);
    },
    [fetchOfflineStream, fileRowsById, startDownload],
  );

  const getRowSubtitle = useCallback(
    (item: FileListRow): string => {
      if (item.type !== "file") {
        return item.subtitle;
      }

      const progress = downloading[item.id];
      if (progress) {
        return `Downloading ${Math.round(progress.percent)}%`;
      }

      if (offlineFiles[item.id]) {
        return item.subtitle ? `${item.subtitle} · Offline` : "Available Offline";
      }

      return item.subtitle;
    },
    [downloading, offlineFiles],
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
        autoPrefetch(
          item.id,
          fileRows.map((row) => row.id),
          enqueuePrefetch,
        );
        window.open(item.webViewLink, "_blank", "noopener,noreferrer");
      }
    },
    [departmentSegment, enqueuePrefetch, fileRows, router, semesterSegment],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-6 flex min-h-[50vh] flex-col items-center justify-center px-4 pb-32">
        <IconLoader2 className="size-6 animate-spin text-indigo-500" />
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          Loading files…
        </p>
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
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Could not load files for {courseName}.
        </p>
      </div>
    );
  }

  // Empty state
  if (allRows.length === 0) {
    return (
      <div className="mt-6 flex min-h-[50vh] flex-col items-center justify-center px-4 pb-32 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800">
          <IconFolderOff className="size-6 text-stone-500 dark:text-stone-400" />
        </div>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
          This folder is empty.
        </p>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          No files found in Drive for this course.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="mt-4 px-4 pb-32"
    >
      {/* Section container panel */}
      <div className="rounded-xl border border-stone-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-[2px] dark:border-stone-800/60 dark:bg-stone-900/70">
        {layoutMode === "separated" ? (
          <div className="space-y-4">
            {folderRows.length > 0 && (
              <div className="space-y-3">
                <SectionLabel>Folders</SectionLabel>
                <div className={rowContainerClass}>
                  {folderRows.map((item) => (
                    <FileRow
                      key={item.id}
                      id={item.id}
                      type={item.type}
                      title={item.title}
                      subtitle={getRowSubtitle(item)}
                      isOffline={Boolean(offlineFiles[item.id])}
                      isDownloading={Boolean(downloading[item.id])}
                      viewMode={viewMode}
                      isOpen={openRowId === item.id}
                      swipeEnabled={swipeEnabled && !isGridView}
                      onToggleOpen={onToggleOpen}
                      onOpen={() => handleOpenRow(item)}
                      onRemoveOffline={() => {
                        void handleRemoveOffline(item);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {folderRows.length > 0 && fileRows.length > 0 && (
              <div className="h-px bg-linear-to-r from-transparent via-stone-200 to-transparent dark:via-stone-800" />
            )}

            {fileRows.length > 0 && (
              <div className="space-y-3">
                <SectionLabel>Files</SectionLabel>
                <div className={rowContainerClass}>
                  {fileRows.map((item) => (
                    <FileRow
                      key={item.id}
                      id={item.id}
                      type={item.type}
                      title={item.title}
                      subtitle={getRowSubtitle(item)}
                      isOffline={Boolean(offlineFiles[item.id])}
                      isDownloading={Boolean(downloading[item.id])}
                      viewMode={viewMode}
                      isOpen={openRowId === item.id}
                      swipeEnabled={swipeEnabled && !isGridView}
                      onToggleOpen={onToggleOpen}
                      onOpen={() => handleOpenRow(item)}
                      onMakeOffline={() => {
                        void handleMakeOffline(item);
                      }}
                      onRemoveOffline={() => {
                        void handleRemoveOffline(item);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={rowContainerClass}>
            {allRows.map((item) => (
              <FileRow
                key={item.id}
                id={item.id}
                type={item.type}
                title={item.title}
                subtitle={getRowSubtitle(item)}
                isOffline={Boolean(offlineFiles[item.id])}
                isDownloading={Boolean(downloading[item.id])}
                viewMode={viewMode}
                isOpen={openRowId === item.id}
                swipeEnabled={swipeEnabled && !isGridView}
                onToggleOpen={onToggleOpen}
                onOpen={() => handleOpenRow(item)}
                onMakeOffline={() => {
                  void handleMakeOffline(item);
                }}
                onRemoveOffline={() => {
                  void handleRemoveOffline(item);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
