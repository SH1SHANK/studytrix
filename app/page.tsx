import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingLoadingScreen } from "@/components/onboarding/OnboardingLoadingScreen";
import { DashboardOnboardingEntry } from "@/features/onboarding/ui/DashboardOnboardingEntry";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Open your Studytrix dashboard to browse courses, continue study sessions, and access scoped command search quickly.",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return (
    <AppShell showHeader={false}>
      <Suspense fallback={<OnboardingLoadingScreen />}>
        <DashboardOnboardingEntry />
      </Suspense>
    </AppShell>
  );
}
