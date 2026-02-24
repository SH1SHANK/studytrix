"use client";

import type { RefObject } from "react";
import { IconDatabase, IconFolder, IconSearch, IconTag } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CommandGroup as EngineCommandGroup,
  CommandItem as EngineCommandItem,
} from "@/features/command/command.types";
import { CrossRepoSection } from "@/features/command/ui/CrossRepoSection";
import { HighlightedText } from "@/features/command/ui/HighlightedText";
import {
  getCommandIcon,
  getCommandIconTone,
  getContentBadge,
  GROUP_META,
  staggerContainer,
  type ScopeSelectorMode,
} from "@/features/command/ui/command-bar.helpers";
import type {
  IntelligenceSearchHit,
  SearchScope as NavigationSearchScope,
} from "@/features/intelligence/intelligence.types";
import { cn } from "@/lib/utils";

type CommandResultsListProps = {
  listRef: RefObject<HTMLDivElement | null>;
  activeItemRef: RefObject<HTMLDivElement | null>;
  listBottomInset: number;
  showLoadingSkeleton: boolean;
  showingFallbackResults: boolean;
  scopeSelectorMode: ScopeSelectorMode | null;
  effectiveVisualQuery: string;
  hasAnyScope: boolean;
  activeScopeLabel: string;
  activeNavigationScope: NavigationSearchScope;
  onExpandToGlobal: () => void;
  crossRepoAbovePrimary: boolean;
  crossRepoSemanticHits: IntelligenceSearchHit[];
  onCrossRepoHitSelect: (hit: IntelligenceSearchHit) => void;
  resolveCrossRepoSubtitle: (hit: IntelligenceSearchHit) => string;
  groupedResults: Array<{ group: EngineCommandGroup; items: EngineCommandItem[] }>;
  activeIndex: number;
  onSetActiveIndex: (index: number) => void;
  onItemSelect: (item: EngineCommandItem) => void;
  semanticEnterOrder: Map<string, number>;
  motionScale: number;
  isMobilePalette: boolean;
  offlineFiles: Record<string, unknown>;
  debugCommandScoring: boolean;
  displayIndexById: ReadonlyMap<string, number>;
};

export function CommandResultsList({
  listRef,
  activeItemRef,
  listBottomInset,
  showLoadingSkeleton,
  showingFallbackResults,
  scopeSelectorMode,
  effectiveVisualQuery,
  hasAnyScope,
  activeScopeLabel,
  activeNavigationScope,
  onExpandToGlobal,
  crossRepoAbovePrimary,
  crossRepoSemanticHits,
  onCrossRepoHitSelect,
  resolveCrossRepoSubtitle,
  groupedResults,
  activeIndex,
  onSetActiveIndex,
  onItemSelect,
  semanticEnterOrder,
  motionScale,
  isMobilePalette,
  offlineFiles,
  debugCommandScoring,
  displayIndexById,
}: CommandResultsListProps) {
  return (
    <CommandList
      ref={listRef}
      className="min-h-0 h-full max-h-none flex-1 overflow-y-auto overscroll-y-contain [touch-action:pan-y] [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] rounded-lg border border-transparent p-1"
      style={{ paddingBottom: listBottomInset }}
    >
      {showLoadingSkeleton ? (
        <div className="space-y-2 px-1 py-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`command-skeleton-${index}`} className="space-y-1.5 rounded-lg border border-border/60 p-2 border-border/70">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {showingFallbackResults && !scopeSelectorMode ? (
            <div className="mx-1 mb-2 rounded-lg border border-border/70 bg-muted/70 px-3 py-2 text-[11px] text-muted-foreground">
              No exact matches. Showing top commands instead.
            </div>
          ) : null}
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <IconSearch className="size-4 text-muted-foreground/80" />
              <p className="text-xs font-medium text-muted-foreground">
                {scopeSelectorMode
                  ? `No ${scopeSelectorMode === "folders" ? "folders" : scopeSelectorMode === "tags" ? "tags" : "scope options"} for "${effectiveVisualQuery || "..."}"`
                  : hasAnyScope
                    ? `No files in ${activeScopeLabel} match "${effectiveVisualQuery || "..."}"`
                    : `No results for "${effectiveVisualQuery || "..."}"`}
              </p>
              {!scopeSelectorMode ? (
                <p className="text-[11px] text-muted-foreground">
                  Try: <span className="font-medium">settings</span>, <span className="font-medium">storage</span>, <span className="font-medium">tag</span>
                </p>
              ) : null}
              {!scopeSelectorMode && hasAnyScope ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full text-[11px]"
                  onClick={onExpandToGlobal}
                >
                  Expand to global search
                </Button>
              ) : null}
            </div>
          </CommandEmpty>

          {!scopeSelectorMode
          && activeNavigationScope.kind === "global-root"
          && crossRepoAbovePrimary
          && crossRepoSemanticHits.length > 0 ? (
            <CrossRepoSection
              results={crossRepoSemanticHits}
              query={effectiveVisualQuery}
              onSelect={onCrossRepoHitSelect}
              resolveSubtitle={resolveCrossRepoSubtitle}
            />
            ) : null}

          {groupedResults.map((group) => {
            const meta = scopeSelectorMode
              ? (() => {
                if (scopeSelectorMode === "folders") {
                  return {
                    label: "Folder Scope",
                    icon: IconFolder,
                    tone: "bg-primary/12",
                    iconTone: "text-primary",
                  };
                }
                if (scopeSelectorMode === "tags") {
                  return {
                    label: "Tag Scope",
                    icon: IconTag,
                    tone: "bg-primary/12",
                    iconTone: "text-primary",
                  };
                }
                return {
                  label: "Domain Scope",
                  icon: IconDatabase,
                  tone: "bg-primary/12",
                  iconTone: "text-primary",
                };
              })()
              : GROUP_META[group.group];
            const GroupIcon = meta.icon;

            return (
              <CommandGroup key={group.group}>
                <div className="mb-1 flex items-center justify-between px-2.5 pt-1 text-[11px] font-medium text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-md",
                        meta.tone,
                      )}
                    >
                      <GroupIcon className={cn("size-3.5", meta.iconTone)} />
                    </span>
                    <span>{meta.label}</span>
                  </div>
                  <span>{group.items.length}</span>
                </div>
                <motion.div
                  variants={staggerContainer}
                  initial={false}
                  animate="visible"
                >
                {group.items.map((item) => {
                  const ItemIcon = getCommandIcon(item);
                  const itemIconTone = getCommandIconTone(item);
                  const isSemanticOnly = item.payload?.semanticOnly === true;
                  const isOfflineFile =
                    item.group === "files"
                    && Boolean(item.entityId)
                    && (item.payload?.offlineOnly === true || Boolean(item.entityId && offlineFiles[item.entityId]));
                  const contentBadge = getContentBadge(item);
                  const flatIndex = displayIndexById.get(item.id) ?? -1;
                  const isActive = flatIndex === activeIndex;
                  const semanticEntryOrder = semanticEnterOrder.get(item.id) ?? -1;
                  const shouldAnimateSemanticEntry =
                    isSemanticOnly
                    && semanticEntryOrder >= 0
                    && motionScale > 0;
                  const isDocumentCard = item.group === "files" || item.group === "folders";
                  const showMetadataChips =
                    isOfflineFile
                    || Boolean(contentBadge)
                    || (debugCommandScoring && typeof item.score === "number");
                  const entityTypeLabel = isDocumentCard
                    ? item.group === "folders"
                      ? "Folder"
                      : "File"
                    : null;

                  return (
                    <motion.div
                      key={item.id}
                      initial={shouldAnimateSemanticEntry ? { opacity: 0, y: 4 } : false}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={shouldAnimateSemanticEntry
                        ? {
                          duration: 0.15,
                          ease: "easeOut",
                          delay: semanticEntryOrder * 0.04,
                        }
                        : { duration: 0.12, ease: "easeOut" }}
                      ref={isActive ? activeItemRef : undefined}
                      className="px-1 pb-1 last:pb-0"
                    >
                    <CommandItem
                      value={item.id}
                      className={cn(
                        isMobilePalette ? "min-h-[64px]" : "min-h-[58px]",
                        "rounded-xl border border-border/55 border-l-[3px] px-2.5 py-2 transition-all duration-150",
                        isSemanticOnly ? "border-l-primary/60" : "border-l-transparent",
                        isDocumentCard ? "items-start gap-3" : "items-center gap-2.5",
                        isActive
                          ? "bg-primary/10 ring-1 ring-ring/45"
                          : "bg-card/45 hover:bg-muted/35 data-[selected=true]:translate-x-0.5",
                      )}
                      onSelect={() => onItemSelect(item)}
                      onMouseEnter={() => {
                        if (flatIndex >= 0) {
                          onSetActiveIndex(flatIndex);
                        }
                      }}
                      data-active={isActive}
                    >
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/85">
                        <ItemIcon className={cn("size-3.5", itemIconTone)} />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className={cn("min-w-0 truncate font-medium", isDocumentCard ? "text-[12px] leading-snug" : "text-[11px]")}>
                            <HighlightedText
                              text={item.title}
                              query={effectiveVisualQuery}
                            />
                          </div>
                          {entityTypeLabel ? (
                            <span className="shrink-0 rounded-full border border-border/80 bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              {entityTypeLabel}
                            </span>
                          ) : null}
                        </div>
                        {item.subtitle ? (
                          <div className="truncate text-[10px] text-muted-foreground/90">
                            <HighlightedText
                              text={item.subtitle}
                              query={effectiveVisualQuery}
                            />
                          </div>
                        ) : null}

                        {showMetadataChips ? (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {isOfflineFile ? (
                              <span className="rounded-full border border-primary/35 bg-primary/12 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                Offline
                              </span>
                            ) : null}

                            {contentBadge ? (
                              <span className="shrink-0 rounded-full border border-border/80 bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {contentBadge}
                              </span>
                            ) : null}

                            {debugCommandScoring && typeof item.score === "number" ? (
                              <span className="shrink-0 rounded-full border border-primary/25 bg-primary/8 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                Score {Math.round(item.score)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                    </motion.div>
                  );
                })}
                </motion.div>
              </CommandGroup>
            );
          })}

          {!scopeSelectorMode
          && activeNavigationScope.kind === "global-root"
          && !crossRepoAbovePrimary
          && crossRepoSemanticHits.length > 0 ? (
            <CrossRepoSection
              results={crossRepoSemanticHits}
              query={effectiveVisualQuery}
              onSelect={onCrossRepoHitSelect}
              resolveSubtitle={resolveCrossRepoSubtitle}
            />
            ) : null}
        </>
      )}
    </CommandList>
  );
}
