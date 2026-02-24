"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "Never";
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) {
    return "just now";
  }

  if (mins < 60) {
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "~0 B";
  }

  const kb = 1024;
  const mb = kb * kb;

  if (value < kb) {
    return `~${Math.round(value)} B`;
  }

  if (value < mb) {
    return `~${(value / kb).toFixed(1)} KB`;
  }

  return `~${(value / mb).toFixed(1)} MB`;
}

type IndexStatsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebuildIndex: () => void;
  onClearIndex: () => void;
};

export function IndexStatsSheet({
  open,
  onOpenChange,
  onRebuildIndex,
  onClearIndex,
}: IndexStatsSheetProps) {
  const indexSize = useIntelligenceStore((state) => state.indexSize);
  const indexGlobalCount = useIntelligenceStore((state) => state.indexGlobalCount);
  const indexPersonalCount = useIntelligenceStore((state) => state.indexPersonalCount);
  const indexFolderCount = useIntelligenceStore((state) => state.indexFolderCount);
  const indexLastCompletedAt = useIntelligenceStore((state) => state.indexLastCompletedAt);
  const getIndexSizeBytes = useIntelligenceStore((state) => state.getIndexSizeBytes);

  const [sizeBytes, setSizeBytes] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void getIndexSizeBytes().then((value) => {
      if (!cancelled) {
        setSizeBytes(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [getIndexSizeBytes, indexSize, open]);

  const rows = useMemo(
    () => [
      { label: "Total files indexed", value: String(indexSize) },
      { label: "Global Repository", value: String(indexGlobalCount) },
      { label: "Personal Repository", value: String(indexPersonalCount) },
      { label: "Folders indexed", value: String(indexFolderCount) },
      { label: "Last full index", value: formatRelativeTime(indexLastCompletedAt) },
      { label: "Index size", value: formatBytes(sizeBytes) },
    ],
    [indexFolderCount, indexGlobalCount, indexLastCompletedAt, indexPersonalCount, indexSize, sizeBytes],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Search Index</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-1 px-4 pb-4 pt-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pb-5">
          <Button type="button" variant="outline" onClick={onRebuildIndex}>
            Rebuild Index
          </Button>
          <Button type="button" variant="destructive" onClick={onClearIndex}>
            Clear Index
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
