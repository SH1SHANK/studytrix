"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HardDrive, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { driveScanner } from "@/features/drive/drive-scanner";
import type { DriveResolveResponse } from "@/features/workspace/workspace.types";

interface ConnectDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName?: string;
}

export function ConnectDriveDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: ConnectDriveDialogProps) {
  const [url, setUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setUrl("");
    setCustomName("");
    setIsConnecting(false);
    setError(null);
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please paste a Google Drive folder link or folder ID.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 1. Resolve folder via backend API
      const res = await fetch("/api/drive/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmedUrl }),
      });

      const data = (await res.json()) as DriveResolveResponse;

      if (!res.ok || !data.accessible || !data.folderId) {
        setError(
          data.error ||
            "Could not access this Google Drive folder. Please verify the link is public (Anyone with link).",
        );
        setIsConnecting(false);
        return;
      }

      const sourceName = customName.trim() || data.name || "Drive Material";

      // 2. Register in RxDB drive_sources with workspaceId association
      await driveSourceRepository.addSource({
        folderId: data.folderId,
        url: trimmedUrl,
        name: sourceName,
        workspaceId: workspaceId.trim(),
      });

      // 3. Trigger background indexing
      void driveScanner.scanSource(data.folderId).catch((scanErr) => {
        console.warn("[ConnectDriveDialog] Initial scan error:", scanErr);
      });

      toast.success(`Connected "${sourceName}" to ${workspaceName || "workspace"}! Scanning files...`);
      onOpenChange(false);
      resetState();
    } catch (err) {
      console.error("[ConnectDriveDialog] Connection error:", err);
      setError("Failed to connect to Google Drive. Check internet connection.");
    } finally {
      setIsConnecting(false);
    }
  };

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
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <HardDrive className="size-4" />
            </div>
            Connect Google Drive Folder
          </DialogTitle>
          <DialogDescription className="text-xs">
            Connect a public Google Drive folder to index lecture notes, assignments, and study materials into this workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConnect} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="drive-folder-url" className="text-xs font-medium text-muted-foreground">
              Google Drive Folder Link <span className="text-destructive">*</span>
            </label>
            <Input
              id="drive-folder-url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              autoFocus
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="drive-folder-name" className="text-xs font-medium text-muted-foreground">
              Custom Label (Optional)
            </label>
            <Input
              id="drive-folder-name"
              placeholder="e.g. Official Course Slides, Reference Books"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="text-xs"
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isConnecting || !url.trim()}>
              {isConnecting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Connecting...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 mr-1.5" />
                  Connect Material
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
