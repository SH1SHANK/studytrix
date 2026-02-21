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
    "Explore Studytrix features across scoped search, offline storage, sharing, copy/download actions, and mobile-first workflows.",
  alternates: {
    canonical: "/features",
  },
};

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    title: "Navigation and Discovery",
    summary: "Fast access to courses, folders, and actions across global and local scopes.",
    points: [
      "Command Center with global and scoped search modes.",
      "Scoped shortcuts for folder (`/`), tag (`#`), domain (`:`), actions (`>`), and recents (`@`).",
      "Folder-aware command indexing with nested path discovery.",
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
    summary: "Share from file actions, bulk selection, and page-level context links.",
    points: [
      "Native file sharing with fallback behavior for unsupported devices.",
      "Dialog-driven preparation/progress for share and zip operations.",
      "Page share actions preserve active route/query context.",
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
