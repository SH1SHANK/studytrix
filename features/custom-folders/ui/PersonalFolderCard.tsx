"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { IconStarFilled } from "@tabler/icons-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PersonalFolderMenu } from "@/features/custom-folders/ui/PersonalFolderMenu";
import type { CustomFolder } from "@/features/custom-folders/custom-folders.types";
import { getTagChipStyle } from "@/features/tags/tag.filter";

type PersonalFolderTagPreview = {
  id: string;
  name: string;
  color: string;
};

type PersonalFolderCardProps = {
  folder: CustomFolder;
  starred?: boolean;
  tags?: PersonalFolderTagPreview[];
  onOpen: () => void;
  onRename: (label: string) => void;
  onRefresh: () => Promise<void> | void;
  onNewSubfolder?: () => void;
  onAddFiles?: () => void;
  onRemove: () => void;
  onEdit: () => void;
  errorState?: boolean;
  healthBadge?: ReactNode;
  iconLayoutId?: string;
};

export function PersonalFolderCard({
  folder,
  starred = false,
  tags = [],
  onOpen,
  onRename,
  onRefresh,
  onNewSubfolder,
  onAddFiles,
  onRemove,
  onEdit,
  errorState = false,
  healthBadge = null,
  iconLayoutId,
}: PersonalFolderCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(folder.label);
  const [refreshing, setRefreshing] = useState(false);

  const itemCountLabel = `${folder.fileCount} files · ${folder.folderCount} folders`;
  const visibleTags = tags.slice(0, 2);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const folderTone = folder.colour?.trim() || "hsl(var(--primary))";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isRenaming) {
          return;
        }
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target || isRenaming) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group relative min-h-[120px] cursor-pointer rounded-xl py-0 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
      style={{
        borderColor: `color-mix(in oklab, ${folderTone} 28%, var(--border))`,
        backgroundColor: `color-mix(in oklab, ${folderTone} 14%, var(--card))`,
        borderLeftColor: errorState ? "color-mix(in oklab, hsl(0 78% 53%) 55%, var(--border))" : undefined,
        borderLeftWidth: errorState ? "3px" : undefined,
      }}
    >
      <div className="absolute right-3 top-3 z-20 opacity-100">
        <PersonalFolderMenu
          entityId={folder.id}
          folderLabel={folder.label}
          itemCountLabel={itemCountLabel}
          sourceKind={folder.sourceKind}
          refreshing={refreshing}
          onRename={() => {
            setRenameDraft(folder.label);
            setIsRenaming(true);
          }}
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
          onNewSubfolder={onNewSubfolder}
          onAddFiles={onAddFiles}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>

      <CardContent className="flex min-h-[120px] flex-col justify-between space-y-2 p-5 pr-14">
        <motion.div
          layoutId={iconLayoutId}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card shadow-inner"
          style={{
            color: `color-mix(in oklab, ${folderTone} 72%, var(--foreground))`,
            backgroundColor: `color-mix(in oklab, ${folderTone} 12%, var(--card))`,
            boxShadow: `0 0 0 1px color-mix(in oklab, ${folderTone} 22%, transparent)`,
          }}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V7z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        <div className="space-y-1">
          {isRenaming ? (
            <Input
              value={renameDraft}
              maxLength={40}
              className="h-7 text-sm"
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setRenameDraft(event.target.value)}
              onBlur={() => {
                const next = renameDraft.trim();
                if (next && next !== folder.label) {
                  onRename(next);
                }
                setIsRenaming(false);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  const next = renameDraft.trim();
                  if (next && next !== folder.label) {
                    onRename(next);
                  }
                  setIsRenaming(false);
                }
                if (event.key === "Escape") {
                  setRenameDraft(folder.label);
                  setIsRenaming(false);
                }
              }}
            />
          ) : (
            <h3 className="line-clamp-2 text-base font-medium text-foreground">{folder.label}</h3>
          )}

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
          <p className="text-sm text-muted-foreground">{itemCountLabel}</p>
          {healthBadge ? (
            <div className="pt-1">{healthBadge}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
