"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
import {
  loadDirectoryHandle,
  requestHandlePermission,
} from "@/features/custom-folders/local-handle.db";

type LocalFolderReconnectBannerProps = {
  folderId: string;
};

export function LocalFolderReconnectBanner({ folderId }: LocalFolderReconnectBannerProps) {
  const folder = useCustomFoldersStore((state) => state.folders.find((entry) => entry.id === folderId));
  const needsReconnect = useCustomFoldersStore((state) => state.needsReconnect.has(folderId));
  const refreshLocalFolder = useCustomFoldersStore((state) => state.refreshLocalFolder);
  const clearNeedsReconnect = useCustomFoldersStore((state) => state.clearNeedsReconnect);
  const updateSyncStatus = useCustomFoldersStore((state) => state.updateSyncStatus);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    const key = folder?.localHandleKey?.trim();
    if (!key) {
      setHandle(null);
      return;
    }

    let isActive = true;
    void loadDirectoryHandle(key).then((loaded) => {
      if (isActive) {
        setHandle(loaded);
      }
    });

    return () => {
      isActive = false;
    };
  }, [folder?.localHandleKey]);

  const message = useMemo(() => {
    if (permissionDenied) {
      return "Permission denied. Remove and re-add this folder.";
    }

    const label = folder?.label?.trim() || "This folder";
    return `\"${label}\" needs permission. Tap to reconnect.`;
  }, [folder?.label, permissionDenied]);

  if (!folder || (!needsReconnect && !permissionDenied) || dismissed) {
    return null;
  }

  return (
    <AnimatePresence initial={false}>
      <motion.button
        type="button"
        onClick={() => {
          if (isReconnecting || permissionDenied) {
            return;
          }
          if (!handle) {
            return;
          }

          setIsReconnecting(true);
          void requestHandlePermission(handle)
            .then((granted) => {
              if (granted) {
                setDismissed(true);
                clearNeedsReconnect(folderId);
                updateSyncStatus(folderId, { lastSyncError: null });
                void refreshLocalFolder(folderId);
                return;
              }

              setPermissionDenied(true);
              updateSyncStatus(folderId, { lastSyncError: "PERMISSION_LOST" });
            })
            .finally(() => {
              setIsReconnecting(false);
            });
        }}
        initial={{ height: 0, opacity: 0, marginTop: 0 }}
        animate={{ height: 48, opacity: 1, marginTop: 8 }}
        exit={{ height: 0, opacity: 0, marginTop: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full overflow-hidden rounded-lg border border-amber-500/40 bg-[color-mix(in_oklab,var(--warning,#f59e0b)_12%,var(--card))] px-3 text-left"
      >
        <span className="flex h-12 items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="truncate">{isReconnecting ? "Requesting permission..." : message}</span>
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
