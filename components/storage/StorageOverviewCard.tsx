"use client";

import { IconCircleCheck, IconDatabase, IconFile, IconFolderCog } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeUsagePercent, formatBytes } from "@/features/storage/storage.quota";
import type { StorageStats } from "@/features/storage/storage.types";

interface StorageOverviewCardProps {
  stats: StorageStats | null;
  loading: boolean;
  hasErrors: boolean;
}

export function StorageOverviewCard({
  stats,
  loading,
  hasErrors,
}: StorageOverviewCardProps) {
  const syncStatus = loading ? "Syncing" : hasErrors ? "Issues detected" : "Up to date";
  const quotaPercent = computeUsagePercent(stats?.quotaBytes ?? null, stats?.usageBytes ?? null);

  const cards = [
    {
      id: "files",
      label: "Offline files",
      value: `${stats?.totalFiles ?? 0}`,
      icon: IconFile,
    },
    {
      id: "size",
      label: "Storage used",
      value: formatBytes(stats?.totalBytes ?? 0),
      icon: IconDatabase,
    },
    {
      id: "quota",
      label: "Quota usage",
      value:
        quotaPercent !== null
          ? `${quotaPercent.toFixed(1)}%`
          : "Unavailable",
      icon: IconFolderCog,
    },
    {
      id: "sync",
      label: "Sync status",
      value: syncStatus,
      icon: IconCircleCheck,
    },
  ];

  return (
    <Card className="rounded-2xl border border-stone-200/80 bg-white/90 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/80">
      <CardHeader className="pb-0">
        <CardTitle id="storage-overview-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200/70 bg-stone-50/80 p-3 dark:border-stone-700/70 dark:bg-stone-800/70"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  <Icon className="size-3.5" />
                  {item.label}
                </div>
                <p className="mt-1.5 text-base font-semibold text-stone-900 dark:text-stone-100">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          Quota: {stats?.usageBytes !== null && stats?.usageBytes !== undefined
            ? formatBytes(stats.usageBytes)
            : "Unavailable"}
          {" / "}
          {stats?.quotaBytes !== null && stats?.quotaBytes !== undefined
            ? formatBytes(stats.quotaBytes)
            : "Unavailable"}
        </p>
      </CardContent>
    </Card>
  );
}
