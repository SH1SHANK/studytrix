"use client";

import { useEffect, useMemo, useState } from "react";
import { IconWifiOff, IconX } from "@tabler/icons-react";

import { useOfflineConnectivityStore } from "@/features/offline/offline.connectivity.store";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "studytrix.offline.banner.dismissed";
const BANNER_WINDOW_MS = 10_000;

function formatRelativeTimestamp(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "Not synced yet";
  }

  const elapsedMs = Date.now() - timestamp;
  if (elapsedMs < 30_000) {
    return "Just now";
  }

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ConnectivityBanner() {
  const isOnline = useOfflineConnectivityStore((state) => state.isOnline);
  const lastOfflineAt = useOfflineConnectivityStore((state) => state.lastOfflineAt);
  const lastSyncAt = useOfflineConnectivityStore((state) => state.lastSyncAt);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persisted = window.sessionStorage.getItem(DISMISS_KEY);
    setDismissed(persisted === "1");
  }, []);

  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(DISMISS_KEY);
      }
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isOnline]);

  const inBannerWindow = useMemo(() => {
    if (isOnline || !lastOfflineAt) {
      return false;
    }

    return now - lastOfflineAt <= BANNER_WINDOW_MS;
  }, [isOnline, lastOfflineAt, now]);

  if (isOnline) {
    return null;
  }

  const syncLabel = formatRelativeTimestamp(lastSyncAt);

  if (!dismissed && inBannerWindow) {
    return (
      <div className="mb-3 rounded-xl border border-amber-300/60 bg-amber-50/90 px-3 py-2 text-amber-900 backdrop-blur dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-center gap-2">
          <IconWifiOff className="size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">Offline mode</p>
            <p className="text-[11px] opacity-90">Showing cached data. Last sync: {syncLabel}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
            onClick={() => {
              setDismissed(true);
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(DISMISS_KEY, "1");
              }
            }}
            aria-label="Dismiss offline notice"
          >
            <IconX className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50/80 px-2.5 py-1 text-[11px] font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
      <span className="inline-block size-1.5 rounded-full bg-amber-500" />
      Offline · Last sync {syncLabel}
    </div>
  );
}
