"use client";

import { useCallback, useState } from "react";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type ConfirmAction = "delete_all" | "clear_corrupted" | null;

export function BulkDeletePanel({
  corruptedCount,
  onDeleteAll,
  onDeleteOld,
  onDeletePrefetchOnly,
  onClearCorrupted,
}: BulkDeletePanelProps) {
  const [days, setDays] = useState(30);
  const [pending, setPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const handleDeleteOlder = useCallback(async () => {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    setPending(true);
    try {
      await onDeleteOld(cutoff);
    } finally {
      setPending(false);
    }
  }, [days, onDeleteOld]);

  const handleDeletePrefetchOnly = useCallback(async () => {
    setPending(true);
    try {
      await onDeletePrefetchOnly();
    } finally {
      setPending(false);
    }
  }, [onDeletePrefetchOnly]);

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) {
      return;
    }

    setPending(true);
    try {
      if (confirmAction === "delete_all") {
        await onDeleteAll();
      } else {
        await onClearCorrupted();
      }
      setConfirmAction(null);
    } finally {
      setPending(false);
    }
  }, [confirmAction, onClearCorrupted, onDeleteAll]);

  return (
    <>
      <Card className="rounded-2xl border border-rose-200/80 bg-rose-50/50 shadow-sm dark:border-rose-900/70 dark:bg-rose-950/20">
        <CardHeader className="pb-0">
          <CardTitle id="bulk-delete-title" className="text-base font-semibold text-rose-700 dark:text-rose-300">
            Cleanup Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <Label htmlFor="older-than-days" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Remove files not accessed in the last N days
            </Label>
            <div className="flex flex-wrap items-end gap-2">
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
                className="h-9 w-28 rounded-lg bg-background"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 px-4"
                onClick={() => {
                  void handleDeleteOlder();
                }}
                disabled={pending}
              >
                Delete old files
              </Button>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-4"
            onClick={() => {
              void handleDeletePrefetchOnly();
            }}
            disabled={pending}
          >
            Delete prefetch files only
          </Button>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 border-amber-300/70 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800/70 dark:text-amber-300 dark:hover:bg-amber-950/30"
              onClick={() => setConfirmAction("clear_corrupted")}
              disabled={pending || corruptedCount === 0}
            >
              <IconAlertTriangle className="size-3.5" />
              Clear corrupted ({corruptedCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-9 gap-1.5"
              onClick={() => setConfirmAction("delete_all")}
              disabled={pending}
            >
              <IconTrash className="size-3.5" />
              Delete all offline data
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => {
        if (!open) {
          setConfirmAction(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete_all" ? "Delete all offline data?" : "Clear corrupted files?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete_all"
                ? "All offline files and offline search cache will be removed. Downloads can be restored later."
                : "Only corrupted files will be removed from local storage. Healthy files remain untouched."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}
            >
              {pending ? "Working..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
