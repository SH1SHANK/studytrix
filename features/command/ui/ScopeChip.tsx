"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Folder, FolderHeart, X } from "lucide-react";

import type { SearchScope } from "@/features/intelligence/intelligence.types";
import { cn } from "@/lib/utils";

type Segment = {
  key: string;
  label: string;
  removable: boolean;
  onRemove?: () => void;
};

type ScopeChipProps = {
  scope: SearchScope;
  compact: boolean;
  onResetRoot: (repoKind: "global" | "personal") => void;
  onCollapseToFolder: (next: {
    folderId: string;
    folderName: string;
    repoKind: "global" | "personal";
    breadcrumb: Array<{ folderId: string; folderName: string }>;
  }) => void;
};

function buildFolderSegments(
  scope: Extract<SearchScope, { kind: "folder" }>,
  onResetRoot: ScopeChipProps["onResetRoot"],
  onCollapseToFolder: ScopeChipProps["onCollapseToFolder"],
): Segment[] {
  const segments: Segment[] = [];

  segments.push({
    key: "root",
    label: scope.repoKind === "personal" ? "Personal" : "Global",
    removable: false,
  });

  scope.breadcrumb.forEach((entry) => {
    segments.push({
      key: `crumb-${entry.folderId}`,
      label: entry.folderName,
      removable: false,
    });
  });

  segments.push({
    key: "current",
    label: scope.folderName,
    removable: true,
    onRemove: () => {
      const parent = scope.breadcrumb[scope.breadcrumb.length - 1];
      if (!parent) {
        onResetRoot(scope.repoKind);
        return;
      }

      onCollapseToFolder({
        folderId: parent.folderId,
        folderName: parent.folderName,
        repoKind: scope.repoKind,
        breadcrumb: scope.breadcrumb.slice(0, -1),
      });
    },
  });

  return segments;
}

function compactSegments(segments: Segment[]): Segment[] {
  if (segments.length <= 3) {
    return segments;
  }

  const root = segments[0];
  const current = segments[segments.length - 1];
  const parent = segments[segments.length - 2];

  return [
    root,
    {
      key: "ellipsis",
      label: "...",
      removable: false,
    },
    parent,
    current,
  ];
}

export function ScopeChip({
  scope,
  compact,
  onResetRoot,
  onCollapseToFolder,
}: ScopeChipProps) {
  const isVisible = scope.kind !== "global-root";

  const segments: Segment[] = scope.kind === "folder"
    ? buildFolderSegments(scope, onResetRoot, onCollapseToFolder)
    : [];

  const renderSegments = compact ? compactSegments(segments) : segments;

  return (
    <AnimatePresence initial={false}>
      {isVisible ? (
        <motion.div
          key="scope-chip"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="overflow-hidden px-1 pt-2"
        >
          {scope.kind === "personal-root" ? (
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
              <FolderHeart className="size-3.5 shrink-0" />
              <span className="truncate">Personal Repository</span>
            </div>
          ) : (
            <div className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar">
              {renderSegments.map((segment, index) => (
                <div key={segment.key} className="inline-flex items-center gap-1 shrink-0">
                  {index > 0 ? (
                    <span className="text-[10px] text-muted-foreground">&gt;</span>
                  ) : null}
                  {(() => {
                    const isCurrent = segment.key === "current";
                    const isRoot = segment.key === "root";

                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
                          isCurrent
                            ? "border-primary/30 bg-primary/12 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                            : segment.removable
                              ? "border-border/70 bg-muted/45 text-foreground"
                              : "border-border/70 bg-muted/30 text-muted-foreground",
                        )}
                      >
                        {isRoot ? (
                          scope.repoKind === "personal"
                            ? <FolderHeart className="size-3.5 shrink-0" />
                            : <Folder className="size-3.5 shrink-0" />
                        ) : null}
                        <span className="max-w-32 truncate">{segment.label}</span>
                        {segment.removable && segment.onRemove ? (
                          <button
                            type="button"
                            onClick={segment.onRemove}
                            className={cn(
                              "inline-flex size-3.5 items-center justify-center rounded-full",
                              isCurrent ? "hover:bg-primary/15" : "hover:bg-muted/70",
                            )}
                            aria-label={`Remove ${segment.label} scope`}
                          >
                            <X className="size-3" />
                          </button>
                        ) : null}
                      </span>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
