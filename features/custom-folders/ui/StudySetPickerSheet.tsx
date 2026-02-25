"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { useStudySetsStore } from "@/features/custom-folders/study-sets.store";

export function StudySetPickerSheet() {
  const fileId = useStudySetsStore((state) => state.pickerFileId);
  const closePicker = useStudySetsStore((state) => state.closePicker);
  const sets = useStudySetsStore((state) => state.sets);
  const createSet = useStudySetsStore((state) => state.createSet);
  const addFileToSet = useStudySetsStore((state) => state.addFileToSet);
  const [newSetName, setNewSetName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  return (
    <Dialog
      open={fileId !== null}
      onOpenChange={(open) => {
        if (!open) {
          closePicker();
          setIsCreating(false);
          setNewSetName("");
        }
      }}
    >
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto w-full max-w-none rounded-t-3xl border-t p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle>Add to Study Set</DialogTitle>
            <DialogDescription>Choose a set or create a new one.</DialogDescription>
          </DialogHeader>

          {isCreating ? (
            <div className="mt-4 space-y-3">
              <Input
                value={newSetName}
                maxLength={40}
                onChange={(event) => setNewSetName(event.target.value)}
                placeholder="Study set name"
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!fileId) {
                      return;
                    }
                    const setId = createSet(newSetName);
                    addFileToSet(setId, fileId);
                    toast.success("Added to Study Set");
                    closePicker();
                    setIsCreating(false);
                    setNewSetName("");
                  }}
                >
                  Create
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sets.map((setItem) => (
                <button
                  key={setItem.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left"
                  onClick={() => {
                    if (!fileId) {
                      return;
                    }
                    addFileToSet(setItem.id, fileId);
                    toast.success(`Added to ${setItem.name}`);
                    closePicker();
                  }}
                >
                  <span className="text-sm font-medium text-foreground">{setItem.name}</span>
                  <span className="text-xs text-muted-foreground">{setItem.fileIds.length} files</span>
                </button>
              ))}

              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-sm font-medium text-foreground"
                onClick={() => setIsCreating(true)}
              >
                + New Set
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
