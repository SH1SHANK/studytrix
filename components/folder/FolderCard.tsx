import { IconFolder } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { FolderActionsMenu } from "@/components/folder/FolderActionsMenu";

type FolderColor = "indigo" | "emerald" | "amber" | "sky" | "rose" | "stone";

type FolderCardProps = {
  title: string;
  meta: string;
  variant?: "default" | "accent";
  color?: FolderColor;
  onOpen?: () => void;
};

const noop = () => {};

/* Subtle per-card tint backgrounds */
const cardTintMap: Record<FolderColor, string> = {
  indigo:
    "bg-indigo-50/60 border-indigo-200/40 dark:bg-indigo-950/20 dark:border-indigo-800/40",
  emerald:
    "bg-emerald-50/60 border-emerald-200/40 dark:bg-emerald-950/20 dark:border-emerald-800/40",
  amber:
    "bg-amber-50/60 border-amber-200/40 dark:bg-amber-950/20 dark:border-amber-800/40",
  sky: "bg-sky-50/60 border-sky-200/40 dark:bg-sky-950/20 dark:border-sky-800/40",
  rose: "bg-rose-50/60 border-rose-200/40 dark:bg-rose-950/20 dark:border-rose-800/40",
  stone: "bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-800",
};

/* Accent (highlighted) card uses subtle gradient tint */
const accentTintMap: Record<FolderColor, string> = {
  indigo:
    "bg-linear-to-br from-indigo-100/60 to-stone-100 border-indigo-200/50 dark:from-indigo-900/30 dark:to-stone-900 dark:border-indigo-800/50",
  emerald:
    "bg-linear-to-br from-emerald-100/60 to-stone-100 border-emerald-200/50 dark:from-emerald-900/30 dark:to-stone-900 dark:border-emerald-800/50",
  amber:
    "bg-linear-to-br from-amber-100/60 to-stone-100 border-amber-200/50 dark:from-amber-900/30 dark:to-stone-900 dark:border-amber-800/50",
  sky: "bg-linear-to-br from-sky-100/60 to-stone-100 border-sky-200/50 dark:from-sky-900/30 dark:to-stone-900 dark:border-sky-800/50",
  rose: "bg-linear-to-br from-rose-100/60 to-stone-100 border-rose-200/50 dark:from-rose-900/30 dark:to-stone-900 dark:border-rose-800/50",
  stone:
    "bg-linear-to-br from-stone-100/60 to-stone-50 border-stone-200 dark:from-stone-800/60 dark:to-stone-900 dark:border-stone-800",
};

/* Icon container color hints */
const iconTintMap: Record<FolderColor, string> = {
  indigo: "text-indigo-600 dark:text-indigo-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-600 dark:text-sky-400",
  rose: "text-rose-600 dark:text-rose-400",
  stone: "text-indigo-600 dark:text-indigo-400",
};

/* Active icon glow ring */
const iconGlowMap: Record<FolderColor, string> = {
  indigo: "ring-1 ring-indigo-400/30",
  emerald: "ring-1 ring-emerald-400/30",
  amber: "ring-1 ring-amber-400/30",
  sky: "ring-1 ring-sky-400/30",
  rose: "ring-1 ring-rose-400/30",
  stone: "",
};

export function FolderCard({
  title,
  meta,
  variant = "default",
  color = "stone",
  onOpen = noop,
}: FolderCardProps) {
  const isAccent = variant === "accent";

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
        "group relative min-h-[110px] cursor-pointer py-0 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
        isAccent ? accentTintMap[color] : cardTintMap[color],
      )}
    >
      <div className="absolute right-3 top-3 z-20">
        <FolderActionsMenu triggerClassName="size-11" />
      </div>

      <CardContent className="flex min-h-[110px] flex-col justify-between space-y-2 p-5 pr-14">
        {/* Upgraded icon container: inner shadow, border, glow on accent */}
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white shadow-inner transition-all duration-200 dark:border-stone-700 dark:bg-stone-800",
            iconTintMap[color],
            isAccent && iconGlowMap[color],
          )}
        >
          <IconFolder className="size-5" />
        </div>

        <div className="space-y-1">
          <h3 className="line-clamp-1 text-base font-medium text-stone-900 dark:text-stone-100">
            {title}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">{meta}</p>
        </div>
      </CardContent>
    </Card>
  );
}
