"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Folder, Pin, MoreVertical, ExternalLink, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DriveWorkspace } from "../workspace.types";
import { useWorkspaceStore } from "../workspace.store";
import { toast } from "sonner";

interface WorkspaceCardProps {
  workspace: DriveWorkspace;
}

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  indigo: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", ring: "hover:border-indigo-500/40" },
  emerald: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", ring: "hover:border-emerald-500/40" },
  amber: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", ring: "hover:border-amber-500/40" },
  sky: { bg: "bg-sky-500/10 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", ring: "hover:border-sky-500/40" },
  rose: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", ring: "hover:border-rose-500/40" },
  violet: { bg: "bg-violet-500/10 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", ring: "hover:border-violet-500/40" },
};

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const togglePin = useWorkspaceStore((state) => state.togglePinWorkspace);
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const colors = useMemo(() => {
    return COLOR_MAP[workspace.color || "indigo"] || COLOR_MAP.indigo;
  }, [workspace.color]);

  const handleDelete = () => {
    deleteWorkspace(workspace.id);
    toast.success(`Removed "${workspace.name}"`);
    setIsDeleteDialogOpen(false);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePin(workspace.id);
  };

  const hasDriveLink = Boolean(workspace.driveFolderId);
  const driveUrl = hasDriveLink ? `https://drive.google.com/drive/folders/${workspace.driveFolderId}` : null;

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-xs",
          colors.ring,
        )}
      >
        <Link href={`/workspace/${workspace.id}`} className="absolute inset-0 z-0 rounded-xl">
          <span className="sr-only">Open {workspace.name}</span>
        </Link>

        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors", colors.bg, colors.text)}>
              <Folder className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {workspace.name}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {workspace.itemCount ? `${workspace.itemCount} items` : "Study Workspace"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleTogglePin}
              className={cn(
                "size-7 rounded text-muted-foreground hover:text-foreground",
                workspace.pinned && "text-amber-500 hover:text-amber-600 dark:text-amber-400",
              )}
              title={workspace.pinned ? "Unpin workspace" : "Pin workspace"}
            >
              <Pin className={cn("size-3.5", workspace.pinned && "fill-current")} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 rounded text-muted-foreground hover:text-foreground"
                    aria-label={`Options for ${workspace.name}`}
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                {driveUrl ? (
                  <DropdownMenuItem
                    onClick={() => window.open(driveUrl, "_blank", "noopener,noreferrer")}
                    className="gap-2 text-xs"
                  >
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                    Open in Drive
                  </DropdownMenuItem>
                ) : null}
                {driveUrl ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Remove Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground">
          <span>{hasDriveLink ? "Google Drive Source" : "Local Workspace"}</span>
          {hasDriveLink ? (
            <span className="font-mono text-[10px] opacity-70">
              ID: {workspace.driveFolderId.slice(0, 6)}...
            </span>
          ) : null}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{workspace.name}&quot; from your local Studytrix library. Any linked Google Drive files remain safe and unmodified on Google Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
