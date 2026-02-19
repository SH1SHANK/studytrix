"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/features/settings/settings.store";

function hexToRgb(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : null;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const values = useSettingsStore((state) => state.values);
  const initialized = useSettingsStore((state) => state.initialized);
  const initialize = useSettingsStore((state) => state.initialize);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  useEffect(() => {
    if (!initialized) return;

    const root = document.documentElement;

    // Apply accent color
    const accentColor = values.accent_color as string | undefined;
    if (accentColor) {
      const rgb = hexToRgb(accentColor);
      if (rgb) {
        // We set a CSS variable that components can use (e.g. for selection, borders, custom badges)
        // This integrates cleanly without overriding Tailwind's core palette unless explicitly used
        root.style.setProperty("--setting-accent-rgb", rgb);
        root.style.setProperty("--setting-accent", accentColor);
      }
    }

    // Apply compact mode
    const isCompact = values.compact_mode as boolean | undefined;
    if (isCompact) {
      root.setAttribute("data-compact", "true");
    } else {
      root.removeAttribute("data-compact");
    }

    // Apply animation intensity
    const intensity = values.animation_intensity as number | undefined;
    if (typeof intensity === "number") {
      // Map 0-100 to a multiplier (e.g. 50 -> 1x, 0 -> 0x [none], 100 -> 2x [intense])
      const multiplier = intensity / 50;
      root.style.setProperty("--setting-animation-multiplier", multiplier.toString());
      if (multiplier === 0) {
        root.setAttribute("data-reduce-motion", "true");
      } else {
        root.removeAttribute("data-reduce-motion");
      }
    } else {
      root.style.setProperty("--setting-animation-multiplier", "1");
      root.removeAttribute("data-reduce-motion");
    }
  }, [values, initialized]);

  return <>{children}</>;
}
