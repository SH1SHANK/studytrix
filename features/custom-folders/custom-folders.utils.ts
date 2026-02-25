import type { CustomFolder } from "./custom-folders.types";

export type FolderHealth = {
  status: "healthy" | "stale" | "syncing" | "error" | "offline-ready";
  label: string;
  colour: "green" | "amber" | "blue" | "red" | "muted";
};

function formatRelative(minutes: number): string {
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getFolderHealth(input: {
  folder: CustomFolder;
  isRefreshing?: boolean;
  allFilesOfflineCached?: boolean;
  now?: number;
}): FolderHealth {
  const { folder, isRefreshing = false, allFilesOfflineCached = false } = input;
  const now = input.now ?? Date.now();
  const syncError = folder.syncStatus?.lastSyncError ?? null;

  if (syncError === "PERMISSION_LOST") {
    return {
      status: "error",
      label: "Permission lost - tap to reconnect",
      colour: "red",
    };
  }

  if (syncError === "SCAN_FAILED") {
    return {
      status: "error",
      label: "Sync failed - tap to retry",
      colour: "red",
    };
  }

  if (isRefreshing) {
    return {
      status: "syncing",
      label: "Syncing...",
      colour: "blue",
    };
  }

  if (allFilesOfflineCached) {
    return {
      status: "offline-ready",
      label: "Available offline",
      colour: "green",
    };
  }

  const lastScannedAt = folder.syncStatus?.lastScannedAt ?? 0;
  if (!lastScannedAt || lastScannedAt <= 0) {
    return {
      status: "stale",
      label: "Not synced recently",
      colour: "amber",
    };
  }

  const ageMs = Math.max(0, now - lastScannedAt);
  const ageMinutes = Math.floor(ageMs / 60_000);
  if (ageMs < 30 * 60_000) {
    return {
      status: "healthy",
      label: `Synced ${Math.max(1, ageMinutes)} min ago`,
      colour: "green",
    };
  }

  if (ageMs <= 24 * 60 * 60_000) {
    return {
      status: "stale",
      label: `Last synced ${formatRelative(ageMinutes)}`,
      colour: "amber",
    };
  }

  return {
    status: "stale",
    label: "Not synced recently",
    colour: "amber",
  };
}

