import { Suspense } from "react";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { AppShell } from "@/components/layout/AppShell";

export default function Page() {
  return (
    <AppShell showHeader={false}>
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading dashboard...</div>}>
        <DashboardGrid />
      </Suspense>
    </AppShell>
  );
}
