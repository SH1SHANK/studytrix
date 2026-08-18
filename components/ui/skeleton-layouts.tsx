"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 h-36 relative overflow-hidden",
        className,
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted" />

      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
        <Skeleton className="size-5 rounded-full" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>
    </div>
  );
}

export function FileRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-between gap-3 p-3 border-b border-border/40 last:border-b-0",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-3.5 w-2/5 rounded-md" />
          <Skeleton className="h-2.5 w-1/3 rounded-md" />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
        <Skeleton className="size-7 rounded-md" />
      </div>
    </div>
  );
}

export function FolderRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-card/60",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 flex-1">
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="h-3.5 w-1/3 rounded-md" />
      </div>
      <Skeleton className="size-4 rounded-md" />
    </div>
  );
}

export function DriveSourceCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-2.5 w-2/3 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
      </div>
    </div>
  );
}
