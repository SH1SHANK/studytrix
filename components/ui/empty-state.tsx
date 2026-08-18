"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/80 bg-card/40 transition-all",
        compact ? "p-6" : "p-10 sm:p-12",
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
        <Icon className="size-5" />
      </div>

      <h3 className="text-sm font-semibold text-foreground tracking-tight max-w-sm">
        {title}
      </h3>

      <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed text-balance">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && (
            <Button
              type="button"
              variant={primaryAction.variant || "default"}
              size="sm"
              onClick={primaryAction.onClick}
              className="h-8 px-3.5 text-xs gap-1.5 font-medium shadow-xs"
            >
              {primaryAction.icon && <primaryAction.icon className="size-3.5" />}
              {primaryAction.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              type="button"
              variant={secondaryAction.variant || "outline"}
              size="sm"
              onClick={secondaryAction.onClick}
              className="h-8 px-3.5 text-xs gap-1.5 font-medium"
            >
              {secondaryAction.icon && <secondaryAction.icon className="size-3.5" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
