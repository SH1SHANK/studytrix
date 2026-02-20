"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      themes={["classic", "midnight", "forest", "sunset", "minimal", "eclipse", "graphite"]}
      defaultTheme="classic"
      enableSystem={false}
      storageKey="studytrix-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
