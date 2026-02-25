"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PERSONAL_REPOSITORY_SWATCHES } from "@/features/custom-folders/custom-folders.constants";

type ParentOption = {
  id: string;
  label: string;
};

type CreateFolderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOptions: ParentOption[];
  defaultParentId?: string | null;
  onCreate: (input: {
    name: string;
    colour: string;
    parentFolderId: string | null;
  }) => void;
};

function validateFolderName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Folder name is required.";
  }
  if (trimmed.length > 60) {
    return "Folder name must be 60 characters or less.";
  }
  if (/[\\/]/.test(trimmed)) {
    return "Folder name cannot include / or \\.";
  }
  return null;
}

export function CreateFolderSheet({
  open,
  onOpenChange,
  parentOptions,
  defaultParentId = null,
  onCreate,
}: CreateFolderSheetProps) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(PERSONAL_REPOSITORY_SWATCHES[0]?.value ?? "hsl(var(--primary))");
  const [parentFolderId, setParentFolderId] = useState<string>(defaultParentId ?? "root");

  const error = useMemo(() => validateFolderName(name), [name]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setParentFolderId(defaultParentId ?? "root");
  }, [defaultParentId, open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setName("");
          setParentFolderId(defaultParentId ?? "root");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-border/70 p-0 sm:inset-auto sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>Create a personal folder and place it in your chosen parent.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Folder name" autoFocus />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Colour</p>
              <div className="flex items-center gap-2">
                {PERSONAL_REPOSITORY_SWATCHES.slice(0, 6).map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    className={`h-7 w-7 rounded-full border ${colour === swatch.value ? "border-foreground" : "border-border"}`}
                    style={{ background: swatch.value }}
                    onClick={() => setColour(swatch.value)}
                    aria-label={swatch.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Parent folder</p>
              <select
                value={parentFolderId}
                onChange={(event) => setParentFolderId(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="root">Personal Repository root</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={Boolean(error)}
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed || error) {
                  return;
                }
                onCreate({
                  name: trimmed,
                  colour,
                  parentFolderId: parentFolderId === "root" ? null : parentFolderId,
                });
                onOpenChange(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
