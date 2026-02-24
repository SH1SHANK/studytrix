"use client";

import { useMemo } from "react";
import { IconPalette } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

import { PressableButton } from "@/features/onboarding/ui/PressableButton";
import { ThemeGrid } from "@/features/theme/ui/ThemeGrid";
import {
  DEFAULT_THEME_ID,
  type ThemeId,
  THEMES,
} from "@/features/theme/theme.constants";

type ThemeSelectionStepProps = {
  onBack: () => void;
  onContinue: () => void;
  onThemeSelected: (themeId: ThemeId) => void;
};

export function ThemeSelectionStep({
  onBack,
  onContinue,
  onThemeSelected,
}: ThemeSelectionStepProps) {
  const shouldReduceMotion = useReducedMotion();
  const { theme, setTheme } = useTheme();

  const currentTheme = useMemo(() => {
    if (THEMES.some((themeOption) => themeOption.id === theme)) {
      return theme as ThemeId;
    }

    return DEFAULT_THEME_ID;
  }, [theme]);
  const currentThemeMeta = useMemo(
    () => THEMES.find((themeOption) => themeOption.id === currentTheme) ?? THEMES[0],
    [currentTheme],
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--foreground)/0.08),transparent_45%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.08 : 0.28 }}
      />

      <div className="flex flex-1 items-end px-0 pb-0">
        <motion.section
          initial={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 0, y: 160, scale: 0.97 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 140, scale: 0.98 }
          }
          transition={{
            type: shouldReduceMotion ? "tween" : "spring",
            stiffness: 320,
            damping: 34,
            mass: 0.75,
            duration: shouldReduceMotion ? 0.12 : undefined,
          }}
          className="w-full rounded-t-[2rem] border border-border/70 bg-card/95 shadow-2xl"
        >
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border/70" />
          <header className="px-5 pb-3 pt-4 sm:px-6">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <IconPalette className="size-3.5" />
              Choose Theme
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Pick your visual style
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This updates instantly. You can always change it later in Settings.
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-background/60 p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentThemeMeta.id}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { opacity: 0, y: 12, scale: 0.985 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: shouldReduceMotion ? 0.1 : 0.24 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {currentThemeMeta.label}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Active Preview
                    </p>
                  </div>
                  <div
                    className="h-16 rounded-xl border border-border/70"
                    style={{
                      background: `linear-gradient(135deg, ${currentThemeMeta.preview.background} 0%, ${currentThemeMeta.preview.accent} 55%, ${currentThemeMeta.preview.primary} 100%)`,
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </header>

          <div className="max-h-[58dvh] overflow-y-auto px-0 sm:max-h-[54dvh]">
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.24, delay: shouldReduceMotion ? 0 : 0.08 }}
            >
              <ThemeGrid
                currentTheme={currentTheme}
                onSelect={(id) => {
                  setTheme(id);
                  onThemeSelected(id);
                }}
              />
            </motion.div>
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/70 px-5 py-4 sm:px-6">
            <PressableButton
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={onBack}
            >
              Back
            </PressableButton>
            <PressableButton
              type="button"
              size="sm"
              className="rounded-xl"
              onClick={onContinue}
            >
              Continue
            </PressableButton>
          </footer>
        </motion.section>
      </div>
    </div>
  );
}
