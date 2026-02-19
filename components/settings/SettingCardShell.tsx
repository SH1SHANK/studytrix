"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingRowShellProps {
  label: string;
  description?: string;
  requiresRestart?: boolean;
  trailing?: ReactNode;
  children?: ReactNode;
  tone?: "default" | "danger";
}

export function SettingRowShell({
  label,
  description,
  requiresRestart = false,
  trailing,
  children,
  tone = "default",
}: SettingRowShellProps) {
  const isDanger = tone === "danger";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-4 border-b border-stone-200/60 last:border-0 dark:border-stone-700/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        isDanger && "bg-rose-50/30 px-3 -mx-3 rounded-lg dark:bg-rose-950/20",
      )}
    >
      <div className="min-w-0 space-y-1">
        <h3
          className={cn(
            "text-[1.05rem] leading-tight font-medium text-stone-900 dark:text-stone-100",
            isDanger && "text-rose-700 dark:text-rose-300",
          )}
        >
          {label}
        </h3>
        {description ? (
          <p className="text-[13px] leading-snug text-stone-500 dark:text-stone-400 max-w-2xl">
            {description}
          </p>
        ) : null}
        {requiresRestart ? (
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
            Requires restart
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
        {children ? <div className="flex-1 sm:flex-none">{children}</div> : <div />}
        {trailing ? (
          <div className="shrink-0 text-sm font-medium text-stone-500 dark:text-stone-400">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
