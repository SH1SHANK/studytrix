"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  FolderSync,
  HardDrive,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { driveScanner } from "@/features/drive/drive-scanner";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import type { DriveSourceDocType } from "@/db/types";

interface DriveSourceCardProps {
  source: DriveSourceDocType;
}

export function DriveSourceCard({ source }: DriveSourceCardProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = async () => {
    setIsScanning(true);
    toast.info(`Scanning "${source.name}"...`);
    try {
      await driveScanner.scanSource(source.id);
      toast.success(`Scan complete for "${source.name}"`);
    } catch {
      toast.error(`Failed to scan "${source.name}"`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await driveSourceRepository.removeSource(source.id);
      toast.success(`Removed "${source.name}"`);
      setIsDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to remove source");
    } finally {
      setIsDeleting(false);
    }
  };

  const isScanActive = isScanning || source.status === "scanning";

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HardDrive className="size-5" />
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-sm font-semibold tracking-tight text-foreground">
                {source.name}
              </h4>
              <p className="truncate text-xs text-muted-foreground">
                {source.fileCount} {source.fileCount === 1 ? "file" : "files"} indexed
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Options for ${source.name}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => void handleRefresh()} disabled={isScanActive}>
                <RefreshCw className="mr-2 size-3.5" />
                Scan Now
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${source.name} in Google Drive`}
                  >
                    <ExternalLink className="mr-2 size-3.5" />
                    Open Drive
                  </a>
                }
              />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-3.5" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
          <div className="flex items-center gap-1.5" aria-live="polite">
            {source.status === "ready" && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Ready
              </span>
            )}
            {source.status === "scanning" && (
              <span className="flex items-center gap-1 text-primary">
                <Loader2 className="size-3.5 animate-spin" />
                Scanning...
              </span>
            )}
            {source.status === "error" && (
              <span className="flex items-center gap-1 text-destructive" title={source.errorMessage || undefined}>
                <AlertCircle className="size-3.5" />
                Scan error
              </span>
            )}
            {source.status === "unavailable" && (
              <span className="flex items-center gap-1 text-amber-500" title={source.errorMessage || undefined}>
                <AlertCircle className="size-3.5" />
                Unavailable
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => void handleRefresh()}
            disabled={isScanActive}
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {isScanActive ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <FolderSync className="size-3" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog on Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Google Drive Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{source.name}&quot; and its locally indexed file metadata from Studytrix.
              Your files on Google Drive will not be modified or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? "Removing..." : "Remove Source"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
