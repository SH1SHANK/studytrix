"use client";

import { useEffect, useMemo, useState } from "react";
import { Reorder } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";

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
import type { StudySet } from "@/features/custom-folders/study-sets.store";

type StudySetFile = {
  id: string;
  name: string;
  sourceLabel: string;
};

type StudySetDetailViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setItem: StudySet | null;
  filesById: Map<string, StudySetFile>;
  allPersonalFiles: StudySetFile[];
  onReorderFiles: (setId: string, fileIds: string[]) => void;
  onRemoveFile: (setId: string, fileId: string) => void;
  onAddFiles: (setId: string, fileIds: string[]) => void;
  onRenameSet: (setId: string, name: string) => void;
  onDeleteSet: (setId: string) => void;
};

export function StudySetDetailView({
  open,
  onOpenChange,
  setItem,
  filesById,
  allPersonalFiles,
  onReorderFiles,
  onRemoveFile,
  onAddFiles,
  onRenameSet,
  onDeleteSet,
}: StudySetDetailViewProps) {
  const [draftName, setDraftName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  useEffect(() => {
    if (!setItem) {
      setDraftName("");
      setSelectedFileIds([]);
      return;
    }

    setDraftName(setItem.name);
    setSelectedFileIds([...setItem.fileIds]);
  }, [setItem]);

  const orderedVisibleFileIds = useMemo(() => {
    if (!setItem) {
      return [] as string[];
    }

    return setItem.fileIds.filter((fileId) => filesById.has(fileId));
  }, [filesById, setItem]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 h-dvh w-screen max-w-none rounded-none border-0 p-0">
        <div className="flex h-full flex-col bg-background">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle>{setItem?.name ?? "Study Set"}</DialogTitle>
            <DialogDescription>{orderedVisibleFileIds.length} files</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-3 space-y-2 rounded-xl border border-border bg-card p-3">
              <label htmlFor="study-set-name" className="text-xs font-medium text-muted-foreground">
                Set Name
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="study-set-name"
                  value={draftName}
                  maxLength={40}
                  onChange={(event) => setDraftName(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!setItem) {
                      return;
                    }
                    onRenameSet(setItem.id, draftName);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
                <Plus className="size-3.5" />
                Add Files
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (!setItem) {
                    return;
                  }
                  onDeleteSet(setItem.id);
                  onOpenChange(false);
                }}
              >
                Delete Set
              </Button>
            </div>

            {setItem && orderedVisibleFileIds.length > 0 ? (
              <Reorder.Group
                axis="y"
                values={orderedVisibleFileIds}
                onReorder={(ids) => onReorderFiles(setItem.id, ids)}
                className="space-y-2"
              >
                {orderedVisibleFileIds.map((fileId) => {
                  const file = filesById.get(fileId);
                  if (!file) {
                    return null;
                  }

                  return (
                    <Reorder.Item key={file.id} value={file.id} className="list-none">
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{file.sourceLabel}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => onRemoveFile(setItem.id, file.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            ) : (
              <p className="text-sm text-muted-foreground">No files in this set yet.</p>
            )}
          </div>
        </div>

        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Files</DialogTitle>
              <DialogDescription>Select files from your Personal Repository.</DialogDescription>
            </DialogHeader>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {allPersonalFiles.map((file) => {
                const checked = selectedFileIds.includes(file.id);
                return (
                  <label key={file.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const isChecked = event.target.checked;
                        setSelectedFileIds((current) => {
                          if (isChecked) {
                            if (current.includes(file.id)) {
                              return current;
                            }
                            return [...current, file.id];
                          }
                          return current.filter((id) => id !== file.id);
                        });
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{file.sourceLabel}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!setItem) {
                    return;
                  }

                  const existing = new Set(setItem.fileIds);
                  const toAdd = selectedFileIds.filter((fileId) => !existing.has(fileId));
                  if (toAdd.length > 0) {
                    onAddFiles(setItem.id, toAdd);
                  }
                  setPickerOpen(false);
                }}
              >
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
