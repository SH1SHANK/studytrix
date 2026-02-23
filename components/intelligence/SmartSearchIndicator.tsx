"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";
import type { IntelligenceRuntimeStatus } from "@/features/intelligence/intelligence.store";

interface SmartSearchIndicatorProps {
  enabled: boolean;
  status: IntelligenceRuntimeStatus;
  indexing?: boolean;
}

function resolveLabel(
  status: IntelligenceRuntimeStatus,
  indexing: boolean,
): string {
  if (status === "loading") {
    return "Warming up…";
  }

  if (status === "ready" && indexing) {
    return "Learning your files…";
  }

  if (status === "ready") {
    return "Ready";
  }

  if (status === "error") {
    return "Unavailable";
  }

  return "";
}

function SmartSearchIndicatorComponent({
  enabled,
  status,
  indexing = false,
}: SmartSearchIndicatorProps) {
  if (!enabled) {
    return null;
  }

  if (status === "idle") {
    return null;
  }

  const label = resolveLabel(status, indexing);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-live="polite"
      title={status === "error" ? "Smart search could not start. Try refreshing." : undefined}
    >
      <span
        className={cn(
          "inline-flex size-[7px] rounded-full ring-2 ring-offset-1 ring-offset-transparent",
          status === "loading" && "animate-pulse bg-amber-400 ring-amber-400/30",
          status === "ready" && indexing && "animate-pulse bg-sky-400 ring-sky-400/30",
          status === "ready" && !indexing && "bg-emerald-500 ring-emerald-500/30",
          status === "error" && "bg-rose-500 ring-rose-500/30",
        )}
      />
      {label ? (
        <span
          className={cn(
            "text-[10px] font-medium leading-none tracking-wide",
            status === "ready" && !indexing && "text-emerald-600 dark:text-emerald-400",
            status === "ready" && indexing && "text-sky-600 dark:text-sky-400",
            status === "loading" && "text-amber-600 dark:text-amber-400",
            status === "error" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {label}
        </span>
      ) : null}
      <span className="sr-only">
        {status === "loading"
          ? "Smart search loading"
          : status === "ready" && indexing
            ? "Smart search indexing"
            : status === "ready"
              ? "Smart search ready"
              : "Smart search error"}
      </span>
    </span>
  );
}

export const SmartSearchIndicator = memo(SmartSearchIndicatorComponent);
