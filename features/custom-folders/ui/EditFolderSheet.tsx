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
import { Switch } from "@/components/ui/switch";
import type { CustomFolder } from "@/features/custom-folders/custom-folders.types";
import { ColourSwatchPicker } from "./ColourSwatchPicker";

type EditFolderSheetProps = {
  open: boolean;
  folder: CustomFolder | null;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: { label: string; colour: string; pinnedToTop: boolean }) => void;
};

export function EditFolderSheet({
  open,
  folder,
  onOpenChange,
  onSave,
}: EditFolderSheetProps) {
  const [label, setLabel] = useState("");
  const [colour, setColour] = useState("hsl(var(--primary))");
  const [pinnedToTop, setPinnedToTop] = useState(false);

  useEffect(() => {
    if (!folder) {
      return;
    }
    setLabel(folder.label);
    setColour(folder.colour);
    setPinnedToTop(folder.pinnedToTop);
  }, [folder]);

  const labelCount = label.trim().length;
  const canSave = labelCount > 0 && labelCount <= 40;
  const title = useMemo(
    () => folder?.label || "Folder",
    [folder?.label],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:p-0">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
        <div className="overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <DialogHeader className="space-y-1">
            <DialogTitle>Edit Personal Folder</DialogTitle>
            <DialogDescription>Update label, colour, and pin preferences for {title}.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-folder-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">
                Label
              </label>
              <Input
                id="edit-folder-label"
                value={label}
                maxLength={40}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Folder label"
              />
              {labelCount >= 30 ? (
                <p className="text-[11px] text-muted-foreground">{labelCount} / 40</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Colour</p>
              <ColourSwatchPicker value={colour} onChange={setColour} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Pin to Top</p>
                <p className="text-xs text-muted-foreground">Pinned folders always appear before unpinned folders.</p>
              </div>
              <Switch checked={pinnedToTop} onCheckedChange={setPinnedToTop} />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => {
                if (!canSave) {
                  return;
                }
                onSave({
                  label: label.trim(),
                  colour,
                  pinnedToTop,
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
