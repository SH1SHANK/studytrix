"use client";

import { useEffect, useState } from "react";
import { IconRobotFace } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useShareStore } from "@/features/share/share.store";

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function ShareProgressDrawer() {
  const { isOpen, fileName, progress, loadedBytes, totalBytes, closeDrawer } =
    useShareStore();

  return (
    <Dialog open={isOpen} onOpenChange={closeDrawer}>
      {/* 
        We use an interactive dialog here, but effectively hide the close 
        button and prevent outside interaction while it's preparing to share.
      */}
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-sm rounded-[24px] border border-stone-200 p-6 shadow-2xl dark:border-stone-800"
      >
        <DialogHeader className="mb-4">
          <DialogTitle className="text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Preparing to Share
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-500/20 dark:text-violet-300">
            {/* Pulsing ring behind the icon */}
            <div className="absolute inset-0 animate-ping rounded-2xl bg-violet-400 opacity-20 dark:bg-violet-500 dark:opacity-30" />
            <IconRobotFace className="relative z-10 size-8" />
          </div>

          <div className="w-full space-y-2 text-center">
            <p className="line-clamp-1 truncate text-sm font-medium text-stone-700 dark:text-stone-300">
              {fileName}
            </p>
            <div className="flex items-center justify-between text-xs font-medium text-stone-500 dark:text-stone-400">
              <span className="tabular-nums">{formatBytes(loadedBytes)}</span>
              {totalBytes ? (
                <span>of {formatBytes(totalBytes)}</span>
              ) : (
                <span className="animate-pulse">Loading...</span>
              )}
            </div>
            
            <Progress
              value={progress}
              className="h-2 w-full animate-in fade-in zoom-in-95"
            />
            {progress >= 100 && (
              <p className="animate-in fade-in slide-in-from-bottom-2 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Opening Share Sheet...
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
