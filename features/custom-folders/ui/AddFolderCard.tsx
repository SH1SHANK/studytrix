"use client";

import { IconFolderPlus } from "@tabler/icons-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AddFolderCardProps = {
  onClick: () => void;
};

export function AddFolderCard({ onClick }: AddFolderCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label="Add a Google Drive folder to Personal Repository"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative min-h-[120px] cursor-pointer rounded-xl border-2 border-dotted py-0 transition-all duration-200",
        "border-[color-mix(in_oklab,var(--border)_60%,transparent)] bg-card/55 hover:border-primary/60",
      )}
    >
      <CardContent className="relative flex min-h-[120px] flex-col items-center justify-center gap-1.5 overflow-visible p-5">
        <IconFolderPlus className="size-10 text-muted-foreground/80 transition-colors duration-200 group-hover:text-primary" />

        <span className="text-sm font-medium text-muted-foreground">
          Add Folder
        </span>
      </CardContent>
    </Card>
  );
}
