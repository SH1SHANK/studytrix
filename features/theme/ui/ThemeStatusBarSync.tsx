"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

import {
  DEFAULT_THEME_ID,
  THEMES,
  type ThemeId,
} from "@/features/theme/theme.constants";

function resolveThemeId(value: string | undefined): ThemeId {
  if (THEMES.some((theme) => theme.id === value)) {
    return value as ThemeId;
  }
  return DEFAULT_THEME_ID;
}

function upsertMeta(name: string, content: string, media?: string) {
  const selector = media
    ? `meta[name="${name}"][media="${media}"]`
    : `meta[name="${name}"]:not([media])`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    if (media) {
      element.media = media;
    }
    document.head.appendChild(element);
  }

  element.content = content;
}

export function ThemeStatusBarSync() {
  const { theme } = useTheme();

  useEffect(() => {
    const themeId = resolveThemeId(theme);

    const applyThemeSurfaceColor = () => {
      const computedBackground = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      const fallback = THEMES.find((item) => item.id === themeId)?.preview.background
        ?? "#ffffff";
      const themeColor = computedBackground || fallback;

      upsertMeta("theme-color", themeColor);
      upsertMeta("theme-color", themeColor, "(prefers-color-scheme: light)");
      upsertMeta("theme-color", themeColor, "(prefers-color-scheme: dark)");
      upsertMeta(
        "apple-mobile-web-app-status-bar-style",
        "black-translucent",
      );

      document.documentElement.style.backgroundColor = themeColor;
      document.body.style.backgroundColor = themeColor;
    };

    applyThemeSurfaceColor();

    const observer = new MutationObserver(() => {
      applyThemeSurfaceColor();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    return () => {
      observer.disconnect();
    };
  }, [theme]);

  return null;
}
