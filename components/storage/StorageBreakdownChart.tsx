"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/features/storage/storage.quota";
import type { MimeBreakdown } from "@/features/storage/storage.types";

interface StorageBreakdownChartProps {
  breakdown: MimeBreakdown[];
}

const MIME_COLORS = [
  "var(--primary)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function StorageBreakdownChart({ breakdown }: StorageBreakdownChartProps) {
  const { slices, totalBytes, gradient } = useMemo(() => {
    const sorted = [...breakdown].sort((left, right) => right.bytes - left.bytes);
    const top = sorted.slice(0, 5);
    const other = sorted.slice(5);
    const otherBytes = other.reduce((sum, entry) => sum + entry.bytes, 0);
    const otherCount = other.reduce((sum, entry) => sum + entry.count, 0);

    const merged =
      other.length > 0
        ? [...top, { mime: "Other", bytes: otherBytes, count: otherCount }]
        : top;

    const bytes = merged.reduce((sum, entry) => sum + entry.bytes, 0);

    const withColor = merged.reduce<Array<MimeBreakdown & {
      percentage: number;
      color: string;
      start: number;
      end: number;
    }>>((accumulator, entry, index) => {
      const previousEnd = accumulator.length > 0 ? accumulator[accumulator.length - 1].end : 0;
      const percentage = bytes > 0 ? (entry.bytes / bytes) * 100 : 0;
      const end = previousEnd + percentage;

      accumulator.push({
        ...entry,
        percentage,
        color: MIME_COLORS[index % MIME_COLORS.length],
        start: previousEnd,
        end,
      });

      return accumulator;
    }, []);

    const conic =
      withColor.length === 0
        ? ""
        : `conic-gradient(${withColor
            .map((entry) => `${entry.color} ${entry.start}% ${entry.end}%`)
            .join(", ")})`;

    return {
      slices: withColor,
      totalBytes: bytes,
      gradient: conic,
    };
  }, [breakdown]);

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle id="storage-breakdown-title" className="text-base font-semibold text-foreground">
          MIME Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {slices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No offline files yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
            <div className="relative mx-auto h-36 w-36">
              <div
                className="h-full w-full rounded-full border border-border/80"
                style={{ background: gradient }}
                aria-hidden="true"
              />
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card/95 text-center">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatBytes(totalBytes)}
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {slices.map((entry) => (
                <li key={entry.mime} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground/90">{entry.mime}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.count} files · {formatBytes(entry.bytes)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border/80">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${entry.percentage.toFixed(1)}%`,
                        backgroundColor: entry.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
