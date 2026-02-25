"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { AddFolderCard } from "@/features/custom-folders/ui/AddFolderCard";
import { AddFolderDialog } from "@/features/custom-folders/ui/AddFolderDialog";
import { EditFolderSheet } from "@/features/custom-folders/ui/EditFolderSheet";
import { LocalFolderReconnectBanner } from "@/features/custom-folders/ui/LocalFolderReconnectBanner";
import { PersonalFolderCard } from "@/features/custom-folders/ui/PersonalFolderCard";
import { PersonalFolderListRow } from "@/features/custom-folders/ui/PersonalFolderListRow";
import { SmartCollectionsShelf } from "@/features/custom-folders/ui/SmartCollectionsShelf";
import { PinnedFilesShelf } from "@/features/custom-folders/ui/PinnedFilesShelf";
import { StudySetsShelf } from "@/features/custom-folders/ui/StudySetsShelf";
import { StudySetDetailView } from "@/features/custom-folders/ui/StudySetDetailView";
import { CollectionDetailView } from "@/features/custom-folders/ui/CollectionDetailView";
import { useSmartCollectionsStore } from "@/features/custom-folders/smart-collections.store";
import { useStudySetsStore } from "@/features/custom-folders/study-sets.store";
import { Button } from "@/components/ui/button";
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
  const [editingFolder, setEditingFolder] = useState<CustomFolder | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CustomFolder | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeStudySetId, setActiveStudySetId] = useState<string | null>(null);

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

  const filteredFolders = useMemo(() => {
    const filtered = orderedFolders.filter((folder) => {
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

      return matchesTagFilters(folder.tagIds, activeFilters, filterMode);
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
  }, [activeFilters, filterMode, orderedFolders, personalFilterMode, sortKey]);

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

  const hasFolders = orderedFolders.length > 0;
  const hasActivePersonalFilters = personalFilterMode !== "all" || activeFilters.length > 0;
  const reconnectFolderIds = useMemo(() => Array.from(needsReconnect), [needsReconnect]);

  const folderNameById = useMemo(
    () => new Map(orderedFolders.map((folder) => [folder.id, folder.label])),
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
    };

    handler();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [generateCollections, lastGeneratedAt, localFolders, refreshLocalFolder]);

  return (
    <section
      id="panel-personal-repository"
      role="tabpanel"
      aria-labelledby="tab-personal-repository"
      className={cn(
        "min-w-0 px-4 pb-32",
        showSharedChrome ? "pt-5 sm:pt-6" : "pt-3",
      )}
    >
      <header className="sr-only">
        <h2>Personal Repository</h2>
      </header>

      <div className="mb-2 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" size="icon" variant="ghost" aria-label="Personal Repository actions" />}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => {
                const nextName = `Study Set ${sets.length + 1}`;
                const setId = createSet(nextName);
                setActiveStudySetId(setId);
                toast.success(`${nextName} created`);
              }}
            >
              Create Study Set
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {reconnectFolderIds.length > 0 ? (
        <div className="mb-2">
          {reconnectFolderIds.map((folderId) => (
            <LocalFolderReconnectBanner key={folderId} folderId={folderId} />
          ))}
        </div>
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

      {!hasFolders ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/50 px-5 py-8 text-center">
          <h3 className="text-base font-semibold text-foreground">Your personal space is empty</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Add Drive folders you own or have access to —
            your notes, shared resources, anything you study from.
          </p>
          <Button type="button" className="mt-5" onClick={() => setIsAddDialogOpen(true)}>
            <IconPlus className="size-4" />
            Add Folder
          </Button>
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
        <motion.div layout className="mt-4 grid grid-cols-2 gap-4">
          <AddFolderCard onClick={() => setIsAddDialogOpen(true)} />
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
                  iconLayoutId={newlyAddedId === folder.id ? `personal-folder-icon-${folder.id}` : undefined}
                  onOpen={() => {
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
          <button
            type="button"
            onClick={() => setIsAddDialogOpen(true)}
            className="flex min-h-16 items-center gap-3 rounded-xl border-2 border-dotted border-border/70 bg-card/45 px-4 text-left transition-colors hover:border-primary/55 hover:bg-card"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border/70 bg-card">
              <IconPlus className="size-5 text-muted-foreground" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Add Folder</span>
              <span className="block text-xs text-muted-foreground">Connect another Drive folder or local folder</span>
            </span>
          </button>

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
                  onOpen={() => {
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
