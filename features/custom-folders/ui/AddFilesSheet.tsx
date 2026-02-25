"use client";

import { useRef, useState } from "react";
import { Camera, FolderOpen, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AddFilesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFiles: (files: File[]) => Promise<void> | void;
  onOpenQuickCapture: () => void;
};

const MAX_FILES = 10;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddFilesSheet({
  open,
  onOpenChange,
  onUploadFiles,
  onOpenQuickCapture,
}: AddFilesSheetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedFiles([]);
          setError(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-border/70 p-0 sm:inset-auto sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle>Add Files</DialogTitle>
            <DialogDescription>Add files from your device or open quick capture.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <FolderOpen className="size-4" />
              From Device
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onOpenQuickCapture();
              }}
            >
              <Camera className="size-4" />
              Take Photo / Record
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > MAX_FILES) {
                setError("Select up to 10 files at a time.");
                return;
              }

              const tooLarge = files.find((file) => file.size > MAX_FILE_BYTES);
              if (tooLarge) {
                setError(`${tooLarge.name} is too large (max 100MB).`);
                return;
              }

              setError(null);
              setSelectedFiles(files);
            }}
          />

          {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

          {selectedFiles.length > 0 ? (
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-2">
              {selectedFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  </span>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      setSelectedFiles((current) => current.filter((entry) => entry !== file));
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={selectedFiles.length === 0 || isUploading}
              onClick={() => {
                setIsUploading(true);
                Promise.resolve(onUploadFiles(selectedFiles))
                  .finally(() => {
                    setIsUploading(false);
                    onOpenChange(false);
                  });
              }}
            >
              Upload {selectedFiles.length > 0 ? selectedFiles.length : ""} files
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
