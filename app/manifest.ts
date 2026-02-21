import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Studytrix",
    short_name: "Studytrix",
    description:
      "Offline-first academic workspace for browsing course content, scoped search, downloads, sharing, and local storage management.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait-primary",
    lang: "en-US",
    dir: "ltr",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    categories: ["education", "productivity", "utilities"],
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Open Dashboard",
        short_name: "Dashboard",
        description: "Jump into the main study dashboard.",
        url: "/",
      },
      {
        name: "Open Downloads",
        short_name: "Downloads",
        description: "Review active and completed downloads.",
        url: "/downloads",
      },
      {
        name: "Open Storage",
        short_name: "Storage",
        description: "View storage usage, location, and diagnostics.",
        url: "/storage",
      },
      {
        name: "Open Settings",
        short_name: "Settings",
        description: "Configure personalization and app behavior.",
        url: "/settings",
      },
    ],
  };
}
