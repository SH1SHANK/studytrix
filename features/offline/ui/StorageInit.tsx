"use client";

import { useEffect } from "react";

import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";

/**
 * Headless component that initializes the storage location store on mount.
 * Placed in the root layout to ensure early initialization.
 */
export function StorageInit() {
  const initialize = useStorageLocationStore((state) => state.initialize);
  const initialized = useStorageLocationStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  return null;
}
