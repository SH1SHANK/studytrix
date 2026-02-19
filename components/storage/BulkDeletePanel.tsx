"use client";

import { useCallback, useState } from "react";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BulkDeletePanelProps {
  corruptedCount: number;
  onDeleteAll: () => Promise<void>;
  onDeleteOld: (notAccessedSince: number) => Promise<void>;
  onDeletePrefetchOnly: () => Promise<void>;
  onClearCorrupted: () => Promise<void>;
}

export function BulkDeletePanel({
  corruptedCount,
  onDeleteAll,
  onDeleteOld,
  onDeletePrefetchOnly,
  onClearCorrupted,
}: BulkDeletePanelProps) {
  const [days, setDays] = useState(30);

  const handleDeleteOlder = useCallback(async () => {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    await onDeleteOld(cutoff);
  }, [days, onDeleteOld]);

  return (
    <Card className="rounded-2xl border border-rose-200/80 bg-rose-50/50 shadow-sm dark:border-rose-900/70 dark:bg-rose-950/20">
      <CardHeader className="pb-0">
        <CardTitle id="bulk-delete-title" className="text-base font-semibold text-rose-700 dark:text-rose-300">
          Bulk Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-9 px-4"
          onClick={() => {
            void onDeleteAll();
          }}
        >
          <IconTrash className="size-3.5" />
          Delete All Offline
        </Button>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="older-than-days" className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
              Older than days
            </Label>
            <Input
              id="older-than-days"
              type="number"
              min={1}
              value={days}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (Number.isFinite(nextValue) && nextValue > 0) {
                  setDays(nextValue);
                }
              }}
              className="h-9 w-28 rounded-lg"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-4"
            onClick={() => {
              void handleDeleteOlder();
            }}
          >
            Delete Files Older Than X Days
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 px-4"
          onClick={() => {
            void onDeletePrefetchOnly();
          }}
        >
          Delete Prefetch Files Only
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 px-4"
          onClick={() => {
            void onClearCorrupted();
          }}
          disabled={corruptedCount === 0}
        >
          <IconAlertTriangle className="size-3.5" />
          Clear Corrupted Files ({corruptedCount})
        </Button>
      </CardContent>
    </Card>
  );
}
