import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSwipeContainer } from "@/features/dashboard/ui/DashboardSwipeContainer";
import { AppShell } from "@/components/layout/AppShell";

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
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading dashboard...</div>}>
        <DashboardSwipeContainer />
      </Suspense>
    </AppShell>
  );
}
