"use client";

import { useCallback, useEffect, useState } from "react";
import { Folder, FolderPlus, Plus, HardDrive, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useFileManagerViewMode } from "@/features/file/ui/file-manager/ControlsBar";
import { FileRow } from "@/features/file/ui/file-manager/FileRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDriveFolder } from "@/features/drive/drive.hooks";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";
import { formatFileSize, getMimeLabel, type DriveItem } from "@/features/drive/drive.types";
import { folderRepository } from "@/db/repositories/folder.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import type { FolderDocType } from "@/db/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { FileRowSkeleton, FolderRowSkeleton } from "@/components/ui/skeleton-layouts";

interface FileListProps {
  driveFolderId: string;
  workspaceId?: string;
  folderName?: string;
}

export function FileList({ driveFolderId, workspaceId }: FileListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewMode } = useFileManagerViewMode();
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  // Local folders state
  const [localFolders, setLocalFolders] = useState<FolderDocType[]>([]);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { folders: driveFolders, files, isLoading, error } = useDriveFolder(driveFolderId);
  const offlineFiles = useOfflineIndexStore((state) => state.snapshot.offlineFiles);
  const { startDownload, tasks } = useDownloadManager();

  // Load local user-created folders for this workspace
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    folderRepository.getFoldersInFolder(workspaceId, driveFolderId).then((items) => {
      if (isMounted) setLocalFolders(items);
    });

    const sub = folderRepository
      .observeFoldersInFolder(workspaceId, driveFolderId)
      .subscribe((items) => {
        if (isMounted) setLocalFolders(items);
      });

    return () => {
      isMounted = false;
      sub.unsubscribe();
    };
  }, [driveFolderId, workspaceId]);

  const handleCreateLocalFolder = async () => {
    if (!workspaceId || !newFolderName.trim()) return;

    try {
      await folderRepository.createFolder({
        workspaceId,
        parentFolderId: driveFolderId || null,
        name: newFolderName.trim(),
      });
      toast.success(`Created folder "${newFolderName.trim()}"`);
      setNewFolderName("");
      setNewFolderDialogOpen(false);
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleOpenFolder = useCallback(
    (folder: DriveItem) => {
      const currentTrail = searchParams.get("trail") || "";
      const nextTrail = currentTrail ? `${currentTrail}/${folder.name}` : folder.name;
      const params = new URLSearchParams(searchParams.toString());
      params.set("name", folder.name);
      params.set("trail", nextTrail);

      if (workspaceId) {
        router.push(`/workspace/${workspaceId}/folder/${folder.id}?${params.toString()}`);
      } else {
        router.push(`/workspace/${folder.id}?${params.toString()}`);
      }
    },
    [router, searchParams, workspaceId],
  );

  const handleOpenFile = async (file: DriveItem) => {
    void driveFileRepository.recordFileOpen(file.id);
    try {
      const opened = await openLocalFirst(file.id, file.webViewLink || undefined);
      if (!opened && file.webViewLink) {
        window.open(file.webViewLink, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (file.webViewLink) {
        window.open(file.webViewLink, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleMakeOffline = (file: DriveItem) => {
    void startDownload(file.id);
  };

  // Combine Drive folders with local user-created folders
  const allFolders: (DriveItem & { isLocal?: boolean })[] = [
    ...localFolders.map((fld) => ({
      id: fld.id,
      name: fld.name,
      mimeType: "application/vnd.google-apps.folder",
      size: null,
      modifiedTime: new Date(fld.updatedAt).toISOString(),
      isFolder: true,
      webViewLink: null,
      iconLink: null,
      isLocal: true,
    })),
    ...driveFolders.map((fld) => ({ ...fld, isLocal: false })),
  ];

  const isEmpty = !isLoading && allFolders.length === 0 && files.length === 0 && !error;

  return (
    <div className="space-y-4">
      {/* Folder Header Toolbar */}
      {workspaceId ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {allFolders.length} {allFolders.length === 1 ? "folder" : "folders"} · {files.length}{" "}
            {files.length === 1 ? "file" : "files"}
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setNewFolderDialogOpen(true)}
            className="h-7 gap-1 text-xs font-medium"
          >
            <FolderPlus className="size-3.5" />
            New Folder
          </Button>
        </div>
      ) : null}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <FolderRowSkeleton key={i} />
            ))}
          </div>
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
            {Array.from({ length: 4 }).map((_, i) => (
              <FileRowSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Error state */}
      {error && !isLoading ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-xs text-muted-foreground">
          <AlertCircle className="size-4 text-amber-500 shrink-0" />
          <span>Couldn&apos;t refresh remote folder contents. Your local offline files are still available.</span>
        </div>
      ) : null}

      {/* Empty State */}
      {isEmpty ? (
        <EmptyState
          icon={Folder}
          title={driveFolderId ? "Nothing in this folder yet" : "This workspace is empty"}
          description={
            driveFolderId
              ? "Create a subfolder or organize study material here."
              : "Create your first folder or connect Google Drive to organize lecture notes and documents."
          }
          primaryAction={
            workspaceId
              ? {
                  label: "New Folder",
                  icon: Plus,
                  onClick: () => setNewFolderDialogOpen(true),
                }
              : undefined
          }
          secondaryAction={
            !driveFolderId
              ? {
                  label: "Connect Drive",
                  icon: HardDrive,
                  onClick: () => {
                    router.push("/sources");
                  },
                }
              : undefined
          }
        />
      ) : null}

      {/* Subfolders Section */}
      {allFolders.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Folders ({allFolders.length})
            </span>
          </div>

          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : "space-y-1.5",
            )}
          >
            {allFolders.map((folder) => (
              <FileRow
                key={folder.id}
                id={folder.id}
                type="folder"
                title={folder.name}
                subtitle={folder.isLocal ? "Local Folder" : "Drive Folder"}
                mimeType={folder.mimeType}
                sizeBytes={0}
                modifiedTime={folder.modifiedTime}
                webViewLink={folder.webViewLink}
                viewMode={viewMode}
                isOpen={openItemId === folder.id}
                onToggleOpen={(id) => setOpenItemId(id)}
                onOpen={() => handleOpenFolder(folder)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Files Section */}
      {files.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Files ({files.length})
            </span>
          </div>

          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : "space-y-1.5",
            )}
          >
            {files.map((file) => {
              const isOff = Boolean(offlineFiles[file.id]);
              const currentTask = tasks[file.id];
              const isDown =
                currentTask?.state === "downloading" ||
                currentTask?.state === "queued" ||
                currentTask?.state === "waiting";
              const sizeLabel = formatFileSize(file.size);
              const mimeLabel = getMimeLabel(file.mimeType, file.name);
              const subtitle = [sizeLabel, mimeLabel].filter(Boolean).join(" · ") || "File";

              return (
                <FileRow
                  key={file.id}
                  id={file.id}
                  type="file"
                  title={file.name}
                  subtitle={subtitle}
                  mimeType={file.mimeType}
                  sizeBytes={file.size ?? 0}
                  modifiedTime={file.modifiedTime}
                  webViewLink={file.webViewLink}
                  isOffline={isOff}
                  isDownloading={isDown}
                  viewMode={viewMode}
                  isOpen={openItemId === file.id}
                  onToggleOpen={(id) => setOpenItemId(id)}
                  onOpen={() => void handleOpenFile(file)}
                  onMakeOffline={() => handleMakeOffline(file)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Create Local Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. Lecture Notes, Practice Sets"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateLocalFolder();
                }
              }}
              autoFocus
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewFolderName("");
                setNewFolderDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCreateLocalFolder()}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
