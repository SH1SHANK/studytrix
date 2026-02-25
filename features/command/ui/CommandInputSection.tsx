"use client";

import type { ComponentType, RefObject } from "react";
import { IconBolt, IconClockHour4, IconDatabase, IconFolder, IconTag, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CommandInput } from "@/components/ui/command";
import type { PrefixMode } from "@/features/command/command.prefix";
import { ScopeChip } from "@/features/command/ui/ScopeChip";
import type { SearchScope as NavigationSearchScope } from "@/features/intelligence/intelligence.types";
import { IntelligenceStatusBox } from "@/features/intelligence/ui/IntelligenceStatusBox";
import { SemanticSearchToggleRow } from "@/features/intelligence/ui/SemanticSearchToggleRow";
import { cn } from "@/lib/utils";

type ScopePill = {
  key: string;
  label: string;
  icon: "folder" | "tag" | "domain" | "mode";
  onRemove: () => void;
};

type StickyModeDescriptor = {
  label: string;
  prefix: "/" | "#" | ":" | ">" | "@";
  icon: ComponentType<{ className?: string }>;
} | null;

type CommandInputSectionProps = {
  spring: { stiffness: number; damping: number; mass: number };
  effectiveVisualQuery: string;
  inputCenterOffset: number;
  scopePills: ScopePill[];
  stickyModeDescriptor: StickyModeDescriptor;
  stickyPrefixMode: PrefixMode | null;
  query: string;
  commandInputPlaceholder: string;
  placeholderContainerRef: RefObject<HTMLDivElement | null>;
  placeholderMeasureRef: RefObject<HTMLSpanElement | null>;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  activeNavigationScope: NavigationSearchScope;
  isCompactScopeChip: boolean;
  onResetNavigationScope: (repoKind: "global" | "personal") => void;
  onCollapseNavigationScope: (next: {
    folderId: string;
    folderName: string;
    repoKind: "global" | "personal";
    breadcrumb: Array<{ folderId: string; folderName: string }>;
  }) => void;
};

export function CommandInputSection({
  spring,
  effectiveVisualQuery,
  inputCenterOffset,
  scopePills,
  stickyModeDescriptor,
  stickyPrefixMode,
  query,
  commandInputPlaceholder,
  placeholderContainerRef,
  placeholderMeasureRef,
  onQueryChange,
  onClearQuery,
  activeNavigationScope,
  isCompactScopeChip,
  onResetNavigationScope,
  onCollapseNavigationScope,
}: CommandInputSectionProps) {
  return (
    <>
      <motion.div
        initial={false}
        animate={{
          scale: effectiveVisualQuery ? 1.02 : 1,
          marginTop: inputCenterOffset,
        }}
        transition={{ type: "spring", ...spring }}
        className="relative mx-auto w-full max-w-2xl"
      >
        {scopePills.length > 0 || (stickyModeDescriptor && stickyPrefixMode !== "folders") ? (
          <div className="px-1 pb-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {stickyModeDescriptor && stickyPrefixMode !== "folders" ? (() => {
                const StickyIcon = stickyModeDescriptor.icon;
                return (
                  <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <StickyIcon className="size-3.5 shrink-0" />
                    <span>{stickyModeDescriptor.label}</span>
                    <span className="rounded border border-primary/25 bg-primary/10 px-1 py-px text-[9px]">
                      {stickyModeDescriptor.prefix}
                    </span>
                  </div>
                );
              })() : null}
              <AnimatePresence mode="popLayout">
                {scopePills.map((pill) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
                    key={pill.key}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary shadow-xs transition-colors hover:bg-primary/15 hover:border-primary/40"
                  >
                    {pill.icon === "folder" ? (
                      <IconFolder className="size-3.5 shrink-0" />
                    ) : pill.icon === "tag" ? (
                      <IconTag className="size-3.5 shrink-0" />
                    ) : pill.icon === "domain" ? (
                      <IconDatabase className="size-3.5 shrink-0" />
                    ) : pill.label === "Actions" ? (
                      <IconBolt className="size-3.5 shrink-0" />
                    ) : (
                      <IconClockHour4 className="size-3.5 shrink-0" />
                    )}
                    <span className="max-w-24 truncate">{pill.label}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-0.5 opacity-60 transition-all hover:bg-primary/20 hover:text-primary hover:opacity-100"
                      onClick={pill.onRemove}
                      aria-label={`Remove ${pill.label} scope`}
                    >
                      <IconX className="size-3.5 shrink-0" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
        <div ref={placeholderContainerRef} className="relative">
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder={commandInputPlaceholder}
            autoFocus
            className={cn(
              "pr-1 text-[14px] leading-5 placeholder:text-transparent [&::placeholder]:overflow-hidden [&::placeholder]:text-ellipsis [&::placeholder]:whitespace-nowrap",
            )}
            endAction={(
              <div className="relative flex items-center gap-0.5">
                {effectiveVisualQuery ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 rounded-md"
                    onClick={onClearQuery}
                  >
                    <IconX className="size-3.5" />
                    <span className="sr-only">Clear query</span>
                  </Button>
                ) : null}
              </div>
            )}
          />
          {query.trim().length === 0 ? (
            <div className="pointer-events-none absolute inset-y-0 left-12 right-[52px] flex items-center">
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={commandInputPlaceholder}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="truncate text-[14px] text-muted-foreground"
                >
                  {commandInputPlaceholder}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
          <span
            ref={placeholderMeasureRef}
            className="pointer-events-none absolute -z-10 opacity-0 whitespace-nowrap text-[14px] leading-5"
            aria-hidden="true"
          />
        </div>
        <ScopeChip
          scope={activeNavigationScope}
          compact={isCompactScopeChip}
          onResetRoot={onResetNavigationScope}
          onCollapseToFolder={onCollapseNavigationScope}
        />
      </motion.div>

      <IntelligenceStatusBox />
      <SemanticSearchToggleRow />
    </>
  );
}
