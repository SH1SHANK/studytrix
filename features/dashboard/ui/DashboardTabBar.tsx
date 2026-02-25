"use client";

import { motion } from "framer-motion";
import { FolderHeart, Globe } from "lucide-react";

import type { RepositoryPage } from "@/features/custom-folders/custom-folders.tabs.store";
import { cn } from "@/lib/utils";

type DashboardTabBarProps = {
  activePage: RepositoryPage;
  onChange: (page: RepositoryPage) => void;
  showPersonalRepository: boolean;
};

const TABS = [
  {
    id: "global" as const,
    label: "Global",
    icon: Globe,
    controls: "panel-global-repository",
  },
  {
    id: "personal" as const,
    label: "Personal",
    icon: FolderHeart,
    controls: "panel-personal-repository",
  },
];

export function DashboardTabBar({
  activePage,
  onChange,
  showPersonalRepository,
}: DashboardTabBarProps) {
  if (!showPersonalRepository) {
    return null;
  }

  const tabs = showPersonalRepository ? TABS : [TABS[0]];

  return (
    <div className="rounded-full border border-border/40 bg-card/45 p-1 shadow-[inset_0_1px_0_hsl(var(--background)/0.65)] backdrop-blur-xl">
      <div className={cn("grid", showPersonalRepository ? "grid-cols-2" : "grid-cols-1")}>
        {tabs.map((tab) => {
          const isActive = activePage === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}-repository`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={tab.controls}
              className={cn(
                "relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-full text-sm transition-colors",
                isActive
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
              onClick={() => onChange(tab.id)}
            >
              {isActive ? (
                <motion.span
                  layoutId="dashboard-tab-pill"
                  className="absolute inset-0 -z-10 rounded-full border border-primary/30 bg-[hsl(var(--primary)/0.14)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              ) : null}
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
