"use client";

import { IconHeartbeat } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IntegrityStatusCardProps {
  corruptedCount: number;
  partialCount: number;
  loading: boolean;
  onRevalidateCorrupted: () => Promise<void>;
}

export function IntegrityStatusCard({
  corruptedCount,
  partialCount,
  loading,
  onRevalidateCorrupted,
}: IntegrityStatusCardProps) {
  const issueTotal = corruptedCount + partialCount;
  const corruptedPercent = issueTotal > 0 ? (corruptedCount / issueTotal) * 100 : 0;
  const partialPercent = issueTotal > 0 ? (partialCount / issueTotal) * 100 : 0;

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle id="integrity-status-title" className="text-base font-semibold text-foreground">
          Integrity Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 p-3 dark:border-rose-900/70 dark:bg-rose-950/30">
            <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Corrupted</p>
            <p className="mt-1 text-lg font-semibold text-rose-700 dark:text-rose-300">{corruptedCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-900/70 dark:bg-amber-950/30">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Partial</p>
            <p className="mt-1 text-lg font-semibold text-amber-700 dark:text-amber-300">{partialCount}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <p className="text-muted-foreground">Issue distribution</p>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <span
              className="block h-full bg-rose-500"
              style={{ width: `${corruptedPercent.toFixed(1)}%` }}
            />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <span
              className="block h-full bg-amber-500"
              style={{ width: `${partialPercent.toFixed(1)}%` }}
            />
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 px-4"
          onClick={() => {
            void onRevalidateCorrupted();
          }}
          disabled={loading || (corruptedCount === 0 && partialCount === 0)}
        >
          <IconHeartbeat className="size-3.5" />
          Revalidate Corrupted
        </Button>
      </CardContent>
    </Card>
  );
}
