"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ExternalLink, CheckCircle2, HardDrive, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { openLocalFirst } from "@/features/offline/offline.access";
import { formatFileSize, getMimeLabel } from "@/features/drive/drive.types";
import type { DriveFileDocType, WorkspaceDocType, FolderDocType } from "@/db/types";
import { EmptyState } from "@/components/ui/empty-state";
import { FileRowSkeleton } from "@/components/ui/skeleton-layouts";

export function AllFilesView() {
  const [files, setFiles] = useState<DriveFileDocType[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceDocType[]>([]);
  const [folders, setFolders] = useState<FolderDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMimeType, setSelectedMimeType] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [offlineFilter, setOfflineFilter] = useState<"all" | "offline" | "remote">("all");

  useEffect(() => {
    let isMounted = true;

    // 1. Observe files
    const sub = driveFileRepository.observeAllFiles().subscribe({
      next: (items) => {
        if (isMounted) {
          setFiles(items);
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("[AllFilesView] Error loading files:", err);
      },
    });

    // 2. Load workspaces and folders for local organizational context
    Promise.all([
      workspaceRepository.getAll(),
      (async () => {
        const db = await (await import("@/db/database")).getDatabase();
        const fldDocs = await db.folders.find().exec();
        return fldDocs.map((d) => d.toJSON() as FolderDocType);
      })(),
    ])
      .then(([wsList, fldList]) => {
        if (isMounted) {
          setWorkspaces(wsList);
          setFolders(fldList);
        }
      })
      .catch((err) => {
        console.error("[AllFilesView] Error loading context:", err);
      });

    return () => {
      isMounted = false;
      sub.unsubscribe();
    };
  }, []);

  const workspaceMap = useMemo(() => {
    const map = new Map<string, WorkspaceDocType>();
    for (const ws of workspaces) {
      map.set(ws.id, ws);
    }
    return map;
  }, [workspaces]);

  const folderMap = useMemo(() => {
    const map = new Map<string, FolderDocType>();
    for (const fld of folders) {
      map.set(fld.id, fld);
    }
    return map;
  }, [folders]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (selectedWorkspaceId && f.workspaceId !== selectedWorkspaceId) {
        return false;
      }
      if (offlineFilter === "offline" && f.contentStatus !== "downloaded") {
        return false;
      }
      if (offlineFilter === "remote" && f.contentStatus === "downloaded") {
        return false;
      }
      if (selectedMimeType && !f.mimeType.includes(selectedMimeType)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
      }
      return true;
    });
  }, [files, searchQuery, selectedMimeType, selectedWorkspaceId, offlineFilter]);

  const handleOpenFile = async (file: DriveFileDocType) => {
    void driveFileRepository.recordFileOpen(file.id);
    try {
      const opened = await openLocalFirst(file.driveFileId, file.webViewUrl || undefined);
      if (!opened && file.webViewUrl) {
        window.open(file.webViewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (file.webViewUrl) {
        window.open(file.webViewUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const router = useRouter();

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedMimeType(null);
    setSelectedWorkspaceId(null);
    setOfflineFilter("all");
  };

  if (loading && files.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
        {Array.from({ length: 8 }).map((_, i) => (
          <FileRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search all files by title or path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {/* Offline Filter */}
          <Button
            variant={offlineFilter === "offline" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setOfflineFilter((prev) => (prev === "offline" ? "all" : "offline"))}
            className="h-7 text-xs gap-1"
          >
            <CheckCircle2 className="size-3 text-emerald-500" />
            Offline Only
          </Button>

          {/* Type Filters */}
          <Button
            variant={selectedMimeType === null && offlineFilter === "all" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => {
              setSelectedMimeType(null);
              setOfflineFilter("all");
            }}
            className="h-7 text-xs"
          >
            All Types
          </Button>
          <Button
            variant={selectedMimeType === "pdf" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setSelectedMimeType((prev) => (prev === "pdf" ? null : "pdf"))}
            className="h-7 text-xs"
          >
            PDFs
          </Button>
          <Button
            variant={selectedMimeType === "document" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setSelectedMimeType((prev) => (prev === "document" ? null : "document"))}
            className="h-7 text-xs"
          >
            Docs
          </Button>
          <Button
            variant={selectedMimeType === "presentation" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setSelectedMimeType((prev) => (prev === "presentation" ? null : "presentation"))}
            className="h-7 text-xs"
          >
            Slides
          </Button>
        </div>
      </div>

      {/* Workspace Quick-Filter Pills if workspaces exist */}
      {workspaces.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-muted-foreground">
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground mr-1">Workspace:</span>
          <Button
            variant={selectedWorkspaceId === null ? "default" : "outline"}
            size="xs"
            onClick={() => setSelectedWorkspaceId(null)}
            className="h-6 text-[11px] rounded-full"
          >
            All
          </Button>
          {workspaces.map((ws) => (
            <Button
              key={ws.id}
              variant={selectedWorkspaceId === ws.id ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedWorkspaceId((prev) => (prev === ws.id ? null : ws.id))}
              className="h-6 text-[11px] rounded-full"
            >
              {ws.name}
            </Button>
          ))}
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No study files yet"
          description="Connect a public Google Drive folder or organize documents into your workspaces to start building your library."
          primaryAction={{
            label: "Connect Drive Folder",
            icon: HardDrive,
            onClick: () => {
              router.push("/sources");
            },
          }}
        />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          icon={FilterX}
          title="No matching files found"
          description={
            searchQuery
              ? `No documents match "${searchQuery}". Try a different name, tag, or workspace.`
              : "No documents match the selected workspace and type filters."
          }
          primaryAction={{
            label: "Reset All Filters",
            onClick: handleResetFilters,
          }}
          compact
        />
      ) : (
        <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card overflow-hidden">
          {filteredFiles.map((file) => {
            const sizeLabel = formatFileSize(file.size);
            const mimeLabel = getMimeLabel(file.mimeType, file.name);
            const ws = file.workspaceId ? workspaceMap.get(file.workspaceId) : null;
            const fld = file.localFolderId ? folderMap.get(file.localFolderId) : null;

            const orgContext = [
              ws ? ws.name : null,
              fld ? fld.name : null,
            ].filter(Boolean).join(" / ");

            const metaParts = [sizeLabel, mimeLabel, orgContext || file.path].filter(Boolean);
            const metaString = metaParts.join(" · ");

            return (
              <div
                key={file.id}
                onClick={() => void handleOpenFile(file)}
                className="flex items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {file.name}
                      </h4>
                      {ws && (
                        <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          {ws.name}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {metaString}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.contentStatus === "downloaded" ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="size-3" />
                      Offline Ready
                    </span>
                  ) : null}

                  {file.webViewUrl ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(file.webViewUrl!, "_blank", "noopener,noreferrer");
                      }}
                      className="size-7 text-muted-foreground hover:text-foreground"
                      title="Open in Google Drive"
                    >
                      <ExternalLink className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
