"use client";

import { AnimatePresence, motion } from "framer-motion";
import { IconCheck, IconSun, IconMoon, IconTree, IconSunset, IconCircleDashed, IconMoonStars, IconHexagon, IconSparkles } from "@tabler/icons-react";

import {
  type ThemeId,
  THEMES,
  getThemeLabel,
} from "@/features/theme/theme.constants";
import { cn } from "@/lib/utils";

interface ThemeGridProps {
  currentTheme: string;
  onSelect: (id: ThemeId) => void;
}

const LIGHT_THEME_IDS: readonly ThemeId[] = [
  "classic",
  "forest",
  "sunset",
  "minimal",
];

const DARK_THEME_IDS: readonly ThemeId[] = ["midnight", "eclipse", "graphite", "aurora"];

function getThemesByIds(ids: readonly ThemeId[]) {
  return ids
    .map((id) => THEMES.find((themeOption) => themeOption.id === id))
    .filter((themeOption): themeOption is (typeof THEMES)[number] => Boolean(themeOption));
}

function getThemeIcon(id: ThemeId) {
  const props = { className: "size-4 text-muted-foreground mr-2 shrink-0" };
  switch (id) {
    case "classic":
      return <IconSun {...props} />;
    case "midnight":
      return <IconMoon {...props} />;
    case "forest":
      return <IconTree {...props} />;
    case "sunset":
      return <IconSunset {...props} />;
    case "minimal":
      return <IconCircleDashed {...props} />;
    case "eclipse":
      return <IconMoonStars {...props} />;
    case "graphite":
      return <IconHexagon {...props} />;
    case "aurora":
      return <IconSparkles {...props} />;
    default:
      return <IconSun {...props} />;
  }
}

export function ThemeGrid({ currentTheme, onSelect }: ThemeGridProps) {
  const lightThemes = getThemesByIds(LIGHT_THEME_IDS);
  const darkThemes = getThemesByIds(DARK_THEME_IDS);

  const renderThemeCard = (theme: (typeof THEMES)[number]) => {
    const isSelected = theme.id === currentTheme;

    return (
      <motion.button
        key={theme.id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={() => onSelect(theme.id)}
        whileHover={{ y: -1.5, scale: 1.012 }}
        whileTap={{ y: 0.5, scale: 0.982 }}
        transition={{
          type: "spring",
          stiffness: 460,
          damping: 33,
          mass: 0.5,
        }}
        className={cn(
          "relative rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          isSelected && "border-primary bg-accent/60 ring-2 ring-primary/30",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center min-w-0">
            {getThemeIcon(theme.id)}
            <span className="text-sm font-medium text-card-foreground truncate">
              {theme.label}
            </span>
          </div>
          <AnimatePresence>
            {isSelected ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.65, rotate: -16 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.65, rotate: 14 }}
                transition={{ duration: 0.18 }}
                className="ml-2 shrink-0 rounded-full bg-primary p-1 text-primary-foreground"
              >
                <IconCheck className="size-3" stroke={3} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="size-4 rounded-full border border-border/60 shrink-0"
            style={{ backgroundColor: theme.preview.primary }}
          />
          <span
            className="size-4 rounded-full border border-border/60 shrink-0"
            style={{ backgroundColor: theme.preview.background }}
          />
          <span
            className="size-4 rounded-full border border-border/60 shrink-0"
            style={{ backgroundColor: theme.preview.accent }}
          />
        </div>
      </motion.button>
    );
  };

  return (
    <div className="px-4 pb-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Select a curated palette.
        </p>
        <p className="text-xs font-medium text-foreground">
          Current: {getThemeLabel(currentTheme)}
        </p>
      </div>
      <div className="space-y-5" role="radiogroup" aria-label="Theme options">
        <section aria-label="Light themes" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            Light
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lightThemes.map((theme) => renderThemeCard(theme))}
          </div>
        </section>

        <section aria-label="Dark themes" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            Dark
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {darkThemes.map((theme) => renderThemeCard(theme))}
          </div>
        </section>
      </div>
    </div>
  );
}
