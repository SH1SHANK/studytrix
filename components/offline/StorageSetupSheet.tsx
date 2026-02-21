"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  IconAlertTriangle,
  IconBrandChrome,
  IconDatabase,
  IconDeviceDesktop,
  IconFolder,
  IconFolderPlus,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supportsFileSystemAccess } from "@/features/offline/offline.storage-location";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";

type SetupStep = "choose" | "create-name" | "unsupported" | "relink";

type StorageSetupSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "setup" | "relink";
};

type OptionCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "muted";
};

function OptionCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
  variant = "default",
}: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.985 }}
      transition={{ type: "spring", stiffness: 440, damping: 34 }}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        variant === "default"
          ? "border-border bg-card hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
          : "border-border/70 bg-muted/70 hover:bg-muted/70 dark:hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}

export function StorageSetupSheet({
  open,
  onOpenChange,
  mode = "setup",
}: StorageSetupSheetProps) {
  const hasApi = supportsFileSystemAccess();
  const initialStep: SetupStep = mode === "relink" ? "relink" : hasApi ? "choose" : "unsupported";

  const [step, setStep] = useState<SetupStep>(initialStep);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const selectFolder = useStorageLocationStore((s) => s.selectFolder);
  const createFolder = useStorageLocationStore((s) => s.createFolder);
  const defaultStorageAction = useStorageLocationStore((s) => s.useDefault);
  const relinkFolder = useStorageLocationStore((s) => s.relinkFolder);
  const error = useStorageLocationStore((s) => s.error);
  const clearError = useStorageLocationStore((s) => s.clearError);
  const status = useStorageLocationStore((s) => s.status);
  const migrationProgress = useStorageLocationStore((s) => s.migrationProgress);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(mode === "relink" ? "relink" : supportsFileSystemAccess() ? "choose" : "unsupported");
    setFolderName("");
    clearError();
  }, [clearError, mode, open]);

  const close = useCallback(() => {
    clearError();
    onOpenChange(false);
  }, [clearError, onOpenChange]);

  const handleSelectFolder = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await selectFolder();
      if (ok) {
        close();
      }
    } finally {
      setLoading(false);
    }
  }, [selectFolder, close]);

  const handleCreateFolder = useCallback(async () => {
    if (!folderName.trim()) return;

    setLoading(true);
    try {
      const ok = await createFolder(folderName);
      if (ok) {
        close();
      }
    } finally {
      setLoading(false);
    }
  }, [createFolder, folderName, close]);

  const handleUseDefault = useCallback(async () => {
    setLoading(true);
    try {
      await defaultStorageAction();
      close();
    } finally {
      setLoading(false);
    }
  }, [defaultStorageAction, close]);

  const handleRelink = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await relinkFolder();
      if (ok) {
        close();
      }
    } finally {
      setLoading(false);
    }
  }, [relinkFolder, close]);

  const handleStartFresh = useCallback(async () => {
    setLoading(true);
    try {
      await defaultStorageAction();
      close();
    } finally {
      setLoading(false);
    }
  }, [defaultStorageAction, close]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1rem)] max-h-[calc(100vh-1.25rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6",
          isCoarsePointer && "max-h-[calc(100vh-0.5rem)]",
        )}
        showCloseButton={status !== "migrating"}
      >
        <AnimatePresence mode="wait">
          {status === "migrating" && migrationProgress && (
            <motion.div
              key="migrating"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Moving Files…</DialogTitle>
                <DialogDescription>
                  Migrating your offline files to the new location. Please don't close this window.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Progress value={migrationProgress.done} max={migrationProgress.total || 1} />
                <p className="text-center text-xs text-muted-foreground">
                  {migrationProgress.done} / {migrationProgress.total} files
                </p>
              </div>
            </motion.div>
          )}

          {step === "choose" && status !== "migrating" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Set Up Offline Storage</DialogTitle>
                <DialogDescription>
                  Choose where to store your offline files. You can change this later in Settings.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <OptionCard
                  icon={IconFolder}
                  title="Choose Existing Folder"
                  description="Pick any folder on your device to store offline files."
                  onClick={() => void handleSelectFolder()}
                  disabled={loading}
                />
                <OptionCard
                  icon={IconFolderPlus}
                  title="Create New Folder"
                  description="Create a dedicated folder for Studytrix offline files."
                  onClick={() => setStep("create-name")}
                  disabled={loading}
                />
                <OptionCard
                  icon={IconDatabase}
                  title="Use Default Storage"
                  description="Store files in browser internal storage. Quick and simple."
                  onClick={() => void handleUseDefault()}
                  disabled={loading}
                  variant="muted"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400">
                  <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error.message}</span>
                </div>
              )}
            </motion.div>
          )}

          {step === "create-name" && status !== "migrating" && (
            <motion.div
              key="create-name"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name, then choose where to create it. A new folder will be created inside your
                  selected location.
                </DialogDescription>
              </DialogHeader>

              <Input
                id="folder-name-input"
                placeholder="e.g. Studytrix Offline"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="h-11"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && folderName.trim()) {
                    void handleCreateFolder();
                  }
                }}
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400">
                  <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error.message}</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearError();
                    setStep("choose");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleCreateFolder()}
                  disabled={!folderName.trim() || loading}
                >
                  {loading ? "Creating…" : "Create & Select Location"}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === "unsupported" && status !== "migrating" && (
            <motion.div
              key="unsupported"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Custom Folder Selection Unavailable</DialogTitle>
                <DialogDescription>
                  Your browser doesn't support the File System Access API needed for custom folder
                  selection. This is common on mobile/PWA builds. Your files will be stored securely
                  in browser storage.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 rounded-lg border border-border bg-muted/70 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                  <IconInfoCircle className="size-3.5" />
                  Supported browsers
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconBrandChrome className="size-3.5" />
                    Chrome 86+
                  </span>
                  <span className="flex items-center gap-1">
                    <IconDeviceDesktop className="size-3.5" />
                    Edge 86+
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" size="sm" onClick={() => void handleUseDefault()} disabled={loading}>
                  Continue with Default Storage
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === "relink" && status !== "migrating" && (
            <motion.div
              key="relink"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Restore Offline Access</DialogTitle>
                <DialogDescription>
                  We couldn't find your previous offline files. Select your existing folder to restore
                  access.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <OptionCard
                  icon={IconRefresh}
                  title="Relink Existing Folder"
                  description="Select the folder you previously used for offline storage."
                  onClick={() => void handleRelink()}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400">
                  <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error.message}</span>
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <IconAlertTriangle className="size-3.5 shrink-0" />
                  Or start fresh
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-600 dark:text-amber-500">
                  Your previously cached offline files will become inaccessible. You'll need to re-download
                  them.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={() => void handleStartFresh()}
                  disabled={loading}
                >
                  Start Fresh
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export function GlobalStorageSetupSheet() {
  const isSetupSheetOpen = useStorageLocationStore((s) => s.isSetupSheetOpen);
  const openSetupSheet = useStorageLocationStore((s) => s.openSetupSheet);
  const closeSetupSheet = useStorageLocationStore((s) => s.closeSetupSheet);

  return (
    <StorageSetupSheet
      open={isSetupSheetOpen}
      onOpenChange={(open) => (open ? openSetupSheet() : closeSetupSheet())}
    />
  );
}
