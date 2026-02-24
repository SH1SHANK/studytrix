"use client";

import { DashboardGrid } from "@/features/dashboard/ui/DashboardGrid";

type GlobalRepositoryGridProps = {
  showSharedChrome?: boolean;
};

export function GlobalRepositoryGrid({ showSharedChrome = true }: GlobalRepositoryGridProps) {
  return (
    <section
      id="panel-global-repository"
      role="tabpanel"
      aria-labelledby="tab-global-repository"
      className="min-w-0"
    >
      <h2 className="sr-only">Global Repository</h2>
      <DashboardGrid showSharedChrome={showSharedChrome} />
    </section>
  );
}
