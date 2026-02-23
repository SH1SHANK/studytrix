export type ThemeId =
  | "classic"
  | "midnight"
  | "forest"
  | "sunset"
  | "minimal"
  | "eclipse"
  | "graphite"
  | "aurora";


export interface ThemePreview {
  primary: string;
  background: string;
  accent: string;
}

export interface ThemeOption {
  id: ThemeId;
  label: string;
  preview: ThemePreview;
}

export const THEMES: ThemeOption[] = [
  {
    id: "classic",
    label: "Classic",
    preview: { primary: "#6366f1", background: "#ffffff", accent: "#e0e7ff" },
  },
  {
    id: "midnight",
    label: "Midnight",
    preview: { primary: "#60a5fa", background: "#0f172a", accent: "#1e3a5f" },
  },
  {
    id: "forest",
    label: "Forest",
    preview: { primary: "#4ade80", background: "#f0fdf4", accent: "#bbf7d0" },
  },
  {
    id: "sunset",
    label: "Sunset",
    preview: { primary: "#f97316", background: "#fff7ed", accent: "#fed7aa" },
  },
  {
    id: "minimal",
    label: "Minimal",
    preview: { primary: "#64748b", background: "#f8fafc", accent: "#e2e8f0" },
  },
  {
    id: "eclipse",
    label: "Eclipse",
    preview: { primary: "#a855f7", background: "#0d0a1a", accent: "#2e1f5e" },
  },
  {
    id: "graphite",
    label: "Graphite",
    preview: { primary: "#3b82f6", background: "#111111", accent: "#2a2a2a" },
  },
  {
    id: "aurora",
    label: "Aurora (OLED)",
    preview: { primary: "#06b6d4", background: "#000000", accent: "#a855f7" },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "classic";

export function getThemeLabel(themeId: string | null | undefined): string {
  return THEMES.find((theme) => theme.id === themeId)?.label ?? "Classic";
}

export const TAG_COLOR_PALETTES: Record<ThemeId, readonly string[]> = {
  classic: ["#2563EB", "#16A34A", "#EA580C", "#DC2626", "#7C3AED", "#0891B2", "#D97706", "#0F766E"],
  midnight: ["#60A5FA", "#34D399", "#F59E0B", "#F87171", "#A78BFA", "#22D3EE", "#FBBF24", "#2DD4BF"],
  forest: ["#15803D", "#22C55E", "#4D7C0F", "#EA580C", "#0F766E", "#65A30D", "#16A34A", "#0D9488"],
  sunset: ["#F97316", "#EA580C", "#FB7185", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899", "#F43F5E"],
  minimal: ["#475569", "#64748B", "#0EA5E9", "#14B8A6", "#94A3B8", "#334155", "#0F766E", "#6B7280"],
  eclipse: ["#A855F7", "#8B5CF6", "#C084FC", "#22D3EE", "#F472B6", "#F59E0B", "#34D399", "#60A5FA"],
  graphite: ["#3B82F6", "#60A5FA", "#22C55E", "#F59E0B", "#F87171", "#A78BFA", "#38BDF8", "#94A3B8"],
  aurora: ["#06B6D4", "#8B5CF6", "#F43F5E", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#EAB308"],
};


export function getTagColorPalette(themeId: string | null | undefined): readonly string[] {
  const resolvedTheme = THEMES.find((theme) => theme.id === themeId)?.id ?? DEFAULT_THEME_ID;
  return TAG_COLOR_PALETTES[resolvedTheme];
}
