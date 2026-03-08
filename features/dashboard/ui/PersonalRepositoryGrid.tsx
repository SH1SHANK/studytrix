"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FolderPlus, HeartPulse, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { AddFolderDialog } from "@/features/custom-folders/ui/AddFolderDialog";
import { CreateFolderSheet } from "@/features/custom-folders/ui/CreateFolderSheet";
import { FolderHealthBadge } from "@/features/custom-folders/ui/FolderHealthBadge";
import { EditFolderSheet } from "@/features/custom-folders/ui/EditFolderSheet";
import { FolderHealthSheet } from "@/features/custom-folders/ui/FolderHealthSheet";
import { LocalFolderReconnectBanner } from "@/features/custom-folders/ui/LocalFolderReconnectBanner";
import { PersonalFolderCard } from "@/features/custom-folders/ui/PersonalFolderCard";
import { PersonalFolderListRow } from "@/features/custom-folders/ui/PersonalFolderListRow";
import { QuickCaptureFAB } from "@/features/custom-folders/ui/QuickCaptureFAB";
import { QuickCaptureSheet } from "@/features/custom-folders/ui/QuickCaptureSheet";
import { SmartCollectionsShelf } from "@/features/custom-folders/ui/SmartCollectionsShelf";
import { PinnedFilesShelf } from "@/features/custom-folders/ui/PinnedFilesShelf";
import { StudySetsShelf } from "@/features/custom-folders/ui/StudySetsShelf";
import { StudySetDetailView } from "@/features/custom-folders/ui/StudySetDetailView";
import { CollectionDetailView } from "@/features/custom-folders/ui/CollectionDetailView";
import { useSmartCollectionsStore } from "@/features/custom-folders/smart-collections.store";
import { useStudySetsStore } from "@/features/custom-folders/study-sets.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getSortedPersonalFolders,
  useCustomFoldersStore,
} from "@/features/custom-folders/custom-folders.store";
import {
  type DashboardToolbarSortKey,
  useDashboardToolbarStore,
} from "@/features/dashboard/dashboard.toolbar.store";
import type { CustomFolder } from "@/features/custom-folders/custom-folders.types";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { buildPersonalFolderRouteHref } from "@/features/navigation/repository-route";
import { useTagStore } from "@/features/tags/tag.store";
import type { FilterMode, TagAssignment } from "@/features/tags/tag.types";
import { useSetting } from "@/ui/hooks/useSettings";
import { cn } from "@/lib/utils";
import { usePersonalFilesStore } from "@/features/custom-folders/personal-files.store";
import { savePersonalFileLocal } from "@/features/custom-folders/personal-files.ingest";
import { openLocalFirst } from "@/features/offline/offline.access";
import {
  drainPendingCaptures,
  getFailedCaptureCount,
  getFailedMoveCount,
  isCaptureSyncEnabled,
} from "@/features/custom-folders/capture.queue";
import { getFolderHealth } from "@/features/custom-folders/custom-folders.utils";
import {
  normalizePersonalFolderId,
  PERSONAL_ROOT_FOLDER_ID,
  PERSONAL_ROOT_LABEL,
} from "@/features/custom-folders/personal-root.constants";

type PersonalRepositoryGridProps = {
  showSharedChrome?: boolean;
};

type PersonalFolderViewModel = CustomFolder & {
  tagIds: string[];
  starred: boolean;
};

type FolderTagPreview = {
  id: string;
  name: string;
  color: string;
};

type PersonalFileView = {
  id: string;
  name: string;
  sourceLabel: string;
  mimeType?: string;
};

function createLocalVirtualFolderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local_virtual_${crypto.randomUUID()}`;
  }

  return `local_virtual_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function resolvePersonalAssignment(
  assignments: Record<string, TagAssignment>,
  folderId: string,
): { tagIds: string[]; starred: boolean } {
  const assignment = assignments[folderId];
  return {
    tagIds: [...(assignment?.tagIds ?? [])],
    starred: Boolean(assignment?.starred),
  };
}

function matchesTagFilters(
  tagIds: readonly string[],
  activeFilters: readonly string[],
  filterMode: FilterMode,
): boolean {
  if (activeFilters.length === 0) {
    return true;
  }

  const tagSet = new Set(tagIds);
  if (filterMode === "AND") {
    return activeFilters.every((tagId) => tagSet.has(tagId));
  }

  return activeFilters.some((tagId) => tagSet.has(tagId));
}

export function PersonalRepositoryGrid({ showSharedChrome = true }: PersonalRepositoryGridProps) {
  const router = useRouter();
  const hydrationRef = useRef(false);
  const folders = useCustomFoldersStore((state) => state.folders);
  const addFolder = useCustomFoldersStore((state) => state.addFolder);
  const removeFolder = useCustomFoldersStore((state) => state.removeFolder);
  const renameFolder = useCustomFoldersStore((state) => state.renameFolder);
  const refreshFolder = useCustomFoldersStore((state) => state.refreshFolder);
  const refreshLocalFolder = useCustomFoldersStore((state) => state.refreshLocalFolder);
  const updateFolder = useCustomFoldersStore((state) => state.updateFolder);
  const needsReconnect = useCustomFoldersStore((state) => state.needsReconnect);
  const pinnedFileIds = useCustomFoldersStore((state) => state.pinnedFileIds);
  const unpinFile = useCustomFoldersStore((state) => state.unpinFile);
  const reorderPinnedFiles = useCustomFoldersStore((state) => state.reorderPinnedFiles);
  const [defaultSortValue] = useSetting("default_sort_order");
  const [defaultDashboardView] = useSetting("dashboard_default_view");
  const sortKey = useDashboardToolbarStore((state) => state.sortKey);
  const setSortKey = useDashboardToolbarStore((state) => state.setSortKey);
  const viewMode = useDashboardToolbarStore((state) => state.viewMode);
  const setViewMode = useDashboardToolbarStore((state) => state.setViewMode);
  const personalFilterMode = useDashboardToolbarStore((state) => state.personalFilterMode);
  const setPersonalFilterMode = useDashboardToolbarStore((state) => state.setPersonalFilterMode);
  const indexedEntries = useIntelligenceStore((state) => state.indexedEntries);
  const personalFileRecords = usePersonalFilesStore((state) => state.records);
  const collections = useSmartCollectionsStore((state) => state.collections);
  const lastGeneratedAt = useSmartCollectionsStore((state) => state.lastGeneratedAt);
  const generateCollections = useSmartCollectionsStore((state) => state.generateCollections);
  const dismissCollection = useSmartCollectionsStore((state) => state.dismissCollection);
  const pinCollection = useSmartCollectionsStore((state) => state.pinCollection);
  const sets = useStudySetsStore((state) => state.sets);
  const createSet = useStudySetsStore((state) => state.createSet);
  const addFileToSet = useStudySetsStore((state) => state.addFileToSet);
  const removeFileFromSet = useStudySetsStore((state) => state.removeFileFromSet);
  const reorderSetFiles = useStudySetsStore((state) => state.reorderSetFiles);
  const renameSet = useStudySetsStore((state) => state.renameSet);
  const deleteSet = useStudySetsStore((state) => state.deleteSet);
  const {
    assignments,
    tags,
    activeFilters,
    filterMode,
    clearFilters,
    isHydrated,
    hydrate,
  } = useTagStore(
    useShallow((state) => ({
      assignments: state.assignments,
      tags: state.tags,
      activeFilters: state.activeFilters,
      filterMode: state.filterMode,
      clearFilters: state.clearFilters,
      isHydrated: state.isHydrated,
      hydrate: state.hydrate,
    })),
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [isFolderHealthOpen, setIsFolderHealthOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureMode, setQuickCaptureMode] = useState<"photo" | "note" | "voice">("photo");
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [isCreateStudySetOpen, setIsCreateStudySetOpen] = useState(false);
  const [studySetNameDraft, setStudySetNameDraft] = useState("");
  const [editingFolder, setEditingFolder] = useState<CustomFolder | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CustomFolder | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeStudySetId, setActiveStudySetId] = useState<string | null>(null);
  const [activeAcceptedTags, setActiveAcceptedTags] = useState<string[]>([]);

  useEffect(() => {
    if (defaultDashboardView === "grid" || defaultDashboardView === "list") {
      setViewMode(defaultDashboardView);
    }
  }, [defaultDashboardView, setViewMode]);

  useEffect(() => {
    const normalizedSort: DashboardToolbarSortKey =
      defaultSortValue === "name"
        ? "name"
        : defaultSortValue === "credits"
          ? "metric"
          : "recent";
    setSortKey(normalizedSort);
  }, [defaultSortValue, setSortKey]);

  useEffect(() => {
    if (isHydrated || hydrationRef.current) {
      return;
    }

    hydrationRef.current = true;
    void hydrate();
  }, [hydrate, isHydrated]);

  const orderedFolders = useMemo(
    () => getSortedPersonalFolders(folders).map((folder) => {
      const assignment = resolvePersonalAssignment(assignments, folder.id);
      return {
        ...folder,
        tagIds: assignment.tagIds,
        starred: assignment.starred,
      } satisfies PersonalFolderViewModel;
    }),
    [assignments, folders],
  );

  const rootFolders = useMemo(
    () => orderedFolders.filter((folder) => !folder.parentFolderId),
    [orderedFolders],
  );

  const folderTagsByRootId = useMemo(() => {
    const byId = new Map(orderedFolders.map((folder) => [folder.id, folder]));
    const tagsByRoot = new Map<string, Set<string>>();

    const resolveRootId = (folderId: string): string | null => {
      let cursor = byId.get(folderId);
      let safety = 0;
      while (cursor?.parentFolderId && safety < 50) {
        cursor = byId.get(cursor.parentFolderId);
        safety += 1;
      }
      return cursor?.id ?? (byId.has(folderId) ? folderId : null);
    };

    for (const record of personalFileRecords) {
      if (!Array.isArray(record.tags) || record.tags.length === 0) {
        continue;
      }
      const rootId = resolveRootId(record.folderId);
      if (!rootId) {
        continue;
      }

      const current = tagsByRoot.get(rootId) ?? new Set<string>();
      record.tags.forEach((tag) => {
        const normalized = tag.trim();
        if (normalized) {
          current.add(normalized);
        }
      });
      tagsByRoot.set(rootId, current);
    }

    return tagsByRoot;
  }, [orderedFolders, personalFileRecords]);

  const uniqueAcceptedTags = useMemo(
    () =>
      Array.from(
        new Set(
          personalFileRecords
            .flatMap((record) => record.tags)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [personalFileRecords],
  );

  const filteredFolders = useMemo(() => {
    const filtered = rootFolders.filter((folder) => {
      const matchesState =
        personalFilterMode === "pinned"
          ? folder.pinnedToTop
          : personalFilterMode === "unpinned"
            ? !folder.pinnedToTop
            : personalFilterMode === "starred"
              ? folder.starred
              : personalFilterMode === "unstarred"
                ? !folder.starred
                : true;

      if (!matchesState) {
        return false;
      }

      const matchesTagAssignments = matchesTagFilters(folder.tagIds, activeFilters, filterMode);
      if (!matchesTagAssignments) {
        return false;
      }

      if (activeAcceptedTags.length === 0) {
        return true;
      }

      const tagSet = folderTagsByRootId.get(folder.id) ?? new Set<string>();
      return activeAcceptedTags.every((tag) => tagSet.has(tag));
    });

    return [...filtered].sort((left, right) => {
      if (left.starred !== right.starred) {
        return left.starred ? -1 : 1;
      }

      if (left.pinnedToTop !== right.pinnedToTop) {
        return left.pinnedToTop ? -1 : 1;
      }

      switch (sortKey) {
        case "name":
          return left.label.localeCompare(right.label);
        case "metric":
          return (right.fileCount + right.folderCount) - (left.fileCount + left.folderCount);
        case "recent":
        default:
          return right.addedAt - left.addedAt;
      }
    });
  }, [activeAcceptedTags, activeFilters, filterMode, folderTagsByRootId, personalFilterMode, rootFolders, sortKey]);

  const localFolders = useMemo(
    () => orderedFolders.filter((folder) => (folder.sourceKind ?? "drive") === "local"),
    [orderedFolders],
  );

  const tagMap = useMemo(
    () => new Map(tags.map((tag) => [tag.id, { id: tag.id, name: tag.name, color: tag.color }])),
    [tags],
  );

  const folderTagPreviewById = useMemo(() => {
    const map = new Map<string, FolderTagPreview[]>();
    for (const folder of orderedFolders) {
      const previews: FolderTagPreview[] = [];
      for (const tagId of folder.tagIds) {
        const tag = tagMap.get(tagId);
        if (tag) {
          previews.push(tag);
        }
      }
      map.set(folder.id, previews);
    }
    return map;
  }, [orderedFolders, tagMap]);
  const folderHealthById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getFolderHealth>>();
    for (const folder of orderedFolders) {
      map.set(folder.id, getFolderHealth({ folder }));
    }
    return map;
  }, [orderedFolders]);

  const hasFolders = rootFolders.length > 0;
  const totalItemsCount = useMemo(
    () => orderedFolders.reduce((sum, folder) => sum + folder.fileCount + folder.folderCount, 0),
    [orderedFolders],
  );
  const hasActivePersonalFilters = personalFilterMode !== "all" || activeFilters.length > 0;
  const reconnectFolderIds = useMemo(() => Array.from(needsReconnect), [needsReconnect]);

  const folderNameById = useMemo(
    () => new Map<string, string>([
      [PERSONAL_ROOT_FOLDER_ID, PERSONAL_ROOT_LABEL],
      ...orderedFolders.map((folder) => [folder.id, folder.label] as const),
    ]),
    [orderedFolders],
  );

  const personalFileViewsById = useMemo(() => {
    const map = new Map<string, PersonalFileView>();

    for (const entry of indexedEntries) {
      if (entry.repoKind !== "personal" || entry.isFolder) {
        continue;
      }

      const sourceLabel = entry.customFolderId
        ? (folderNameById.get(entry.customFolderId) ?? "Personal Repository")
        : "Personal Repository";

      map.set(entry.fileId, {
        id: entry.fileId,
        name: entry.name,
        sourceLabel,
        mimeType: entry.mimeType,
      });
    }

    return map;
  }, [folderNameById, indexedEntries]);

  const allPersonalFiles = useMemo(
    () => Array.from(personalFileViewsById.values()).sort((left, right) => left.name.localeCompare(right.name)),
    [personalFileViewsById],
  );

  const activeCollection = useMemo(
    () => collections.find((collection) => collection.id === activeCollectionId) ?? null,
    [activeCollectionId, collections],
  );
  const activeCollectionFiles = useMemo(() => {
    if (!activeCollection) {
      return [] as Array<{ id: string; name: string; sourceLabel: string }>;
    }

    return activeCollection.fileIds
      .map((fileId) => personalFileViewsById.get(fileId))
      .filter((file): file is PersonalFileView => Boolean(file))
      .map((file) => ({ id: file.id, name: file.name, sourceLabel: file.sourceLabel }));
  }, [activeCollection, personalFileViewsById]);

  const activeStudySet = useMemo(
    () => sets.find((setItem) => setItem.id === activeStudySetId) ?? null,
    [activeStudySetId, sets],
  );
  const rootFileRecords = useMemo(
    () => personalFileRecords
      .filter((record) => normalizePersonalFolderId(record.folderId) === PERSONAL_ROOT_FOLDER_ID)
      .sort((left, right) => right.updatedAt - left.updatedAt),
    [personalFileRecords],
  );
  const quickCaptureDestinations = useMemo(
    () => [
      { id: PERSONAL_ROOT_FOLDER_ID, label: PERSONAL_ROOT_LABEL },
      ...rootFolders
        .filter((folder) => folder.id !== PERSONAL_ROOT_FOLDER_ID)
        .map((folder) => ({ id: folder.id, label: folder.label })),
    ],
    [rootFolders],
  );
  const queueSyncEnabled = isCaptureSyncEnabled();

  const refreshFailedSyncCount = useCallback(async () => {
    if (!queueSyncEnabled) {
      setFailedSyncCount(0);
      return;
    }

    const [failedCaptures, failedMoves] = await Promise.all([
      getFailedCaptureCount(),
      getFailedMoveCount(),
    ]);
    setFailedSyncCount(failedCaptures + failedMoves);
  }, [queueSyncEnabled]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      localFolders.forEach((folder) => {
        const lastScanned = folder.syncStatus?.lastScannedAt ?? 0;
        if (Date.now() - lastScanned > 30_000) {
          void refreshLocalFolder(folder.id);
        }
      });

      if (lastGeneratedAt === null || Date.now() - lastGeneratedAt > 86_400_000) {
        void generateCollections();
      }

      if (typeof navigator !== "undefined" && navigator.onLine) {
        void drainPendingCaptures().finally(() => {
          void refreshFailedSyncCount();
        });
      }
    };

    handler();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [generateCollections, lastGeneratedAt, localFolders, refreshFailedSyncCount, refreshLocalFolder]);

  useEffect(() => {
    const onOnline = () => {
      void drainPendingCaptures().finally(() => {
        void refreshFailedSyncCount();
      });
    };

    void refreshFailedSyncCount();
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [refreshFailedSyncCount]);

  return (
    <section
      id="panel-personal-repository"
      role="tabpanel"
      aria-labelledby="tab-personal-repository"
      className={cn(
        "min-w-0 px-4 pb-32 lg:px-6 xl:px-8",
        showSharedChrome ? "pt-5 sm:pt-6" : "pt-3",
      )}
    >
      <header className="sr-only">
        <h2>Personal Repository</h2>
      </header>

      <div className="mb-3 rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/95 to-primary/5 p-3 shadow-sm backdrop-blur-sm sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              Personal Repository
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {orderedFolders.length} folders · {totalItemsCount} items
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" size="icon" variant="ghost" aria-label="Personal Repository actions" />}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsFolderHealthOpen(true)}>
                Open Folder Health
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Button type="button" size="sm" className="justify-start" onClick={() => setIsAddDialogOpen(true)}>
            <FolderPlus className="size-4" />
            Add Folder
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={() => {
              setCreateFolderParentId(null);
              setIsCreateFolderOpen(true);
            }}
          >
            <FolderPlus className="size-4" />
            Create Folder
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={() => {
              setQuickCaptureMode("photo");
              setQuickCaptureOpen(true);
            }}
          >
            <Camera className="size-4" />
            Quick Capture
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={() => setIsCreateStudySetOpen(true)}
          >
            <IconPlus className="size-4" />
            New Study Set
          </Button>
        </div>

        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => setIsFolderHealthOpen(true)}>
            <HeartPulse className="size-4" />
            Folder Health
          </Button>
        </div>
      </div>

      {reconnectFolderIds.length > 0 ? (
        <div className="mb-2">
          {reconnectFolderIds.map((folderId) => (
            <LocalFolderReconnectBanner key={folderId} folderId={folderId} />
          ))}
        </div>
      ) : null}

      {queueSyncEnabled && failedSyncCount > 0 ? (
        <button
          type="button"
          className="mb-2 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-800 dark:text-amber-300"
          onClick={() => {
            void drainPendingCaptures().finally(() => {
              void refreshFailedSyncCount();
            });
          }}
        >
          {failedSyncCount} sync operation{failedSyncCount === 1 ? "" : "s"} failed. Tap to retry.
        </button>
      ) : null}

      {rootFileRecords.length > 0 ? (
        <section className="mb-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{PERSONAL_ROOT_LABEL}</h3>
              <p className="text-xs text-muted-foreground">
                {rootFileRecords.length} file{rootFileRecords.length === 1 ? "" : "s"} saved at root
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {rootFileRecords.slice(0, 5).map((record) => (
              <div
                key={`root-file-${record.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{record.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{record.mimeType || "application/octet-stream"}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void openLocalFirst(record.id, `/api/file/${encodeURIComponent(record.id)}/stream`)
                      .then((opened) => {
                        if (!opened) {
                          toast.error("This file is unavailable right now.");
                        }
                      });
                  }}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <SmartCollectionsShelf
        collections={collections}
        onOpenCollection={setActiveCollectionId}
        onPinCollection={pinCollection}
        onDismissCollection={dismissCollection}
      />

      <PinnedFilesShelf
        pinnedFileIds={pinnedFileIds}
        filesById={personalFileViewsById}
        onUnpin={unpinFile}
        onReorder={reorderPinnedFiles}
      />

      <StudySetsShelf
        sets={sets}
        onOpenSet={setActiveStudySetId}
      />

      {uniqueAcceptedTags.length >= 3 ? (
        <section className="mt-3 space-y-2">
          <header className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tags
          </header>
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {uniqueAcceptedTags.map((tag) => {
              const active = activeAcceptedTags.includes(tag);
              return (
                <button
                  key={`accepted-tag-${tag}`}
                  type="button"
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/45 bg-primary/12 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40",
                  )}
                  onClick={() => {
                    setActiveAcceptedTags((current) =>
                      current.includes(tag)
                        ? current.filter((entry) => entry !== tag)
                        : [...current, tag],
                    );
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {!hasFolders ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/50 px-5 py-8 text-center">
          <h3 className="text-base font-semibold text-foreground">Your personal space is empty</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use the actions above to add folders, create study sets, and start quick capture.
          </p>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          <p>No folders match the current filters.</p>
          {hasActivePersonalFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setPersonalFilterMode("all");
                clearFilters();
              }}
            >
              Clear personal filters
            </Button>
          ) : null}
        </div>
      ) : viewMode === "grid" ? (
        <motion.div layout className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filteredFolders.map((folder, index) => (
              <motion.div
                key={folder.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.985 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.16) }}
              >
                <PersonalFolderCard
                  folder={folder}
                  starred={folder.starred}
                  tags={folderTagPreviewById.get(folder.id) ?? []}
                  errorState={folderHealthById.get(folder.id)?.status === "error"}
                  healthBadge={folderHealthById.get(folder.id) ? (
                    <FolderHealthBadge health={folderHealthById.get(folder.id)!} />
                  ) : null}
                  iconLayoutId={newlyAddedId === folder.id ? `personal-folder-icon-${folder.id}` : undefined}
                  onOpen={() => {
                    const health = folderHealthById.get(folder.id);
                    if (health?.status === "error" && (folder.sourceKind ?? "drive") === "local") {
                      void refreshLocalFolder(folder.id);
                      return;
                    }
                    router.push(
                      buildPersonalFolderRouteHref({
                        folderId: folder.id,
                        folderName: folder.label,
                        trailLabels: [folder.label],
                        trailIds: [folder.id],
                      }),
                    );
                  }}
                  onRename={(nextLabel) => {
                    renameFolder(folder.id, nextLabel);
                    toast.success(`${nextLabel} updated in your Personal Repository`);
                  }}
                  onRefresh={async () => {
                    try {
                      await refreshFolder(folder.id);
                      toast.success(`${folder.label} refreshed`);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Couldn't refresh this folder.");
                    }
                  }}
                  onNewSubfolder={() => {
                    setCreateFolderParentId(folder.id);
                    setIsCreateFolderOpen(true);
                  }}
                  onAddFiles={() => {
                    router.push(
                      buildPersonalFolderRouteHref({
                        folderId: folder.id,
                        folderName: folder.label,
                        trailLabels: [folder.label],
                        trailIds: [folder.id],
                      }),
                    );
                  }}
                  onRemove={() => {
                    setRemoveTarget(folder);
                  }}
                  onEdit={() => setEditingFolder(folder)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div layout className="mt-4 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {filteredFolders.map((folder, index) => (
              <motion.div
                key={folder.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, delay: Math.min(index * 0.02, 0.12) }}
              >
                <PersonalFolderListRow
                  entityId={folder.id}
                  title={folder.label}
                  meta={`${folder.fileCount} files · ${folder.folderCount} folders`}
                  folderColor={folder.colour}
                  sourceKind={folder.sourceKind}
                  starred={folder.starred}
                  tags={folderTagPreviewById.get(folder.id) ?? []}
                  errorState={folderHealthById.get(folder.id)?.status === "error"}
                  healthBadge={folderHealthById.get(folder.id) ? (
                    <FolderHealthBadge health={folderHealthById.get(folder.id)!} />
                  ) : null}
                  onOpen={() => {
                    const health = folderHealthById.get(folder.id);
                    if (health?.status === "error" && (folder.sourceKind ?? "drive") === "local") {
                      void refreshLocalFolder(folder.id);
                      return;
                    }
                    router.push(
                      buildPersonalFolderRouteHref({
                        folderId: folder.id,
                        folderName: folder.label,
                        trailLabels: [folder.label],
                        trailIds: [folder.id],
                      }),
                    );
                  }}
                  onRename={() => {
                    setEditingFolder(folder);
                  }}
                  onRefresh={async () => {
                    try {
                      await refreshFolder(folder.id);
                      toast.success(`${folder.label} refreshed`);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Couldn't refresh this folder.");
                    }
                  }}
                  onNewSubfolder={() => {
                    setCreateFolderParentId(folder.id);
                    setIsCreateFolderOpen(true);
                  }}
                  onAddFiles={() => {
                    router.push(
                      buildPersonalFolderRouteHref({
                        folderId: folder.id,
                        folderName: folder.label,
                        trailLabels: [folder.label],
                        trailIds: [folder.id],
                      }),
                    );
                  }}
                  onEdit={() => setEditingFolder(folder)}
                  onRemove={() => setRemoveTarget(folder)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AddFolderDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onFolderAdded={(folderId) => {
          setNewlyAddedId(folderId);
          window.setTimeout(() => setNewlyAddedId((current) => (current === folderId ? null : current)), 700);
        }}
      />

      <CreateFolderSheet
        open={isCreateFolderOpen}
        onOpenChange={(open) => {
          setIsCreateFolderOpen(open);
          if (!open) {
            setCreateFolderParentId(null);
          }
        }}
        parentOptions={rootFolders.map((folder) => ({ id: folder.id, label: folder.label }))}
        defaultParentId={createFolderParentId}
        onCreate={({ name, colour, parentFolderId }) => {
          const now = Date.now();
          const folderId = createLocalVirtualFolderId();
          const nextFolder: CustomFolder = {
            id: folderId,
            label: name,
            colour,
            pinnedToTop: false,
            addedAt: now,
            lastRefreshedAt: now,
            fileCount: 0,
            folderCount: 0,
            accessVerifiedAt: now,
            sourceKind: "local-virtual",
            parentFolderId: parentFolderId ?? undefined,
            syncStatus: {
              lastScannedAt: now,
              fileCount: 0,
              lastSyncError: null,
            },
          };
          addFolder(nextFolder);

          const existingFolders = useCustomFoldersStore.getState().folders;
          const byId = new Map(existingFolders.map((folder) => [folder.id, folder]));
          byId.set(nextFolder.id, nextFolder);
          const lineage: CustomFolder[] = [];
          let cursor: CustomFolder | undefined = nextFolder;
          let safety = 0;
          while (cursor && safety < 50) {
            lineage.push(cursor);
            cursor = cursor.parentFolderId ? byId.get(cursor.parentFolderId) : undefined;
            safety += 1;
          }
          lineage.reverse();
          const ancestorIds = lineage.slice(0, -1).map((folder) => folder.id);
          const customFolderId = lineage[0]?.id ?? nextFolder.id;
          const fullPath = lineage.map((folder) => folder.label).join(" > ");
          void useIntelligenceStore.getState().indexIncrementalFiles([
            {
              fileId: nextFolder.id,
              name: nextFolder.label,
              fullPath,
              ancestorIds,
              depth: ancestorIds.length,
              isFolder: true,
              repoKind: "personal",
              customFolderId,
              mimeType: "application/vnd.google-apps.folder",
            },
          ]);
          if (!parentFolderId) {
            setNewlyAddedId(folderId);
            window.setTimeout(() => setNewlyAddedId((current) => (current === folderId ? null : current)), 700);
          }
          toast.success("Folder created");
        }}
      />

      <FolderHealthSheet
        open={isFolderHealthOpen}
        onOpenChange={setIsFolderHealthOpen}
      />

      <Dialog
        open={isCreateStudySetOpen}
        onOpenChange={(open) => {
          setIsCreateStudySetOpen(open);
          if (!open) {
            setStudySetNameDraft("");
          }
        }}
      >
        <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-border/70 p-4 sm:inset-auto sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
          <DialogHeader>
            <DialogTitle>Create Study Set</DialogTitle>
            <DialogDescription>Name your set and start adding files.</DialogDescription>
          </DialogHeader>
          <Input
            value={studySetNameDraft}
            maxLength={40}
            onChange={(event) => setStudySetNameDraft(event.target.value)}
            placeholder={`Study Set ${sets.length + 1}`}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateStudySetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const nextName = studySetNameDraft.trim() || `Study Set ${sets.length + 1}`;
                const setId = createSet(nextName);
                setActiveStudySetId(setId);
                setIsCreateStudySetOpen(false);
                setStudySetNameDraft("");
                toast.success(`${nextName} created`);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickCaptureSheet
        open={quickCaptureOpen}
        onOpenChange={setQuickCaptureOpen}
        initialMode={quickCaptureMode}
        destinations={quickCaptureDestinations}
        onCreateFolder={() => {
          setCreateFolderParentId(null);
          setIsCreateFolderOpen(true);
        }}
        onSaveCapture={async (capture) => {
          try {
            await savePersonalFileLocal({
              folderId: capture.folderId,
              fileName: capture.fileName,
              mimeType: capture.mimeType,
              blob: capture.blob,
              source: "capture",
            });
            toast.success("Capture saved");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Could not save this capture.";
            toast.error(message);
            throw error;
          }
        }}
      />

      <QuickCaptureFAB
        onOpen={(mode) => {
          setQuickCaptureMode(mode ?? "photo");
          setQuickCaptureOpen(true);
        }}
      />

      <EditFolderSheet
        open={editingFolder !== null}
        folder={editingFolder}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingFolder(null);
          }
        }}
        onSave={(patch) => {
          if (!editingFolder) {
            return;
          }
          updateFolder(editingFolder.id, patch);
          toast.success(`${patch.label} updated in your Personal Repository`);
          setEditingFolder(null);
        }}
      />

      <CollectionDetailView
        open={activeCollection !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveCollectionId(null);
          }
        }}
        collection={activeCollection}
        files={activeCollectionFiles}
      />

      <StudySetDetailView
        open={activeStudySet !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveStudySetId(null);
          }
        }}
        setItem={activeStudySet}
        filesById={personalFileViewsById}
        allPersonalFiles={allPersonalFiles}
        onReorderFiles={reorderSetFiles}
        onRemoveFile={removeFileFromSet}
        onAddFiles={(setId, fileIds) => {
          fileIds.forEach((fileId) => addFileToSet(setId, fileId));
        }}
        onRenameSet={renameSet}
        onDeleteSet={deleteSet}
      />

      <Dialog open={removeTarget !== null} onOpenChange={(nextOpen) => !nextOpen && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from Personal Repository</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `Remove "${removeTarget.label}" from your Personal Repository?`
                : "Remove this folder from your Personal Repository?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!removeTarget) {
                  return;
                }
                removeFolder(removeTarget.id);
                toast.success(`${removeTarget.label} removed from Personal Repository`);
                setRemoveTarget(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
