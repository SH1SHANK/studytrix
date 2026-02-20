"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import {
  isOfflineV3Enabled,
  isOfflineV3SwEnabled,
  OFFLINE_FLAGS_EVENT,
  OFFLINE_V3_FLAG_KEY,
  OFFLINE_V3_SW_FLAG_KEY,
} from "@/features/offline/offline.flags";
import { registerConnectivityListeners } from "@/features/offline/offline.connectivity.store";
import {
  startOfflineSyncScheduler,
  stopOfflineSyncScheduler,
} from "@/features/offline/offline.sync.scheduler";

const SW_PATHNAME = "/studytrix-sw.js";
const SW_CACHE_PREFIXES = ["studytrix-shell-", "studytrix-static-"];
const IS_PRODUCTION = process.env.NODE_ENV === "production";

async function clearOfflineV3SwCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => SW_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
        .map((key) => caches.delete(key)),
    );
  } catch {
  }
}

async function unregisterOfflineV3Sw(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => {
          const worker = registration.active ?? registration.installing ?? registration.waiting;
          if (!worker) {
            return false;
          }

          try {
            const script = new URL(worker.scriptURL);
            return script.pathname === SW_PATHNAME;
          } catch {
            return false;
          }
        })
        .map((registration) => registration.unregister()),
    );
  } catch {
  }
}

async function ensureOfflineV3SwRegistered(): Promise<void> {
  if (!IS_PRODUCTION) {
    await unregisterOfflineV3Sw();
    await clearOfflineV3SwCaches();
    return;
  }

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const swVersion = process.env.NEXT_PUBLIC_SW_VERSION || "v3";
  try {
    await navigator.serviceWorker.register(`${SW_PATHNAME}?v=${encodeURIComponent(swVersion)}`);
  } catch {
  }
}

async function applyRuntimeFlags(): Promise<void> {
  if (!isOfflineV3Enabled()) {
    stopOfflineSyncScheduler();
    await unregisterOfflineV3Sw();
    await clearOfflineV3SwCaches();
    return;
  }

  startOfflineSyncScheduler();

  if (isOfflineV3SwEnabled() && IS_PRODUCTION) {
    await ensureOfflineV3SwRegistered();
    return;
  }

  await unregisterOfflineV3Sw();
  await clearOfflineV3SwCaches();
}

export function OfflineRuntime() {
  useEffect(() => {
    const cleanupConnectivity = registerConnectivityListeners();
    void applyRuntimeFlags();
    const flagInterval = window.setInterval(() => {
      void applyRuntimeFlags();
    }, 15_000);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== OFFLINE_V3_FLAG_KEY && event.key !== OFFLINE_V3_SW_FLAG_KEY) {
        return;
      }

      void applyRuntimeFlags();
    };
    window.addEventListener("storage", handleStorage);
    const handleFlagsChanged = () => {
      void applyRuntimeFlags();
    };
    window.addEventListener(OFFLINE_FLAGS_EVENT, handleFlagsChanged);

    const handleControllerChange = () => {
      if (!isOfflineV3SwEnabled()) {
        return;
      }

      toast.message("Studytrix updated. Reload to apply the latest offline runtime.");
    };
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    return () => {
      cleanupConnectivity();
      stopOfflineSyncScheduler();
      window.clearInterval(flagInterval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(OFFLINE_FLAGS_EVENT, handleFlagsChanged);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
