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
import { IconChevronDown, IconFolderOff } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useFileManagerViewMode } from "@/features/file/ui/file-manager/ControlsBar";
import { FileRow } from "@/features/file/ui/file-manager/FileRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDriveFolder } from "@/features/drive/drive.hooks";
import type { DownloadTask as DownloadManagerTask } from "@/features/download/download.types";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import { loadOfflineLibrarySnapshot } from "@/features/offline/offline.library";
import { autoPrefetch } from "@/features/offline/offline.prefetch";
import { useSettingsStore } from "@/features/settings/settings.store";
import {
  formatFileSize,
  getMimeLabel,
} from "@/features/drive/drive.types";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";
import { useSelectionStore } from "@/features/selection/selection.store";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import {
  parseFolderTrailParam,
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
} from "@/features/navigation/folder-trail";
import {
  buildGlobalFolderRouteHref,
  buildPersonalFolderRouteHref,
  parseRepositoryRoute,
} from "@/features/navigation/repository-route";
import { cn } from "@/lib/utils";

type FileListProps = {
  driveFolderId: string | null;
  courseName: string;
};

type FileListRow = {
  id: string;
  type: "folder" | "file";
  title: string;
  subtitle: string;
  sourceKind: "drive" | "local";
  customFolderId?: string;
  mimeType: string | null;
  sizeBytes: number;
  modifiedTime: string | null;
  webViewLink: string | null;
};

function areSetsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function formatLastUpdatedLabel(timestamp: number): string {
  const ageMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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
  const searchParams = useSearchParams();
  const { viewMode, layoutMode } = useFileManagerViewMode();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const offlineFiles = useOfflineIndexStore((state) => state.snapshot.offlineFiles);
  const offlineSnapshotUpdatedAt = useOfflineIndexStore((state) => state.snapshot.updatedAt);
  const removeOffline = useOfflineIndexStore((state) => state.removeOffline);
  const autoPrefetchEnabled = useSettingsStore((state) => {
    const candidate = state.values.auto_prefetch;
    return typeof candidate === "boolean" ? candidate : true;
  });
  const virtualizedListsEnabled = useSettingsStore((state) => {
    const candidate = state.values.virtualized_lists;
    return typeof candidate === "boolean" ? candidate : true;
  });
  const showFileMetadata = useSettingsStore((state) => {
    const candidate = state.values.show_file_metadata;
    return typeof candidate === "boolean" ? candidate : true;
  });
  const compactModeEnabled = useSettingsStore((state) => {
    const candidate = state.values.compact_mode;
    return typeof candidate === "boolean" ? candidate : false;
  });
  const [visibleCount, setVisibleCount] = useState(120);
  const [offlineFolderIds, setOfflineFolderIds] = useState<Set<string>>(new Set());
  const [offlineLibraryFileIds, setOfflineLibraryFileIds] = useState<Set<string>>(new Set());
  const { tasks: downloadTasks, startDownload, animateDownload, openDrawer } = useDownloadManager();
  const gateDownloadRisk = useDownloadRiskGate();
  const setContextItems = useSelectionStore((state) => state.setContextItems);
  const customFolders = useCustomFoldersStore((state) => state.folders);
  const indexedEntries = useIntelligenceStore((state) => state.indexedEntries);
  const routeContext = useMemo(
    () => parseRepositoryRoute({ pathname, searchParams }),
    [pathname, searchParams],
  );
  const currentTrailLabels = useMemo(() => {
    const labels = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_QUERY_PARAM));
    if (labels.length > 0) {
      return labels;
    }
    const fallback = courseName.trim();
    return fallback ? [fallback] : [];
  }, [courseName, searchParams]);
  const currentTrailIds = useMemo(() => {
    const ids = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_IDS_QUERY_PARAM));
    if (ids.length > 0) {
      return ids;
    }
    if (driveFolderId && driveFolderId.trim().length > 0) {
      return [driveFolderId];
    }
    return [];
  }, [driveFolderId, searchParams]);
  const localRootFolderId = routeContext.repoKind === "personal"
    ? (currentTrailIds[0] ?? (driveFolderId?.trim() || null))
    : null;
  const localRootFolder = useMemo(
    () => customFolders.find((folder) =>
      folder.id === localRootFolderId
      && (folder.sourceKind ?? "drive") === "local") ?? null,
    [customFolders, localRootFolderId],
  );
  const isLocalFolderContext = routeContext.repoKind === "personal" && localRootFolder !== null;
  const localCurrentFolderId = routeContext.repoKind === "personal"
    ? (routeContext.folderId?.trim() || driveFolderId?.trim() || "")
    : "";
  const localContextSourceEntries = useMemo(() => {
    if (!isLocalFolderContext || !localRootFolder || !localCurrentFolderId) {
      return [] as FileListRow[];
    }

    const rows = indexedEntries
      .filter((entry) =>
        entry.repoKind === "personal"
        && entry.customFolderId === localRootFolder.id
        && entry.ancestorIds[entry.ancestorIds.length - 1] === localCurrentFolderId)
      .map((entry): FileListRow => {
        const sizeLabel = formatFileSize(entry.size ?? null);
        const mimeLabel = getMimeLabel(entry.mimeType ?? "", entry.name);
        const subtitle = entry.isFolder
          ? "Folder"
          : showFileMetadata
            ? [sizeLabel, mimeLabel].filter(Boolean).join(" · ")
            : "File";

        return {
          id: entry.fileId,
          type: entry.isFolder ? "folder" : "file",
          title: entry.name,
          subtitle,
          sourceKind: "local",
          customFolderId: entry.customFolderId,
          mimeType: entry.mimeType ?? null,
          sizeBytes: entry.size ?? 0,
          modifiedTime: entry.modifiedTime ?? null,
          webViewLink: null,
        };
      })
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === "folder" ? -1 : 1;
        }
        return left.title.localeCompare(right.title);
      });

    return rows;
  }, [indexedEntries, isLocalFolderContext, localCurrentFolderId, localRootFolder, showFileMetadata]);
  const driveFolderIdForQuery = isLocalFolderContext ? null : driveFolderId;
  const { folders, files, isLoading, error, isStale, lastUpdatedAt } = useDriveFolder(driveFolderIdForQuery);

  useEffect(() => {
    if (isLocalFolderContext) {
      setContextItems([]);
      return;
    }

    setContextItems([...folders, ...files]);
  }, [files, folders, isLocalFolderContext, setContextItems]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateSwipeCapability = () => setSwipeEnabled(mediaQuery.matches);

    updateSwipeCapability();
    mediaQuery.addEventListener("change", updateSwipeCapability);
    return () =>
      mediaQuery.removeEventListener("change", updateSwipeCapability);
  }, []);

  useEffect(() => {
    let canceled = false;

    void loadOfflineLibrarySnapshot({ maxAgeMs: 20_000 })
      .then((snapshot) => {
        if (canceled) {
          return;
        }

        const ids = new Set<string>();
        const fileIds = new Set<string>();
        for (const folder of snapshot.folders) {
          if (folder.folderId && folder.folderId !== "ungrouped") {
            ids.add(folder.folderId);
          }
        }
        for (const file of snapshot.files) {
          if (file.fileId) {
            fileIds.add(file.fileId);
          }
          for (const ancestorId of file.ancestorFolderIds) {
            if (ancestorId && ancestorId !== "ungrouped") {
              ids.add(ancestorId);
            }
          }
        }

        setOfflineFolderIds((current) => (areSetsEqual(current, ids) ? current : ids));
        setOfflineLibraryFileIds((current) => (areSetsEqual(current, fileIds) ? current : fileIds));
      })
      .catch(() => {
        if (!canceled) {
          setOfflineFolderIds(new Set());
          setOfflineLibraryFileIds(new Set());
        }
      });

    return () => {
      canceled = true;
    };
  }, [offlineSnapshotUpdatedAt]);

  const folderRows = useMemo<FileListRow[]>(
    () => {
      if (isLocalFolderContext) {
        return localContextSourceEntries.filter((entry) => entry.type === "folder");
      }

      return folders.map((item): FileListRow => ({
        id: item.id,
        type: "folder",
        title: item.name,
        subtitle: "Folder",
        sourceKind: "drive",
        mimeType: item.mimeType,
        sizeBytes: 0,
        modifiedTime: item.modifiedTime,
        webViewLink: item.webViewLink,
      }));
    },
    [folders, isLocalFolderContext, localContextSourceEntries],
  );

  const fileRows = useMemo<FileListRow[]>(
    () => {
      if (isLocalFolderContext) {
        return localContextSourceEntries.filter((entry) => entry.type === "file");
      }

      return files.map((item): FileListRow => {
        const sizeLabel = formatFileSize(item.size);
        const mimeLabel = getMimeLabel(item.mimeType, item.name);
        const subtitle = showFileMetadata
          ? [sizeLabel, mimeLabel].filter(Boolean).join(" · ")
          : "File";

        return {
          id: item.id,
          type: "file",
          title: item.name,
          subtitle,
          sourceKind: "drive",
          mimeType: item.mimeType,
          sizeBytes: item.size ?? 0,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink,
        };
      });
    },
    [files, isLocalFolderContext, localContextSourceEntries, showFileMetadata],
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
  const rowContainerClass = isGridView
    ? cn("grid grid-cols-2", compactModeEnabled ? "gap-2" : "gap-3")
    : cn("flex flex-col", compactModeEnabled ? "gap-1" : "gap-2");

  const onToggleOpen = useCallback((id: string | null) => {
    setOpenRowId(id);
  }, []);

  const handleMakeOffline = useCallback(
    async (item: FileListRow, sourceElement?: HTMLElement): Promise<void> => {
      if (item.type !== "file") {
        return;
      }
      if (item.sourceKind === "local" || isLocalFolderContext) {
        return;
      }

      const proceed = await gateDownloadRisk(
        [
          {
            id: item.id,
            name: item.title,
            sizeBytes: item.sizeBytes,
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

      animateDownload(sourceElement ?? null);
      const taskId = await startDownload(item.id);
      if (taskId) {
        openDrawer();
      }
    },
    [animateDownload, gateDownloadRisk, isLocalFolderContext, openDrawer, startDownload],
  );

  const handleRemoveOffline = useCallback(
    async (item: FileListRow): Promise<void> => {
      if (item.type !== "file") {
        return;
      }
      if (item.sourceKind === "local" || isLocalFolderContext) {
        return;
      }

      await removeOffline(item.id);
    },
    [isLocalFolderContext, removeOffline],
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

  const folderGroupStatusByFolderId = useMemo(() => {
    const map = new Map<string, { hasActive: boolean; total: number; completed: number }>();

    for (const task of Object.values(downloadTasks)) {
      if (!task.groupId || !task.groupId.startsWith("folder:")) {
        continue;
      }

      const folderId = task.groupId.slice("folder:".length).trim();
      if (!folderId) {
        continue;
      }

      const current = map.get(folderId) ?? { hasActive: false, total: 0, completed: 0 };
      current.total += 1;
      if (task.state === "completed") {
        current.completed += 1;
      }

      if (task.state === "queued" || task.state === "downloading") {
        current.hasActive = true;
      }

      map.set(folderId, current);
    }

    return map;
  }, [downloadTasks]);

  const getRowOfflineState = useCallback((item: FileListRow) => {
    if (item.sourceKind === "local" || isLocalFolderContext) {
      return {
        isOffline: false,
        isDownloading: false,
      };
    }

    if (item.type === "file") {
      const groupedFolderDownloadActive =
        typeof driveFolderId === "string"
        && driveFolderId.trim().length > 0
        && Boolean(folderGroupStatusByFolderId.get(driveFolderId)?.hasActive);
      const activeTask = activeDownloadsByFileId.get(item.id);
      const fileHasActiveDownload = Boolean(
        activeTask && (activeTask.state === "queued" || activeTask.state === "downloading"),
      );
      const isOffline =
        Boolean(offlineFiles[item.id])
        || offlineLibraryFileIds.has(item.id);

      return {
        isOffline,
        isDownloading: !isOffline && (fileHasActiveDownload || groupedFolderDownloadActive),
      };
    }

    const folderStatus = folderGroupStatusByFolderId.get(item.id);
    const isFolderCompletedInGroup = Boolean(
      folderStatus && folderStatus.total > 0 && folderStatus.completed >= folderStatus.total,
    );

    return {
      isOffline: isFolderCompletedInGroup || offlineFolderIds.has(item.id),
      isDownloading: Boolean(folderStatus?.hasActive),
    };
  }, [activeDownloadsByFileId, driveFolderId, folderGroupStatusByFolderId, isLocalFolderContext, offlineFiles, offlineFolderIds, offlineLibraryFileIds]);

  const getRowSubtitle = useCallback(
    (item: FileListRow): string => {
      if (item.type === "folder") {
        const folderState = getRowOfflineState(item);
        if (folderState.isDownloading) {
          return "Downloading offline copy";
        }
        if (folderState.isOffline) {
          return "Available Offline";
        }

        return item.subtitle;
      }

      if (item.sourceKind === "local" || isLocalFolderContext) {
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
    [activeDownloadsByFileId, getRowOfflineState, isLocalFolderContext, offlineFiles],
  );

  const handleOpenRow = useCallback(
    (item: FileListRow) => {
      if (item.type === "folder") {
        if (routeContext.repoKind === "personal") {
          router.push(
            buildPersonalFolderRouteHref({
              folderId: item.id,
              folderName: item.title,
              trailLabels: [...currentTrailLabels, item.title],
              trailIds: [...currentTrailIds, item.id],
            }),
          );
          return;
        }

        if (!routeContext.departmentId || !routeContext.semesterId) {
          return;
        }

        router.push(
          buildGlobalFolderRouteHref({
            departmentId: routeContext.departmentId,
            semesterId: routeContext.semesterId,
            folderId: item.id,
            folderName: item.title,
            trailLabels: [...currentTrailLabels, item.title],
            trailIds: [...currentTrailIds, item.id],
          }),
        );
        return;
      }

      if (item.webViewLink) {
        if (autoPrefetchEnabled) {
          autoPrefetch(
            item.id,
            fileRows.map((row) => row.id),
          );
        }

        const rowState = getRowOfflineState(item);
        if (rowState.isOffline) {
          void openLocalFirst(
            item.id,
            `/api/file/${encodeURIComponent(item.id)}/stream`,
          );
          return;
        }

        window.open(item.webViewLink, "_blank", "noopener,noreferrer");
      }
    },
    [
      autoPrefetchEnabled,
      currentTrailIds,
      currentTrailLabels,
      fileRows,
      getRowOfflineState,
      routeContext,
      router,
    ],
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
          <div className={isGridView ? cn("grid grid-cols-2", compactModeEnabled ? "gap-2" : "gap-3") : cn(compactModeEnabled ? "space-y-1" : "space-y-2")}>
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
          <div className={isGridView ? cn("grid grid-cols-2", compactModeEnabled ? "gap-2" : "gap-3") : cn(compactModeEnabled ? "space-y-1" : "space-y-2")}>
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
          {isLocalFolderContext
            ? "Could not load this local folder."
            : `Could not load files for ${courseName}.`}
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
          {isLocalFolderContext
            ? "No indexed files found in this local folder."
            : "No files found in Drive for this course."}
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
        {isStale && typeof lastUpdatedAt === "number" ? (
          <div className="mb-2 inline-flex items-center rounded-full border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-300">
            Last updated {formatLastUpdatedLabel(lastUpdatedAt)}
          </div>
        ) : null}
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
                    {visibleRows.folders.map((item, index) => {
                      const rowState = getRowOfflineState(item);
                      return (
                        <FileRow
                          key={item.id}
                          id={item.id}
                          type={item.type}
                          title={item.title}
                          subtitle={getRowSubtitle(item)}
                          mimeType={item.mimeType}
                          sizeBytes={item.sizeBytes}
                          modifiedTime={item.modifiedTime}
                          webViewLink={item.webViewLink}
                          isOffline={rowState.isOffline}
                          isDownloading={rowState.isDownloading}
                          repositoryKind={routeContext.repoKind}
                          sourceKind={item.sourceKind}
                          viewMode={viewMode}
                          isOpen={openRowId === item.id}
                          swipeEnabled={swipeEnabled && !isGridView}
                          onToggleOpen={onToggleOpen}
                          onOpen={() => handleOpenRow(item)}
                          onRemoveOffline={() => {
                            void handleRemoveOffline(item);
                          }}
                          animationIndex={index}
                          compact={compactModeEnabled}
                        />
                      );
                    })}
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
                    {visibleRows.files.map((item, index) => {
                      const rowState = getRowOfflineState(item);
                      return (
                        <FileRow
                          key={item.id}
                          id={item.id}
                          type={item.type}
                          title={item.title}
                          subtitle={getRowSubtitle(item)}
                          mimeType={item.mimeType}
                          sizeBytes={item.sizeBytes}
                          modifiedTime={item.modifiedTime}
                          webViewLink={item.webViewLink}
                          isOffline={rowState.isOffline}
                          isDownloading={rowState.isDownloading}
                          repositoryKind={routeContext.repoKind}
                          sourceKind={item.sourceKind}
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
                          compact={compactModeEnabled}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className={rowContainerClass}>
            {visibleRows.all.map((item, index) => {
              const rowState = getRowOfflineState(item);
              return (
                <FileRow
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  title={item.title}
                  subtitle={getRowSubtitle(item)}
                  mimeType={item.mimeType}
                  sizeBytes={item.sizeBytes}
                  modifiedTime={item.modifiedTime}
                  webViewLink={item.webViewLink}
                  isOffline={rowState.isOffline}
                  isDownloading={rowState.isDownloading}
                  repositoryKind={routeContext.repoKind}
                  sourceKind={item.sourceKind}
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
                  compact={compactModeEnabled}
                />
              );
            })}
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
