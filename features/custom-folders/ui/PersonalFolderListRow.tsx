"use client";

import { useState } from "react";
import { IconFolder, IconStarFilled } from "@tabler/icons-react";

import { PersonalFolderMenu } from "@/features/custom-folders/ui/PersonalFolderMenu";
import { cn } from "@/lib/utils";
import { getTagChipStyle } from "@/features/tags/tag.filter";

type PersonalFolderListRowTag = {
  id: string;
  name: string;
  color: string;
};

type PersonalFolderListRowProps = {
  entityId: string;
  title: string;
  meta: string;
  folderColor: string;
  starred?: boolean;
  tags?: PersonalFolderListRowTag[];
  onOpen: () => void;
  onRename: () => void;
  onRefresh: () => Promise<void> | void;
  onEdit: () => void;
  onRemove: () => void;
};

export function PersonalFolderListRow({
  entityId,
  title,
  meta,
  folderColor,
  starred = false,
  tags = [],
  onOpen,
  onRename,
  onRefresh,
  onEdit,
  onRemove,
}: PersonalFolderListRowProps) {
  const [refreshing, setRefreshing] = useState(false);
  const visibleTags = tags.slice(0, 2);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const folderTone = folderColor?.trim() || "hsl(var(--primary))";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card shadow-inner"
        style={{
          color: `color-mix(in oklab, ${folderTone} 72%, var(--foreground))`,
          backgroundColor: `color-mix(in oklab, ${folderTone} 12%, var(--card))`,
          boxShadow: `0 0 0 1px color-mix(in oklab, ${folderTone} 22%, transparent)`,
        }}
      >
        <IconFolder className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
        {starred || visibleTags.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
      </div>

      <div
        className={cn(
          "shrink-0 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <PersonalFolderMenu
          entityId={entityId}
          folderLabel={title}
          itemCountLabel={meta}
          refreshing={refreshing}
          onRename={onRename}
          onRefresh={async () => {
            if (refreshing) {
              return;
            }
            setRefreshing(true);
            try {
              await onRefresh();
            } finally {
              setRefreshing(false);
            }
          }}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
