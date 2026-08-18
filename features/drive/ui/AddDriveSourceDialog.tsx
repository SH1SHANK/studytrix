"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Link2,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseDriveFolderUrl } from "@/features/drive/drive-url";
import { driveScanner } from "@/features/drive/drive-scanner";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import type { DriveResolveResponse } from "@/features/workspace/workspace.types";

interface AddDriveSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDriveSourceDialog({ open, onOpenChange }: AddDriveSourceDialogProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [name, setName] = useState("");
  const [resolvedFolderId, setResolvedFolderId] = useState<string | null>(null);
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvedSuccess, setResolvedSuccess] = useState(false);

  const resetState = useCallback(() => {
    setInputUrl("");
    setName("");
    setResolvedFolderId(null);
    setNormalizedUrl(null);
    setIsResolving(false);
    setResolveError(null);
    setResolvedSuccess(false);
  }, []);

  const handleInspect = useCallback(async () => {
    const parsed = parseDriveFolderUrl(inputUrl);
    if (!parsed) {
      setResolveError("Please enter a valid Google Drive folder link or ID.");
      return;
    }

    setIsResolving(true);
    setResolveError(null);
    setResolvedSuccess(false);

    try {
      const response = await fetch("/api/drive/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsed.folderId }),
      });

      const data = (await response.json()) as DriveResolveResponse;

      if (!response.ok || !data.accessible) {
        setResolveError(
          data.error || "Could not access this Google Drive folder. Ensure link sharing is set to 'Anyone with the link can view'.",
        );
        setResolvedFolderId(null);
      } else {
        setResolvedFolderId(data.folderId);
        setNormalizedUrl(parsed.normalizedUrl);
        setName(data.name || "Drive Folder");
        setResolvedSuccess(true);
        toast.success("Public Google Drive folder verified!");
      }
    } catch {
      setResolveError("Network error while connecting to Google Drive.");
    } finally {
      setIsResolving(false);
    }
  }, [inputUrl]);

  const handleSave = useCallback(async () => {
    if (!resolvedFolderId || !normalizedUrl) {
      toast.error("Please inspect and verify the Google Drive folder first.");
      return;
    }

    try {
      const source = await driveSourceRepository.addSource({
        folderId: resolvedFolderId,
        url: normalizedUrl,
        name: name.trim() || "Drive Folder",
      });

      toast.success(`Source "${source.name}" added! Starting file scan...`);
      onOpenChange(false);
      resetState();

      // Trigger background crawl
      void driveScanner.scanSource(source.id);
    } catch (error) {
      toast.error("Failed to save Google Drive source.");
      console.error(error);
    }
  }, [name, normalizedUrl, onOpenChange, resetState, resolvedFolderId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderPlus className="size-4" />
            </div>
            Add Public Google Drive Folder
          </DialogTitle>
          <DialogDescription>
            Connect any publicly shared Google Drive folder. Studytrix will discover, index, and organize its files locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drive Link Input */}
          <div className="space-y-2">
            <label htmlFor="drive-source-url-input" className="text-xs font-medium text-muted-foreground">
              Google Drive Public Link or Folder ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="drive-source-url-input"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setResolveError(null);
                    setResolvedSuccess(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleInspect();
                    }
                  }}
                  className="pl-9 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleInspect()}
                disabled={isResolving || !inputUrl.trim()}
                className="shrink-0 text-xs font-medium"
              >
                {isResolving ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-3.5" />
                )}
                Inspect
              </Button>
            </div>

            {resolveError ? (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{resolveError}</span>
              </div>
            ) : null}

            {resolvedSuccess ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Folder verified and publicly accessible!</span>
              </div>
            ) : null}
          </div>

          {/* Source Name */}
          <div className="space-y-1.5">
            <label htmlFor="drive-source-name-input" className="text-xs font-medium text-muted-foreground">
              Source Display Name
            </label>
            <Input
              id="drive-source-name-input"
              placeholder="e.g. Operating Systems Notes, GATE CS Materials"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!resolvedFolderId || !name.trim()}
          >
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
