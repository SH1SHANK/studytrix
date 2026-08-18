"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import { OnboardingDialog } from "@/features/onboarding/ui/OnboardingDialog";
import { useSettingsStore } from "@/features/settings/settings.store";

export function OnboardingGate() {
  const pathname = usePathname();
  const settingsInitialized = useSettingsStore((state) => state.initialized);
  const isHydrated = useOnboardingStore((state) => state.isHydrated);
  const completed = useOnboardingStore((state) => state.completed);
  const active = useOnboardingStore((state) => state.active);
  const setActive = useOnboardingStore((state) => state.setActive);
  const markCompleted = useOnboardingStore((state) => state.markCompleted);

  // Only evaluate shouldShow once both local storage and settings have finished hydration
  const shouldShow =
    pathname === "/" &&
    isHydrated &&
    settingsInitialized &&
    !completed;

  useEffect(() => {
    if (active !== shouldShow) {
      setActive(shouldShow);
    }
  }, [active, setActive, shouldShow]);

  const handleComplete = useCallback(() => {
    markCompleted();
    setActive(false);
  }, [markCompleted, setActive]);

  if (pathname !== "/" || !isHydrated || !settingsInitialized) {
    return null;
  }

  return (
    <OnboardingDialog
      open={shouldShow}
      onComplete={handleComplete}
    />
  );
}
