"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFolderHealth } from "@/features/custom-folders/custom-folders.utils";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { FolderHealthBadge } from "@/features/custom-folders/ui/FolderHealthBadge";

type FolderHealthSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FolderHealthSheet({ open, onOpenChange }: FolderHealthSheetProps) {
  const folders = useCustomFoldersStore((state) => state.folders);
  const refreshFolder = useCustomFoldersStore((state) => state.refreshFolder);
  const indexedEntries = useIntelligenceStore((state) => state.indexedEntries);
  const offlineFiles = useOfflineIndexStore((state) => state.snapshot.offlineFiles);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [refreshAllInFlight, setRefreshAllInFlight] = useState(false);

  const folderOfflineState = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const folder of folders) {
      const files = indexedEntries.filter((entry) =>
        entry.repoKind === "personal"
        && !entry.isFolder
        && entry.customFolderId === folder.id);
      if (files.length === 0) {
        map.set(folder.id, false);
        continue;
      }

      map.set(folder.id, files.every((entry) => Boolean(offlineFiles[entry.fileId])));
    }
    return map;
  }, [folders, indexedEntries, offlineFiles]);

  const refreshOne = async (folderId: string): Promise<void> => {
    setRefreshingIds((current) => {
      const next = new Set(current);
      next.add(folderId);
      return next;
    });
    try {
      await refreshFolder(folderId);
    } catch {
    } finally {
      setRefreshingIds((current) => {
        const next = new Set(current);
        next.delete(folderId);
        return next;
      });
    }
  };

  const refreshAll = async (): Promise<void> => {
    if (refreshAllInFlight) {
      return;
    }
    setRefreshAllInFlight(true);
    try {
      await folders.reduce<Promise<void>>(async (chain, folder) => {
        await chain;
        await refreshOne(folder.id);
      }, Promise.resolve());
    } finally {
      setRefreshAllInFlight(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto max-h-[80dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-border/70 p-0 sm:inset-auto sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[75dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
        <div className="max-h-[72dvh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Folder Health</DialogTitle>
            <DialogDescription>Monitor sync and offline readiness for Personal Repository folders.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            {folders.map((folder) => {
              const health = getFolderHealth({
                folder,
                isRefreshing: refreshingIds.has(folder.id),
                allFilesOfflineCached: folderOfflineState.get(folder.id) ?? false,
              });

              return (
                <button
                  key={folder.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-left"
                  onClick={() => void refreshOne(folder.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{folder.label}</span>
                    <FolderHealthBadge health={health} />
                  </span>
                  <span className="text-xs text-muted-foreground">Refresh</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/70 p-4">
          <Button type="button" className="w-full" disabled={refreshAllInFlight} onClick={() => void refreshAll()}>
            {refreshAllInFlight ? "Refreshing..." : "Refresh All"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
