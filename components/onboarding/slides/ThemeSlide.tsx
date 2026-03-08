"use client";

import { useEffect, useState } from "react";
import { IconFile, IconFolder, IconSearch } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { SkeletonCard } from "@/components/onboarding/shared/SkeletonCard";
import { SkeletonRow } from "@/components/onboarding/shared/SkeletonRow";
import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";
import { THEMES, type ThemeId } from "@/features/theme/theme.constants";
import { IconPalette } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const PREVIEW_FOLDERS = [
  { id: "1", name: "Computer Networks", count: 24 },
  { id: "2", name: "Signals & Systems", count: 18 },
  { id: "3", name: "DBMS", count: 31 },
  { id: "4", name: "Operating Systems", count: 22 },
] as const;

type ThemeSlideProps = {
  ready: boolean;
  selectedTheme: ThemeId;
  onThemeSelected: (themeId: ThemeId) => void;
};

export function ThemeSlide({ ready, selectedTheme, onThemeSelected }: ThemeSlideProps) {
  const [previewTheme, setPreviewTheme] = useState<ThemeId>(selectedTheme);
  const [previewBusy, setPreviewBusy] = useState(true);

  useEffect(() => {
    setPreviewTheme(selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    setPreviewBusy(true);
    const timeoutId = window.setTimeout(() => {
      setPreviewBusy(false);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [previewTheme]);

  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-5 py-4">
        <motion.p
          variants={slideItemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Theme Selection
        </motion.p>

        <motion.div variants={slideItemVariants}>
          <AnimatedSlideIcon start={ready} className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
            <IconPalette className="size-7" />
          </AnimatedSlideIcon>
        </motion.div>

        <motion.h2
          variants={slideItemVariants}
          className="font-heading text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-tight tracking-tight text-foreground"
        >
          <WordReveal text="Choose your workspace tone" start={ready} />
        </motion.h2>

        <motion.p variants={slideItemVariants} className="max-w-2xl text-sm text-muted-foreground">
          Preview updates here only. Your selected theme is applied across dashboard, dialogs, and repository views after onboarding.
        </motion.p>

        <motion.section variants={slideItemVariants} className="rounded-3xl border border-border/70 bg-card/70 p-3.5 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live Preview</p>
            <p className="text-xs text-muted-foreground">{previewTheme}</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background p-2">
            <div className="relative min-h-[180px]">
              <motion.div
                data-theme={previewTheme}
                className="theme-scope pointer-events-none"
                animate={{ opacity: previewBusy ? 0.6 : 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div
                  className="mx-auto w-full max-w-[420px]"
                  style={{ transform: "scale(0.72)", transformOrigin: "top center" }}
                >
                  <motion.div
                    initial={false}
                    animate={{ opacity: previewBusy ? 0 : 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="mb-3 grid grid-cols-2 gap-2.5">
                      {PREVIEW_FOLDERS.map((folder) => (
                        <div key={folder.id} className="rounded-xl border border-border bg-card p-3">
                          <IconFolder className="mb-2 size-5 text-primary" />
                          <p className="line-clamp-1 text-sm font-medium text-foreground">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">{folder.count} files</p>
                        </div>
                      ))}
                    </div>

                    <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
                      <IconFile className="size-[18px] text-primary" />
                      <div>
                        <p className="line-clamp-1 text-sm font-medium text-foreground">Unit 3 - Signals &amp; Systems.pdf</p>
                        <p className="text-xs text-muted-foreground">2.4 MB · PDF</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2">
                      <IconSearch className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Search folders, files and actions</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                animate={{ opacity: previewBusy ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 p-2"
                style={{ pointerEvents: "none" }}
              >
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <SkeletonCard key={`preview-skeleton-card-${index}`} />
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <SkeletonRow />
                  <div className="onboarding-skeleton h-10 rounded-xl" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={slideItemVariants} className="rounded-3xl border border-border/70 bg-card/70 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <p className="text-muted-foreground">Tap to preview and choose.</p>
            <p className="font-medium text-foreground">Current: {THEMES.find((theme) => theme.id === selectedTheme)?.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {THEMES.map((themeOption) => {
              const isSelected = selectedTheme === themeOption.id;
              return (
                <button
                  key={themeOption.id}
                  type="button"
                  onClick={() => {
                    setPreviewTheme(themeOption.id);
                    onThemeSelected(themeOption.id);
                  }}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background/60 text-foreground hover:border-primary/50",
                  )}
                >
                  <p className="truncate text-sm font-medium">{themeOption.label}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="size-3 rounded-full border border-border/60" style={{ backgroundColor: themeOption.preview.primary }} />
                    <span className="size-3 rounded-full border border-border/60" style={{ backgroundColor: themeOption.preview.background }} />
                    <span className="size-3 rounded-full border border-border/60" style={{ backgroundColor: themeOption.preview.accent }} />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.section>
      </div>
    </SlideContainer>
  );
}
