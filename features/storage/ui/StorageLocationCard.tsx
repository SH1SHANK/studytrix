"use client";

import { useState } from "react";
import { IconAlertTriangle, IconFolder, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supportsFileSystemAccess } from "@/features/offline/offline.storage-location";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";
import { cn } from "@/lib/utils";

export function StorageLocationCard() {
  const displayPath = useStorageLocationStore((s) => s.displayPath);
  const status = useStorageLocationStore((s) => s.status);
  const providerType = useStorageLocationStore((s) => s.providerType);
  const openSetupSheet = useStorageLocationStore((s) => s.openSetupSheet);
  const openStorageFolder = useStorageLocationStore((s) => s.openStorageFolder);
  const runDiagnostics = useStorageLocationStore((s) => s.runDiagnostics);
  const error = useStorageLocationStore((s) => s.error);
  const [openPending, setOpenPending] = useState(false);
  const [diagnosticsPending, setDiagnosticsPending] = useState(false);

  const isMissing = status === "missing";
  const isUnsupported = status === "unsupported";
  const isAlertState = isMissing || isUnsupported;
  const pathLabel = isAlertState
    ? "Storage Location Lost or Unsupported"
    : displayPath || "Browser Storage (Default)";
  const hasApi = supportsFileSystemAccess();

  const handleOpenFolder = async () => {
    setOpenPending(true);
    try {
      const opened = await openStorageFolder();
      if (opened) {
        toast.success("Storage folder opened.");
      }
    } finally {
      setOpenPending(false);
    }
  };

  const handleDiagnostics = async () => {
    setDiagnosticsPending(true);
    try {
      const result = await runDiagnostics();
      if (!result) {
        toast.error("Could not run storage diagnostics.");
        return;
      }

      if (result.copied) {
        toast.success("Storage diagnostics copied to clipboard.");
      } else {
        toast.message("Diagnostics ready. Clipboard access is unavailable.");
      }
    } finally {
      setDiagnosticsPending(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Storage Location
        </CardTitle>
        <Button
          variant={isMissing ? "destructive" : "secondary"}
          size="sm"
          onClick={openSetupSheet}
          className="h-8 gap-1.5 text-xs"
        >
          {isMissing ? (
            <>
              <IconAlertTriangle className="size-3.5" /> Relink
            </>
          ) : isUnsupported ? (
            <>
              <IconSettings className="size-3.5" /> Use Default
            </>
          ) : (
            <>
              <IconSettings className="size-3.5" /> Change
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2.5">
            {isAlertState ? (
              <IconAlertTriangle className="size-4 shrink-0 text-destructive" />
            ) : (
              <IconFolder className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "truncate text-sm font-medium",
                isAlertState ? "text-destructive" : "text-foreground",
              )}
              title={pathLabel}
            >
              {pathLabel}
            </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {status === "configured" && providerType === "filesystem" && hasApi ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                void handleOpenFolder();
              }}
              disabled={openPending}
            >
              {openPending ? "Opening…" : "Open Storage Folder"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              void handleDiagnostics();
            }}
            disabled={diagnosticsPending}
          >
            {diagnosticsPending ? "Running…" : "Run Diagnostics"}
          </Button>
        </div>
        {!hasApi && status === "unconfigured" && (
          <p className="text-xs text-muted-foreground">
            Custom folder selection requires Chrome or Edge 86+.
            </p>
          )}
          {error && (
            <p className="text-xs font-medium text-rose-500 dark:text-rose-400">
              {error.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
