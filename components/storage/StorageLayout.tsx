"use client";

import type { ReactNode } from "react";
import { IconDownload, IconRefresh } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StorageLayoutProps {
  children: ReactNode;
  loading: boolean;
  onRefresh: () => void;
  onExportSummary: () => void;
}

export function StorageLayout({
  children,
  loading,
  onRefresh,
  onExportSummary,
}: StorageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh storage data"
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Refreshing" : "Refresh"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onExportSummary}
            aria-label="Export storage summary"
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <IconDownload className="size-3.5" />
            Export
          </Button>
        </div>
      </header>

      {/* ── Content Sections ─────────────────────────────────── */}
      <main aria-live="polite" className="space-y-6">{children}</main>
    </div>
  );
}
