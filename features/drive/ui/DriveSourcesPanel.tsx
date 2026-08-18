"use client";

import { useState } from "react";
import { AlertCircle, FolderPlus, HardDrive, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriveSources } from "@/hooks/useDriveSources";
import { DriveSourceCard } from "./DriveSourceCard";
import { AddDriveSourceDialog } from "./AddDriveSourceDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DriveSourceCardSkeleton } from "@/components/ui/skeleton-layouts";

export function DriveSourcesPanel() {
  const { sources, loading, error } = useDriveSources();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const totalFiles = sources.reduce((sum, s) => sum + (s.fileCount || 0), 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Google Drive Sources
          </h2>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Loading sources..."
              : `${sources.length} ${sources.length === 1 ? "folder" : "folders"} connected · ${totalFiles} files indexed`}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <FolderPlus className="size-3.5" />
          Add Public Folder
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>Failed to load Google Drive sources from database: {error.message}</span>
        </div>
      ) : loading && sources.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <DriveSourceCardSkeleton key={i} />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No Drive sources connected yet"
          description="Connect a public Google Drive folder to discover and organize study documents into your local library."
          primaryAction={{
            label: "Connect Public Folder",
            icon: Sparkles,
            onClick: () => setIsAddOpen(true),
          }}
          compact
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <DriveSourceCard key={source.id} source={source} />
          ))}
        </div>
      )}

      <AddDriveSourceDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </section>
  );
}
