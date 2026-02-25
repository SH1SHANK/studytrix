export const SMART_COLLECTION_COLOURS = [
  "color-mix(in oklab, hsl(197 89% 48%) 78%, var(--card))",
  "color-mix(in oklab, hsl(24 95% 53%) 78%, var(--card))",
  "color-mix(in oklab, hsl(142 72% 40%) 78%, var(--card))",
  "color-mix(in oklab, hsl(343 78% 51%) 78%, var(--card))",
  "color-mix(in oklab, hsl(262 83% 58%) 78%, var(--card))",
  "color-mix(in oklab, hsl(48 96% 53%) 78%, var(--card))",
] as const;

export const SMART_COLLECTION_GENERIC_SEGMENTS = new Set([
  "unit",
  "sem",
  "semester",
  "folder",
  "notes",
  "file",
  "document",
]);
