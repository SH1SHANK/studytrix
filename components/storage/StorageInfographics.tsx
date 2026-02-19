"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfflineRecord } from "@/features/storage/storage.types";

interface StorageInfographicsProps {
  records: OfflineRecord[];
}

type Segment = {
  id: string;
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
  textClass: string;
};

function buildSegments(counts: Array<{ id: string; label: string; count: number; colorClass: string; textClass: string }>): Segment[] {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return counts.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.count / total) * 100 : 0,
  }));
}

export function StorageInfographics({ records }: StorageInfographicsProps) {
  const { sourceSegments, healthSegments } = useMemo(() => {
    const manualCount = records.filter((record) => record.source === "manual").length;
    const prefetchCount = records.length - manualCount;

    const completeCount = records.filter((record) => record.status === "complete").length;
    const partialCount = records.filter((record) => record.status === "partial").length;
    const corruptedCount = records.filter((record) => record.status === "corrupted").length;
    const errorCount = records.filter((record) => record.status === "error").length;

    return {
      sourceSegments: buildSegments([
        {
          id: "manual",
          label: "Manual",
          count: manualCount,
          colorClass: "bg-indigo-500",
          textClass: "text-indigo-700 dark:text-indigo-300",
        },
        {
          id: "prefetch",
          label: "Prefetch",
          count: prefetchCount,
          colorClass: "bg-cyan-500",
          textClass: "text-cyan-700 dark:text-cyan-300",
        },
      ]),
      healthSegments: buildSegments([
        {
          id: "complete",
          label: "Complete",
          count: completeCount,
          colorClass: "bg-emerald-500",
          textClass: "text-emerald-700 dark:text-emerald-300",
        },
        {
          id: "partial",
          label: "Partial",
          count: partialCount,
          colorClass: "bg-amber-500",
          textClass: "text-amber-700 dark:text-amber-300",
        },
        {
          id: "corrupted",
          label: "Corrupted",
          count: corruptedCount,
          colorClass: "bg-rose-500",
          textClass: "text-rose-700 dark:text-rose-300",
        },
        {
          id: "error",
          label: "Error",
          count: errorCount,
          colorClass: "bg-stone-500",
          textClass: "text-stone-700 dark:text-stone-300",
        },
      ]),
    };
  }, [records]);

  return (
    <Card className="rounded-2xl border border-stone-200/80 bg-white/90 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/80">
      <CardHeader className="pb-0">
        <CardTitle id="storage-infographics-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Storage Infographics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <section className="space-y-2" aria-label="Storage source split">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Source Split
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-700/80">
            {sourceSegments.map((segment) => (
              <span
                key={segment.id}
                className={segment.colorClass}
                style={{ width: `${segment.percentage.toFixed(1)}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {sourceSegments.map((segment) => (
              <li
                key={`source-${segment.id}`}
                className="rounded-lg border border-stone-200/70 bg-stone-50/80 px-2.5 py-2 text-xs dark:border-stone-700/70 dark:bg-stone-800/70"
              >
                <p className={segment.textClass}>{segment.label}</p>
                <p className="mt-0.5 font-medium text-stone-700 dark:text-stone-200">
                  {segment.count} ({segment.percentage.toFixed(1)}%)
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2" aria-label="Storage health breakdown">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Health Breakdown
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-700/80">
            {healthSegments.map((segment) => (
              <span
                key={segment.id}
                className={segment.colorClass}
                style={{ width: `${segment.percentage.toFixed(1)}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {healthSegments.map((segment) => (
              <li
                key={`health-${segment.id}`}
                className="rounded-lg border border-stone-200/70 bg-stone-50/80 px-2.5 py-2 text-xs dark:border-stone-700/70 dark:bg-stone-800/70"
              >
                <p className={segment.textClass}>{segment.label}</p>
                <p className="mt-0.5 font-medium text-stone-700 dark:text-stone-200">
                  {segment.count} ({segment.percentage.toFixed(1)}%)
                </p>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
