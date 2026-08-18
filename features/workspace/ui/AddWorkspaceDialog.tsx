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
import {
  FolderPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  Sparkles,
} from "lucide-react";
import { useWorkspaceStore } from "../workspace.store";
import type { DriveResolveResponse } from "../workspace.types";
import { cn } from "@/lib/utils";

interface AddWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_SWATCHES = [
  { id: "indigo", bg: "bg-indigo-500", ring: "ring-indigo-500/40" },
  { id: "emerald", bg: "bg-emerald-500", ring: "ring-emerald-500/40" },
  { id: "amber", bg: "bg-amber-500", ring: "ring-amber-500/40" },
  { id: "sky", bg: "bg-sky-500", ring: "ring-sky-500/40" },
  { id: "rose", bg: "bg-rose-500", ring: "ring-rose-500/40" },
  { id: "violet", bg: "bg-violet-500", ring: "ring-violet-500/40" },
];

export function AddWorkspaceDialog({ open, onOpenChange }: AddWorkspaceDialogProps) {
  const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);

  const [inputUrl, setInputUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("indigo");
  const [pinned, setPinned] = useState(false);

  const [resolvedFolderId, setResolvedFolderId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvedSuccess, setResolvedSuccess] = useState(false);

  const resetState = useCallback(() => {
    setInputUrl("");
    setName("");
    setDescription("");
    setSelectedColor("indigo");
    setPinned(false);
    setResolvedFolderId(null);
    setIsResolving(false);
    setResolveError(null);
    setResolvedSuccess(false);
  }, []);

  const handleResolveLink = useCallback(async () => {
    if (!inputUrl.trim()) {
      setResolveError("Please paste a Google Drive link or Folder ID.");
      return;
    }

    setIsResolving(true);
    setResolveError(null);
    setResolvedSuccess(false);

    try {
      const response = await fetch("/api/drive/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputUrl }),
      });

      const data = (await response.json()) as DriveResolveResponse;

      if (!response.ok || !data.accessible) {
        setResolveError(data.error || "Could not access this Google Drive folder. Ensure link sharing is public.");
        setResolvedFolderId(null);
      } else {
        setResolvedFolderId(data.folderId);
        if (!name.trim()) {
          setName(data.name || "Drive Workspace");
        }
        setResolvedSuccess(true);
        toast.success("Folder connected successfully!");
      }
    } catch {
      setResolveError("Failed to connect to Google Drive. Check internet connection.");
    } finally {
      setIsResolving(false);
    }
  }, [inputUrl, name]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const finalName = name.trim();
      if (!finalName) {
        toast.error("Please enter a workspace name.");
        return;
      }

      try {
        await addWorkspace({
          driveFolderId: resolvedFolderId || "",
          name: finalName,
          description: description.trim() || null,
          color: selectedColor,
          pinned,
        });

        toast.success(`Workspace "${finalName}" created!`);
        onOpenChange(false);
        resetState();
      } catch (error) {
        toast.error("Failed to create workspace.");
        console.error(error);
      }
    },
    [addWorkspace, description, name, onOpenChange, pinned, resetState, resolvedFolderId, selectedColor],
  );

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
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderPlus className="size-4" />
            </div>
            Create Study Workspace
          </DialogTitle>
          <DialogDescription className="text-xs">
            A workspace organizes your folders, study notes, formula sheets, and study materials in one place.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Workspace Name */}
          <div className="space-y-1.5">
            <label htmlFor="ws-name-input" className="text-xs font-medium text-muted-foreground">
              Workspace Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="ws-name-input"
              placeholder="e.g. GATE Preparation, Machine Learning, Semester 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
              autoFocus
              required
            />
          </div>

          {/* Color Accent Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Color Accent</label>
            <div className="flex items-center gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => setSelectedColor(swatch.id)}
                  className={cn(
                    "size-6 rounded-full transition-all flex items-center justify-center",
                    swatch.bg,
                    selectedColor === swatch.id
                      ? cn("ring-2 ring-offset-2 ring-offset-background", swatch.ring)
                      : "opacity-70 hover:opacity-100",
                  )}
                  aria-label={`Select ${swatch.id} color`}
                />
              ))}
            </div>
          </div>

          {/* Optional Google Drive Source Link */}
          <div className="space-y-2 border-t border-border/40 pt-3">
            <div className="flex items-center justify-between">
              <label htmlFor="ws-drive-url" className="text-xs font-medium text-muted-foreground">
                Optional Google Drive Folder Link
              </label>
              <span className="text-[11px] text-muted-foreground/60">Public link</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ws-drive-url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setResolveError(null);
                    setResolvedSuccess(false);
                  }}
                  className="pl-8 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleResolveLink()}
                disabled={isResolving || !inputUrl.trim()}
                className="shrink-0 text-xs h-8"
              >
                {isResolving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span className="ml-1">Connect</span>
              </Button>
            </div>

            {resolveError ? (
              <div
                role="alert"
                className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{resolveError}</span>
              </div>
            ) : null}

            {resolvedSuccess ? (
              <div
                role="status"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>Drive folder connected and verified!</span>
              </div>
            ) : null}
          </div>

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
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
