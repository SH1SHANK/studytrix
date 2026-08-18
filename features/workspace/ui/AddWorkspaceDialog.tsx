"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { FolderPlus, Loader2 } from "lucide-react";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
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
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("indigo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setName("");
    setDescription("");
    setSelectedColor("indigo");
    setIsSubmitting(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const finalName = name.trim();
      if (!finalName) {
        toast.error("Please enter a workspace name.");
        return;
      }

      setIsSubmitting(true);

      try {
        const created = await workspaceRepository.create({
          name: finalName,
          description: description.trim() || null,
          color: selectedColor,
          pinned: false,
          driveFolderId: "",
          category: null,
          itemCount: 0,
        });

        toast.success(`Workspace "${finalName}" created!`);
        onOpenChange(false);
        resetState();
        router.push(`/workspace/${created.id}`);
      } catch (error) {
        toast.error("Failed to create workspace.");
        console.error(error);
        setIsSubmitting(false);
      }
    },
    [description, name, onOpenChange, resetState, router, selectedColor],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderPlus className="size-4" />
            </div>
            Create New Workspace
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create a dedicated study space for your course, subject, or exam preparation.
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
              placeholder="e.g. Machine Learning, GATE 2026, Semester 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="ws-desc-input" className="text-xs font-medium text-muted-foreground">
              Description (Optional)
            </label>
            <Input
              id="ws-desc-input"
              placeholder="e.g. Lecture notes, problem sheets, formula sheets"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
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

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
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
            <Button type="submit" size="sm" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
