"use client";

import type { ReactNode } from "react";
import { IconChevronRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

interface SettingRowShellProps {
  label: string;
  description?: ReactNode;
  requiresRestart?: boolean;
  trailing?: ReactNode;
  children?: ReactNode;
  tone?: "default" | "danger";
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function SettingRowShell({
  label,
  description,
  requiresRestart = false,
  trailing,
  children,
  tone = "default",
  icon,
  onClick,
  disabled,
}: SettingRowShellProps) {
  const isDanger = tone === "danger";

  const Component = onClick ? "button" : "div";
  const interactiveProps = onClick
    ? {
        type: "button" as const,
        onClick,
        disabled,
        className: cn(
          "w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
          disabled && "opacity-50 cursor-not-allowed",
        ),
      }
    : {};

  return (
    <Component
      {...interactiveProps}
      className={cn(
        "group flex w-full flex-row items-center justify-between gap-4 py-3 pl-3 pr-4 transition-colors relative",
        "bg-card hover:bg-muted/50 sm:bg-transparent sm:hover:bg-muted/50",
        "border-b border-border/50 last:border-0",
        isDanger && "bg-rose-50/30 hover:bg-rose-50/50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30",
        onClick && !disabled && "active:bg-muted/70 sm:active:bg-muted/70",
        interactiveProps.className
      )}
    >
      <div className="flex flex-row items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/50 text-muted-foreground group-hover:bg-accent group-hover:text-foreground transition-colors">
            {icon}
          </div>
        )}
        <div className="flex flex-col min-w-0 space-y-0.5">
          <h3
            className={cn(
              "text-[15px] leading-tight font-normal text-foreground",
              isDanger && "text-rose-700 dark:text-rose-300",
            )}
          >
            {label}
          </h3>
          {description ? (
            <p className="text-[13px] leading-snug text-muted-foreground line-clamp-1">
              {description}
            </p>
          ) : null}
          {requiresRestart ? (
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              Requires restart
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 w-auto">
        {children ? <div className="flex-none">{children}</div> : null}
        {trailing ? (
          <div className="shrink-0 text-[15px] font-normal text-muted-foreground flex items-center gap-2">
            {trailing}
          </div>
        ) : (
          <IconChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
        )}
      </div>
    </Component>
  );
}
