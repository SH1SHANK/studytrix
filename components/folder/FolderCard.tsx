import { IconFolder } from "@tabler/icons-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { FolderActionsMenu } from "@/components/folder/FolderActionsMenu";

type FolderColor = "indigo" | "emerald" | "amber" | "sky" | "rose" | "stone";

type FolderCardProps = {
  entityId: string;
  title: string;
  meta: string;
  variant?: "default" | "accent";
  color?: FolderColor;
  onOpen?: () => void;
};

const noop = () => {};

const folderAccentVarMap: Record<FolderColor, string> = {
  indigo: "var(--chart-4)",
  emerald: "var(--chart-3)",
  amber: "var(--chart-2)",
  sky: "var(--chart-1)",
  rose: "var(--chart-5)",
  stone: "var(--primary)",
};

function buildCardStyle(color: FolderColor, isAccent: boolean): CSSProperties {
  const accentColor = folderAccentVarMap[color];

  return isAccent
    ? {
        borderColor: `color-mix(in oklab, ${accentColor} 35%, var(--border))`,
        background: `linear-gradient(135deg, color-mix(in oklab, ${accentColor} 22%, var(--card)) 0%, color-mix(in oklab, ${accentColor} 10%, var(--card)) 100%)`,
      }
    : {
        borderColor: `color-mix(in oklab, ${accentColor} 28%, var(--border))`,
        backgroundColor: `color-mix(in oklab, ${accentColor} 14%, var(--card))`,
      };
}

function buildIconStyle(color: FolderColor, isAccent: boolean): CSSProperties {
  const accentColor = folderAccentVarMap[color];
  return {
    color: accentColor,
    backgroundColor: `color-mix(in oklab, ${accentColor} 12%, var(--card))`,
    boxShadow: isAccent
      ? `0 0 0 1px color-mix(in oklab, ${accentColor} 30%, transparent)`
      : undefined,
  };
}

export function FolderCard({
  entityId,
  title,
  meta,
  variant = "default",
  color = "stone",
  onOpen = noop,
}: FolderCardProps) {
  const isAccent = variant === "accent";
  const cardStyle = buildCardStyle(color, isAccent);
  const iconStyle = buildIconStyle(color, isAccent);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        "group relative min-h-[120px] cursor-pointer rounded-xl py-0 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
      )}
      style={cardStyle}
    >
      <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <FolderActionsMenu
          entityId={entityId}
          title={title}
          description={meta}
          triggerClassName="size-9"
          onOpen={onOpen}
        />
      </div>

      <CardContent className="flex min-h-[120px] flex-col justify-between space-y-2 p-5 pr-14">
        {/* Upgraded icon container: inner shadow, border, glow on accent */}
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card shadow-inner transition-all duration-200",
          )}
          style={iconStyle}
        >
          <IconFolder className="size-5" />
        </div>

        <div className="space-y-1">
          <h3 className="line-clamp-2 text-base font-medium text-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
      </CardContent>
    </Card>
  );
}
