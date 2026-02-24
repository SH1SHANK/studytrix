"use client";

import { useEffect } from "react";

function hasActiveOverlay(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const activeDialog = document.querySelector('[data-slot="dialog-content"][role="dialog"]');
  if (activeDialog) {
    return true;
  }

  const activeAlertDialog = document.querySelector('[data-slot="alert-dialog-content"]');
  if (activeAlertDialog) {
    return true;
  }

  const activeVaulDrawer = document.querySelector('[data-vaul-drawer][data-state="open"]');
  return Boolean(activeVaulDrawer);
}

function clearStaleScrollLock(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (hasActiveOverlay()) {
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  if (root.style.overflow === "hidden") {
    root.style.overflow = "";
  }
  if (root.style.touchAction === "none") {
    root.style.touchAction = "";
  }
  if (body.style.overflow === "hidden") {
    body.style.overflow = "";
  }
  if (body.style.touchAction === "none") {
    body.style.touchAction = "";
  }
}

export function ScrollLockRecovery() {
  useEffect(() => {
    clearStaleScrollLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearStaleScrollLock();
      }
    };

    window.addEventListener("pageshow", clearStaleScrollLock);
    window.addEventListener("focus", clearStaleScrollLock);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", clearStaleScrollLock);
      window.removeEventListener("focus", clearStaleScrollLock);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
