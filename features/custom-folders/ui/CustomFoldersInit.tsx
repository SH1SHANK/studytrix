"use client";

import { useEffect } from "react";

import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";

export function CustomFoldersInit() {
  const hasHydrated = useCustomFoldersStore((state) => state.hasHydrated);
  const initialized = useCustomFoldersStore((state) => state.initialized);
  const initialize = useCustomFoldersStore((state) => state.initialize);

  useEffect(() => {
    if (!hasHydrated || initialized) {
      return;
    }

    void initialize();
  }, [hasHydrated, initialized, initialize]);

  return null;
}
