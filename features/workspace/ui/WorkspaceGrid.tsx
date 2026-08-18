"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pin, Folder, Clock, FileText, ArrowRight, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRxWorkspaces } from "@/hooks/useRxWorkspaces";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { WorkspaceCard } from "./WorkspaceCard";
import { AddWorkspaceDialog } from "./AddWorkspaceDialog";
import { DriveSourcesPanel } from "@/features/drive/ui/DriveSourcesPanel";
import { AddDriveSourceDialog } from "@/features/drive/ui/AddDriveSourceDialog";
import { openLocalFirst } from "@/features/offline/offline.access";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceCardSkeleton } from "@/components/ui/skeleton-layouts";

export function WorkspaceGrid() {
  const { workspaces, loading } = useRxWorkspaces();
  const { recentFiles } = useRecentFiles(4);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);

  const pinnedWorkspaces = useMemo(
    () => workspaces.filter((w) => w.pinned),
    [workspaces],
  );

  const unpinnedWorkspaces = useMemo(
    () => workspaces.filter((w) => !w.pinned),
    [workspaces],
  );

  const handleOpenFile = async (fileId: string, webViewUrl: string | null) => {
    try {
      const opened = await openLocalFirst(fileId, webViewUrl || undefined);
      if (!opened && webViewUrl) {
        window.open(webViewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (webViewUrl) {
        window.open(webViewUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
            Study Library
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Access your study workspaces, local notes, and connected Google Drive materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setDriveDialogOpen(true)}
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs font-medium"
          >
            <HardDrive className="size-3.5" />
            Connect Drive
          </Button>

          <Button
            onClick={() => setAddDialogOpen(true)}
            size="sm"
            className="shrink-0 gap-1.5 text-xs font-medium"
          >
            <Plus className="size-3.5" />
            New Workspace
          </Button>
        </div>
      </div>

      {/* Continue Studying (Recent Files) */}
      {recentFiles.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3.5" />
              Continue Studying
            </div>
            <Link
              href="/recent"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {recentFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => void handleOpenFile(file.driveFileId, file.webViewUrl)}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3 text-left transition-all hover:border-border hover:shadow-xs group cursor-pointer"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {file.name}
                  </h4>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {file.path || "File"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Workspaces List */}
      <section className="space-y-4">
        {loading && workspaces.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <WorkspaceCardSkeleton key={i} />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No workspaces yet"
            description="Create a workspace to start organizing your study folders, lecture notes, and study material."
            primaryAction={{
              label: "Create Workspace",
              icon: Plus,
              onClick: () => setAddDialogOpen(true),
            }}
            secondaryAction={{
              label: "Connect Drive",
              icon: HardDrive,
              onClick: () => setDriveDialogOpen(true),
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Pinned Section */}
            {pinnedWorkspaces.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Pin className="size-3.5 rotate-45 text-amber-500 fill-amber-500" />
                  Pinned Workspaces
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pinnedWorkspaces.map((ws) => (
                    <WorkspaceCard key={ws.id} workspace={ws} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Unpinned Section */}
            {unpinnedWorkspaces.length > 0 ? (
              <div className="space-y-3">
                {pinnedWorkspaces.length > 0 ? (
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Workspaces ({unpinnedWorkspaces.length})
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unpinnedWorkspaces.map((ws) => (
                    <WorkspaceCard key={ws.id} workspace={ws} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Connected Google Drive Sources Section */}
      <div className="border-t border-border/40 pt-6">
        <DriveSourcesPanel />
      </div>

      {/* Modals */}
      <AddWorkspaceDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <AddDriveSourceDialog open={driveDialogOpen} onOpenChange={setDriveDialogOpen} />
    </div>
  );
}
