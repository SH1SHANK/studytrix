import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeatureSection = {
  title: string;
  summary: string;
  points: string[];
};

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Studytrix features across local-first Personal Repository workflows, smart organization shelves, scoped search, offline storage, and mobile-first UX.",
  alternates: {
    canonical: "/features",
  },
};

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    title: "Personal Repository (Local-First)",
    summary: "Your private study workspace with no user login/auth flow required.",
    points: [
      "Add folders from a unified link flow (Studytrix shared link or Drive folder link).",
      "Add local device folders (PWA/File System Access supported devices).",
      "Create app-native local folders and organize content without leaving Personal Repository.",
      "Permission reconnect banners and folder health states for local folders.",
    ],
  },
  {
    title: "Primary Actions and UX",
    summary: "Action-priority layout designed for speed on mobile and desktop.",
    points: [
      "Primary header actions: Add Folder, Create Folder, Quick Capture, New Study Set.",
      "Folder Health is intentionally secondary.",
      "Consistent bottom-sheet dialog behavior on mobile with centered desktop modals.",
      "Reduced duplicate entry points to keep flows clearer and faster.",
    ],
  },
  {
    title: "Navigation and Discovery",
    summary: "Fast access to courses, folders, and actions with breadcrumb-aware scoped search.",
    points: [
      "Command Center with route-aware `SearchScope` (global-root, personal-root, and folder subtree contexts).",
      "Scoped shortcuts for folder (`/`), tag (`#`), domain (`:`), actions (`>`), and recents (`@`).",
      "Unified folder scope UI via breadcrumbs, removing duplicate folder-scope states across prefix and chip layers.",
      "Folder-aware command indexing with nested path discovery.",
    ],
  },
  {
    title: "Smart Search Intelligence",
    summary: "On-device semantic retrieval with deeper indexing and contextual suggestions.",
    points: [
      "Cross-repository semantic suggestions in global scope for high-confidence Personal Repository matches.",
      "Repository-partitioned index metadata with ancestry-aware folder-subtree filtering for semantic queries.",
      "Incremental semantic index updates from Service Worker file-cache broadcasts (without full recollection).",
      "Tag suggestion and code-aware indexing improvements in Personal Repository flows.",
    ],
  },
  {
    title: "Smart Organization Shelves",
    summary: "Automatic and manual grouping for rapid file access.",
    points: [
      "Smart Collections auto-cluster personal files by topic.",
      "Pinned shelf keeps most-used files at the top with reorder support.",
      "Study Sets combine files across folders into focused exam/work bundles.",
      "Collection and Study Set detail views support fast list operations.",
    ],
  },
  {
    title: "Quick Capture and Personal File Actions",
    summary: "Capture and manage study assets directly inside Personal Repository.",
    points: [
      "Quick Capture supports photo, text note, and voice note flows.",
      "Add files from device with validation and local-first save behavior.",
      "Duplicate and move actions are available in Personal file flows.",
      "Code files open in an in-app syntax-highlighted preview.",
    ],
  },
  {
    title: "Greeting Personalization",
    summary: "Time-aware dashboard greetings with weather and theme controls.",
    points: [
      "Dynamic greeting generation with primary and secondary messages by time period.",
      "Greeting settings object (`greetingPreferences`) with enable, weather, name, and theme controls.",
      "Theme modes: Study Mode, Motivational, and Minimal primary-only rendering.",
    ],
  },
  {
    title: "Offline and Storage",
    summary: "Offline-first architecture with configurable storage and resilient fallback behavior.",
    points: [
      "IndexedDB + File System Access abstraction for offline blobs.",
      "Storage location setup, migration, relink, and fallback recovery.",
      "Offline runtime diagnostics and storage analytics tools.",
    ],
  },
  {
    title: "Downloads and Bulk Operations",
    summary: "Reliable transfer lifecycle with batch operations for files and folders.",
    points: [
      "Managed download queue with progress and state transitions.",
      "Folder expansion and mixed selection resolution for batch operations.",
      "ZIP preparation for files/folders with share/download flows.",
      "Dedicated copy/download actions for single and multi-entity file-manager workflows.",
    ],
  },
  {
    title: "Sharing Workflows",
    summary: "Share from file actions, personal folder links, and page-level context links.",
    points: [
      "Native file sharing with fallback behavior for unsupported devices.",
      "Dialog-driven preparation/progress for share and zip operations.",
      "Page share actions preserve active route/query context.",
      "Personal folder share links can be imported directly into Personal Repository.",
    ],
  },
  {
    title: "Organization and Tags",
    summary: "Structured file organization through tags, assignments, and entity actions.",
    points: [
      "Dedicated tag manager and tag-centric views.",
      "Assignment drawer for single and multi-entity tagging.",
      "Entity actions for star, offline, share, and tag operations.",
    ],
  },
  {
    title: "Mobile and PWA Polish",
    summary: "Mobile-first responsiveness and install-ready PWA improvements.",
    points: [
      "Floating dock behavior tuned for touch ergonomics and better state transitions on mobile/PWA.",
      "Updated favicon set across browser tabs, app install icons, and Apple touch icon usage.",
      "Improved site manifest metadata for stronger install UX and launcher shortcuts.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <AppShell headerTitle="Features" hideHeaderFilters={true}>
      <div className="px-4 py-5 sm:px-5">
        <section className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Platform Features
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A curated overview of Studytrix capabilities across navigation, offline storage, sharing,
            and organization workflows.
          </p>
        </section>

        <section className="mt-4 space-y-3">
          {FEATURE_SECTIONS.map((section) => (
            <Card key={section.title} className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {section.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{section.summary}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {section.points.map((point) => (
                    <li key={`${section.title}-${point}`} className="flex items-start gap-2">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/80" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
