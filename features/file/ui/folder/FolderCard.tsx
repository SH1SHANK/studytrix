import { IconFolder, IconStarFilled } from "@tabler/icons-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { FolderActionsMenu } from "@/features/file/ui/folder/FolderActionsMenu";
import { getTagChipStyle } from "@/features/tags/tag.filter";

type FolderColor = "indigo" | "emerald" | "amber" | "sky" | "rose" | "stone";

type FolderCardProps = {
  entityId: string;
  title: string;
  meta: string;
  variant?: "default" | "accent";
  color?: FolderColor;
  starred?: boolean;
  tags?: Array<{ id: string; name: string; color: string }>;
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
  starred = false,
  tags = [],
  onOpen = noop,
}: FolderCardProps) {
  const isAccent = variant === "accent";
  const cardStyle = buildCardStyle(color, isAccent);
  const iconStyle = buildIconStyle(color, isAccent);
  const visibleTags = tags.slice(0, 2);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);

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
        "group relative min-h-[120px] cursor-pointer rounded-xl py-0 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2",
        "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
      )}
      style={cardStyle}
    >
      <div className="absolute right-3 top-3 z-20 opacity-100">
        <FolderActionsMenu
          entityId={entityId}
          title={title}
          description={meta}
          triggerClassName="size-9"
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
          {starred || visibleTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {starred ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-full border border-amber-300/70 bg-amber-100/70 px-2 text-[10px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
                  <IconStarFilled className="size-3" />
                  Starred
                </span>
              ) : null}
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium"
                  style={getTagChipStyle(tag.color)}
                >
                  {tag.name}
                </span>
              ))}
              {hiddenTagCount > 0 ? (
                <span className="inline-flex h-5 items-center rounded-full border border-border/80 bg-muted/60 px-2 text-[10px] font-medium text-muted-foreground">
                  +{hiddenTagCount}
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
      </CardContent>
    </Card>
  );
}
