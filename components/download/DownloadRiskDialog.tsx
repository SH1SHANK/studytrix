"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatFileSize } from "@/features/drive/drive.types";
import { resolveDownloadRiskDialog, useDownloadRiskDialogState } from "@/ui/hooks/useDownloadRiskGate";

export function DownloadRiskDialog() {
  const state = useDownloadRiskDialogState();
  const summary = state.summary;

  return (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open && state.open) {
          resolveDownloadRiskDialog(false);
        }
      }}
    >
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <IconAlertTriangle className="size-4" />
          </AlertDialogMedia>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {state.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {summary && summary.confirmItems.length > 0 ? (
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border/70 bg-muted/40 px-2 py-1.5">
            {summary.confirmItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 font-medium text-foreground/80">
                  {typeof item.sizeBytes === "number" && item.sizeBytes > 0
                    ? formatFileSize(item.sizeBytes)
                    : "Unknown"}
                </span>
              </div>
            ))}
            {summary.confirmItems.length > 6 ? (
              <p className="text-[10px] text-muted-foreground">
                +{summary.confirmItems.length - 6} more
              </p>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              resolveDownloadRiskDialog(false);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resolveDownloadRiskDialog(true);
            }}
          >
            {state.confirmButtonLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
