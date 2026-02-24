"use client";

import { memo, useCallback, useState } from "react";
import { IconFolder, IconFolderOpen, IconHeartbeat, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SettingRowShell } from "@/features/settings/ui/SettingCardShell";
import { getSettingIcon } from "@/features/settings/ui/setting-icons";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";
import { supportsFileSystemAccess } from "@/features/offline/offline.storage-location";
import type { SettingItem } from "@/features/settings/settings.types";

interface SettingStorageLocationProps {
  setting: SettingItem;
}

function SettingStorageLocationComponent({ setting }: SettingStorageLocationProps) {
  const status = useStorageLocationStore((s) => s.status);
  const displayPath = useStorageLocationStore((s) => s.displayPath);
  const providerType = useStorageLocationStore((s) => s.providerType);
  const error = useStorageLocationStore((s) => s.error);
  
  const changeFolder = useStorageLocationStore((s) => s.changeFolder);
  const openStorageFolder = useStorageLocationStore((s) => s.openStorageFolder);
  const runDiagnostics = useStorageLocationStore((s) => s.runDiagnostics);
  const clearError = useStorageLocationStore((s) => s.clearError);
  const openSetupSheet = useStorageLocationStore((s) => s.openSetupSheet);

  const [changePending, setChangePending] = useState(false);
  const [openPending, setOpenPending] = useState(false);
  const [diagnosticsPending, setDiagnosticsPending] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  
  const hasApi = supportsFileSystemAccess();

  const handleChangeFolder = useCallback(async () => {
    setChangePending(true);
    clearError();
    try {
      await changeFolder();
    } finally {
      setChangePending(false);
    }
  }, [changeFolder, clearError]);

  const handleOpenFolder = useCallback(async () => {
    setOpenPending(true);
    clearError();
    try {
      const opened = await openStorageFolder();
      if (!opened) {
        return;
      }
      toast.success("Storage folder opened.");
    } finally {
      setOpenPending(false);
    }
  }, [clearError, openStorageFolder]);

  const handleDiagnostics = useCallback(async () => {
    setDiagnosticsPending(true);
    clearError();
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
    } catch {
      toast.error("Could not run storage diagnostics.");
    } finally {
      setDiagnosticsPending(false);
    }
  }, [clearError, runDiagnostics]);

  const pathLabel = displayPath
    ? displayPath.length > 30 && !showFullPath
      ? `…${displayPath.slice(-28)}`
      : displayPath
    : providerType === "indexeddb"
      ? "Browser Storage (Default)"
      : "Not configured";

  const trailing = (
    <div className="flex flex-col items-end gap-2">
      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {status === "unconfigured" && (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => openSetupSheet()}
          >
            <IconSettings className="size-3" /> Configure
          </Button>
        )}

        {status === "unsupported" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => openSetupSheet()}
          >
            <IconSettings className="size-3" /> Use Default
          </Button>
        )}
        
        {status === "configured" && hasApi && (
          <>
            {providerType === "filesystem" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => void handleOpenFolder()}
                disabled={openPending}
              >
                <IconFolderOpen className="size-3" />
                {openPending ? "Opening…" : "Open Folder"}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => void handleChangeFolder()}
              disabled={changePending}
            >
              <IconFolderOpen className="size-3" />
              {changePending ? "Selecting…" : "Change Folder"}
            </Button>
          </>
        )}
        
        {status === "missing" && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-7 gap-1 text-xs"
            onClick={() => openSetupSheet()}
          >
            <IconFolder className="size-3" /> Relink
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => void handleDiagnostics()}
          disabled={diagnosticsPending}
        >
          <IconHeartbeat className="size-3" />
          {diagnosticsPending ? "Running…" : "Diagnostics"}
        </Button>
      </div>
    </div>
  );

  return (
    <SettingRowShell
      label={setting.label}
      icon={getSettingIcon(setting.id)}
      description={
        <span className="space-y-1">
          <span className="block mb-1">{setting.description}</span>
          <button
            type="button"
            onClick={() => setShowFullPath((v) => !v)}
            className={cn(
              "block text-left text-xs transition-colors py-1",
              "text-muted-foreground hover:text-foreground/90 dark:hover:text-foreground",
              (status === "missing" || status === "unsupported") && "text-rose-500 hover:text-rose-600 dark:text-rose-400"
            )}
            title={displayPath ?? undefined}
          >
            {pathLabel}
          </button>
          
          {!hasApi && status === "unconfigured" && (
            <span className="block text-[10px] text-muted-foreground/80">
              Custom folder selection requires Chrome or Edge 86+
            </span>
          )}
          
          {error && (
            <span className="block text-[10px] text-rose-500 dark:text-rose-400">
              {error.message}
            </span>
          )}
        </span>
      }
      trailing={trailing}
    />
  );
}

export const SettingStorageLocation = memo(SettingStorageLocationComponent);
