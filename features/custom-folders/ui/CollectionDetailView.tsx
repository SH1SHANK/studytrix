"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SmartCollection } from "@/features/custom-folders/smart-collections.types";

type CollectionDetailFile = {
  id: string;
  name: string;
  sourceLabel: string;
};

type CollectionDetailViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: SmartCollection | null;
  files: CollectionDetailFile[];
};

export function CollectionDetailView({
  open,
  onOpenChange,
  collection,
  files,
}: CollectionDetailViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0">
        <div className="flex h-full flex-col bg-background">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle>{collection?.name ?? "Collection"}</DialogTitle>
            <DialogDescription>{files.length} files</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files available in this collection.</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{file.sourceLabel}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
