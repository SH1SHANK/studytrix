"use client";

import type { ReactNode } from "react";
import { IconDownload, IconRefresh } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="space-y-6 pb-36">
      <header className="sticky top-0 z-20 bg-background/95 pt-2 pb-3 backdrop-blur">
        <Card className="rounded-2xl border border-stone-200/80 bg-white/90 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/85">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1.5">
              <h1 className="text-[1.9rem] leading-none font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Storage Dashboard
              </h1>
              <p className="text-sm leading-snug text-stone-600 dark:text-stone-300">
                Monitor and manage offline data stored on this device.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRefresh}
                aria-label="Refresh storage data"
                className="h-9 px-4"
              >
                <IconRefresh className="size-3.5" />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onExportSummary}
                aria-label="Export storage summary"
                className="h-9 px-4"
              >
                <IconDownload className="size-3.5" />
                Export Summary
              </Button>
            </div>

            {loading ? (
              <p role="status" className="text-xs text-stone-500 dark:text-stone-400">
                Loading storage data...
              </p>
            ) : null}
          </CardContent>
        </Card>
      </header>

      <main aria-live="polite" className="space-y-6">{children}</main>
    </div>
  );
}
