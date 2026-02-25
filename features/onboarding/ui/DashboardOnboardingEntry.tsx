"use client";

import { useEffect, useState } from "react";

import { OnboardingLoadingScreen } from "@/components/onboarding/OnboardingLoadingScreen";
import { DashboardSwipeContainer } from "@/features/dashboard/ui/DashboardSwipeContainer";
import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import { OnboardingGate } from "@/features/onboarding/ui/OnboardingGate";
import { useSettingsStore } from "@/features/settings/settings.store";

const MAX_LOADING_MS = 3000;

export function DashboardOnboardingEntry() {
  const settingsInitialized = useSettingsStore((state) => state.initialized);
  const completed = useOnboardingStore((state) => state.completed);
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

  if (!settingsInitialized && !loadingTimeoutElapsed) {
    return <OnboardingLoadingScreen />;
  }

  return (
    <>
      {completed ? <DashboardSwipeContainer /> : null}
      <OnboardingGate />
    </>
  );
}
