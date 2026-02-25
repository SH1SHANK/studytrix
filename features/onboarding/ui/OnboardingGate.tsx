"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import { OnboardingDialog } from "@/features/onboarding/ui/OnboardingDialog";
import { useSettingsStore } from "@/features/settings/settings.store";

const MAX_LOADING_MS = 3000;

export function OnboardingGate() {
  const pathname = usePathname();
  const settingsInitialized = useSettingsStore((state) => state.initialized);
  const completed = useOnboardingStore((state) => state.completed);
  const active = useOnboardingStore((state) => state.active);
  const setActive = useOnboardingStore((state) => state.setActive);
  const markCompleted = useOnboardingStore((state) => state.markCompleted);

  const [loadingTimeoutElapsed, setLoadingTimeoutElapsed] = useState(false);

  useEffect(() => {
    if (settingsInitialized) {
      setLoadingTimeoutElapsed(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoadingTimeoutElapsed(true);
    }, MAX_LOADING_MS);

    return () => window.clearTimeout(timeoutId);
  }, [settingsInitialized]);

  const shouldShow = pathname === "/" && !completed && (settingsInitialized || loadingTimeoutElapsed);

  useEffect(() => {
    if (active !== shouldShow) {
      setActive(shouldShow);
    }
  }, [active, setActive, shouldShow]);

  const handleComplete = useCallback(() => {
    markCompleted();
    setActive(false);
  }, [markCompleted, setActive]);

  if (pathname !== "/") {
    return null;
  }

  return (
    <OnboardingDialog
      open={shouldShow}
      onComplete={handleComplete}
    />
  );
}
