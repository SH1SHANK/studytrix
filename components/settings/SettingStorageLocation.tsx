"use client";
import { memo, useCallback, useState } from "react";
import { IconFolder, IconFolderOpen, IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SettingRowShell } from "@/components/settings/SettingCardShell";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";
import { supportsFileSystemAccess } from "@/features/offline/offline.storage-location";
import { StorageSetupSheet } from "../offline/StorageSetupSheet";
function SettingStorageLocationComponent() {
  const status = useStorageLocationStore((s) => s.status);
  const displayPath = useStorageLocationStore((s) => s.displayPath);
  const providerType = useStorageLocationStore((s) => s.providerType);
  const migrationProgress = useStorageLocationStore((s) => s.migrationProgress);
  const error = useStorageLocationStore((s) => s.error);
  const changeFolder = useStorageLocationStore((s) => s.changeFolder);
  const clearError = useStorageLocationStore((s) => s.clearError);
  const [setupOpen, setSetupOpen] = useState(false);
  const [changePending, setChangePending] = useState(false);
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
  const pathLabel = displayPath
    ? displayPath.length > 30 && !showFullPath
      ? `…${displayPath.slice(-28)}`
      : displayPath
    : providerType === "indexeddb"
      ? "Browser Storage (Default)"
      : "Not configured";
  const isMigrating = status === "migrating";
  const trailing = (
    <div className="flex flex-col items-end gap-2">
      {" "}
      {/* Migration progress */}{" "}
      {isMigrating && migrationProgress && (
        <div className="w-32 space-y-1">
          {" "}
          <Progress
            value={migrationProgress.done}
            max={migrationProgress.total || 1}
          />{" "}
          <p className="text-right text-[10px] text-muted-foreground/80">
            {" "}
            {migrationProgress.done}/{migrationProgress.total}{" "}
          </p>{" "}
        </div>
      )}{" "}
      {/* Action buttons */}{" "}
      {!isMigrating && (
        <div className="flex items-center gap-1.5">
          {" "}
          {status === "unconfigured" && hasApi && (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSetupOpen(true)}
            >
              {" "}
              <IconSettings className="size-3" /> Configure{" "}
            </Button>
          )}{" "}
          {status === "configured" && hasApi && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => void handleChangeFolder()}
              disabled={changePending || !navigator.onLine}
            >
              {" "}
              <IconFolderOpen className="size-3" />{" "}
              {changePending ? "Selecting…" : "Change Folder"}{" "}
            </Button>
          )}{" "}
          {status === "missing" && (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSetupOpen(true)}
            >
              {" "}
              <IconFolder className="size-3" /> Relink{" "}
            </Button>
          )}{" "}
        </div>
      )}{" "}
    </div>
  );
  return (
    <>
      {" "}
      <SettingRowShell
        label="Storage Location"
        description={
          <span className="space-y-1">
            {" "}
            <button
              type="button"
              onClick={() => setShowFullPath((v) => !v)}
              className={cn(
                "block text-left text-xs transition-colors",
                "text-muted-foreground hover:text-foreground/90 dark:hover:text-foreground",
              )}
              title={displayPath ?? undefined}
            >
              {" "}
              {pathLabel}{" "}
            </button>{" "}
            {!hasApi && status === "unconfigured" && (
              <span className="block text-[10px] text-muted-foreground/80">
                {" "}
                Custom folder selection requires Chrome or Edge 86+{" "}
              </span>
            )}{" "}
            {error && (
              <span className="block text-[10px] text-rose-500 dark:text-rose-400">
                {" "}
                {error.message}{" "}
              </span>
            )}{" "}
          </span>
        }
        trailing={trailing}
      />{" "}
      <StorageSetupSheet
        open={setupOpen}
        onOpenChange={setSetupOpen}
        mode={status === "missing" ? "relink" : "setup"}
      />{" "}
    </>
  );
}
export const SettingStorageLocation = memo(SettingStorageLocationComponent);
