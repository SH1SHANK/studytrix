import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { CompactPageContainer } from "@/components/layout/CompactPageContainer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_VERSION, formatVersionLabel } from "@/features/version/version";

type DocSection = {
  title: string;
  summary: string;
  points: string[];
};

type ApiDoc = {
  method: "GET" | "POST";
  path: string;
  purpose: string;
  success: string;
  errors: string[];
  notes: string[];
};

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Detailed Studytrix documentation covering local-first Personal Repository architecture, APIs, offline/storage behavior, command scope search, and platform limitations.",
  alternates: {
    canonical: "/documentation",
  },
};

const GUIDE_LINKS = [
  {
    href: "/features",
    label: "Features",
    description: "Capability-level overview by product area.",
  },
  {
    href: "/shortcuts",
    label: "Shortcut Hints",
    description: "Keyboard and command prefix usage.",
  },
  {
    href: "/changelog",
    label: "Changelog",
    description: "Version-by-version release details.",
  },
] as const;

const CORE_FLOW: string[] = [
  "Catalog APIs provide department, semester, and course metadata for global repository navigation.",
  "Personal Repository workflows run local-first with persisted state, local scans, and IndexedDB-backed stores.",
  "Add Folder uses a unified link-input flow (Studytrix import link or Drive folder link) plus optional device-folder source.",
  "Command Center indexes files/folders and switches scopes using `/`, `#`, `:`, `>`, and `@`.",
  "Offline actions persist file blobs using File System Access API or IndexedDB fallback.",
  "Smart shelves (Smart Collections, pinned files, Study Sets) are generated from personal index/store state.",
  "Version and changelog modules inform users when a new build is available.",
];

const MODULE_SECTIONS: DocSection[] = [
  {
    title: "Client Runtime and State",
    summary: "How UI, stores, and feature controllers coordinate behavior.",
    points: [
      "Next.js App Router renders shell-level layout and route pages.",
      "Zustand stores hold settings, offline index state, command state, and transfer state.",
      "Feature modules are domain-scoped (`features/command`, `features/offline`, `features/bulk`, `features/download`).",
      "Dialogs are used for long-running operations to provide persistent progress and completion feedback.",
      "The Settings system is schema-driven and searchable by category.",
      "Greeting preferences are persisted as a typed object in the settings store.",
      "No user account/login/authentication runtime is required for app usage.",
    ],
  },
  {
    title: "Personal Repository Runtime",
    summary: "Local-first orchestration for personal folders, shelves, and capture flows.",
    points: [
      "Folder sources include unified link import, device folders, and app-created local folders.",
      "Source kind is tracked per folder (`drive`, `local`, `local-virtual`) with safe hydration defaults.",
      "Local handles are persisted in IndexedDB and re-verified on app init/visibility.",
      "Smart Collections, pinned files, and Study Sets are store-driven and persisted locally.",
      "Quick Capture flows write locally first and update personal indexing paths incrementally.",
      "Folder health and reconnect UX are derived from sync metadata and permission status.",
    ],
  },
  {
    title: "Server Runtime and Proxy Layer",
    summary: "How server routes proxy global repository/catalog operations and link validation.",
    points: [
      "Global repository Drive and file APIs run in Node.js runtime route handlers.",
      "Route handlers validate identifiers and normalize error responses.",
      "Custom-folder link resolve endpoint decodes and validates import link payloads.",
      "Catalog routes read and validate `data/catalog.json` before returning course data.",
      "Response errors are intentionally generic for internal failures.",
    ],
  },
  {
    title: "Greeting Runtime",
    summary: "Time-period and weather-aware greeting generation for the dashboard.",
    points: [
      "Greeting engine generates `primaryMessage` and `secondaryMessage` for six daily time windows.",
      "Optional weather integration uses Open-Meteo (`/v1/forecast`) `current_weather.weathercode` mapping.",
      "Theme options branch secondary content: study, motivational, and minimal (primary-only).",
      "Personalization supports named and anonymous greeting headline variants.",
      "Weather-aware study nudges are conditionally appended for non-default weather states.",
    ],
  },
  {
    title: "Storage and Offline Strategy",
    summary: "Persistence model for offline-first operation.",
    points: [
      "Primary strategy: File System Access API for explicit folder-backed storage where supported.",
      "Fallback strategy: IndexedDB persistence on unsupported/restricted platforms.",
      "Offline Library includes a static fallback page (`/offline-library.html`) that can read cached files directly from IndexedDB when route bundles are unavailable offline.",
      "Offline index and metadata are updated from local persistence operations.",
      "Storage location configuration supports setup, relink, and migration workflows.",
      "Offline search and availability indicators are derived from locally indexed content.",
    ],
  },
  {
    title: "Search, Scope, and Navigation",
    summary: "Command Center behavior and scoped search model.",
    points: [
      "Global scope searches across workspace-level indexed entities.",
      "Local scope narrows results to current folder hierarchy context.",
      "Prefix shortcuts map to scoped intents: folder (`/`), tag (`#`), domain (`:`), actions (`>`), recents (`@`).",
      "Nested folder indexing improves deep file discovery in local and global flows.",
      "Code-aware result rendering and actions improve developer/stem file workflows.",
      "Keyboard-first navigation supports fast command execution across pages.",
    ],
  },
  {
    title: "Bulk, Zip, and Share Pipeline",
    summary: "How the app handles mixed selection operations reliably.",
    points: [
      "Selection preparation resolves folders into nested file entries before zip/share.",
      "Supported selection types include files-only, folder-only, and mixed file/folder sets.",
      "ZIP generation is client-side and optimized for predictable feedback during preparation.",
      "Copy/download actions are available for both files and folders with local-first fallbacks.",
      "Share flows use native Web Share where available with fallback paths when unavailable.",
      "Partial failures are surfaced explicitly instead of silently skipped.",
    ],
  },
  {
    title: "PWA, Metadata, and Discovery",
    summary: "Installability and SEO improvements for web and mobile entry points.",
    points: [
      "App metadata includes richer Open Graph, Twitter card, robots, and canonical values.",
      "Route-level page metadata improves discoverability for features, docs, changelog, settings, and tags.",
      "Manifest files include launcher shortcuts, refined descriptions, and updated app icon assets.",
      "Favicon set is aligned across browser tabs, installed PWA icons, and Apple touch surfaces.",
      "Service worker shell cache includes offline fallback pages and redirects `/offline-library` navigation to offline-safe fallback content when requests fail.",
    ],
  },
  {
    title: "Versioning and Documentation Surfaces",
    summary: "How releases and product references are presented in-app.",
    points: [
      "Current app version is declared in `features/version/version.ts`.",
      "Release entries are curated in `features/changelog/changelog.catalog.ts`.",
      "Update banner appears after version bumps with dismiss persistence in local storage.",
      "Guide pages include Changelog, Features, Shortcut Hints, and Documentation.",
      "Settings provides direct links to these guide pages for discoverability.",
    ],
  },
];

const API_REFERENCE: ApiDoc[] = [
  {
    method: "GET",
    path: "/api/catalog/index",
    purpose: "Returns departments with only semesters that have valid Drive-backed content.",
    success: "200 with `{ departments: [{ id, name, availableSemesters[] }] }`.",
    errors: ["500 internal error"],
    notes: [
      "Uses `data/catalog.json` with server-side filtering.",
      "Returns cache headers (`max-age` + `stale-while-revalidate`).",
    ],
  },
  {
    method: "GET",
    path: "/api/catalog/[department]/[semester]",
    purpose: "Returns course list for a validated department and semester.",
    success: "200 with `{ courses: [...] }`.",
    errors: [
      "400 invalid department or semester format",
      "404 department not found",
      "404 semester not found",
      "500 internal error",
    ],
    notes: [
      "Department and semester params are decoded and strictly validated.",
      "Catalog schema is checked before returning data.",
    ],
  },
  {
    method: "GET",
    path: "/api/custom-folders/resolve?fid=<base64url>",
    purpose: "Decodes and validates a Studytrix share/import `fid` into a Drive folder ID.",
    success: "200 with `{ folderId }`.",
    errors: ["400 `{ error: 'INVALID_LINK' }`"],
    notes: [
      "Validates base64url payload and Drive-folder-id shape.",
      "Performs decode/validation only; no Drive API call is executed in this route.",
    ],
  },
  {
    method: "POST",
    path: "/api/custom-folders/verify",
    purpose: "Runs folder verification checks for Personal Repository Drive-link imports.",
    success:
      "200 with verification payload: `folderId`, `folderName`, `fileCount`, `folderCount`, `permissionLevel`, and safety flags.",
    errors: [
      "400 invalid or unsupported folder ID",
      "403 access denied/private folder",
      "404 folder not found",
      "502 upstream Drive error",
    ],
    notes: [
      "Verification route is read-only and does not write to Drive.",
      "Used by Add Folder and import-link flows before a folder is added locally.",
    ],
  },
  {
    method: "GET",
    path: "/api/drive/[folderId]?pageToken=<token>",
    purpose: "Lists folder contents through Drive proxy with dedupe, cache, and rate limiting.",
    success: "200 with paginated folder items and optional `nextPageToken`.",
    errors: [
      "400 invalid folder ID or page token",
      "403 folder access denied",
      "404 folder not found",
      "429 rate limit exceeded",
      "500 internal error",
    ],
    notes: [
      "Request dedupe prevents duplicate concurrent list calls.",
      "Cache-first behavior backed by Redis with in-memory fallback.",
    ],
  },
  {
    method: "POST",
    path: "/api/drive/nested-index",
    purpose: "Builds nested file index from multiple root folders for deep command search.",
    success: "200 with `{ files, indexedAt, truncated }`.",
    errors: [
      "400 invalid JSON payload",
      "403 folder access denied",
      "404 folder not found",
      "500 failed to build nested index",
    ],
    notes: [
      "Payload accepts roots: `{ folderId, courseCode, courseName }`.",
      "Protective limits: max 64 roots, 4000 folders, 30000 files, concurrency 4.",
    ],
  },
  {
    method: "GET",
    path: "/api/file/[fileId]/metadata",
    purpose: "Returns normalized file metadata used by preview and actions.",
    success: "200 with `{ metadata }`.",
    errors: [
      "400 invalid file ID",
      "403 file access denied",
      "404 file not found",
      "429 rate limit exceeded",
      "500 internal error",
    ],
    notes: [
      "Shares the same Drive rate-limit guard as folder routes.",
      "Used by file preview and operation pipelines.",
    ],
  },
  {
    method: "GET",
    path: "/api/file/[fileId]/stream",
    purpose: "Streams file content with safe headers and Google-file export support.",
    success: "200/206 streamed response with content headers.",
    errors: [
      "400 invalid ID or unsupported folder stream",
      "403 file access denied",
      "404 file not found",
      "415 unsupported export type",
      "416 unsupported range for exported docs",
      "429 rate limited",
      "503 upstream unavailable",
      "500 internal error",
    ],
    notes: [
      "Exports Google Docs/Sheets/Slides/Drawing to standard formats before stream.",
      "Range requests are supported for direct media streams, not export streams.",
    ],
  },
];

const LIMITATIONS: DocSection = {
  title: "Known Limitations",
  summary: "Current constraints based on platform APIs and runtime boundaries.",
  points: [
    "File System Access API support varies by browser and OS, especially on mobile PWAs.",
    "Native file sharing behavior differs by platform and can impose file count/size constraints.",
    "Large ZIP generation can be limited by device memory and browser execution budgets.",
    "Offline metadata freshness depends on sync/update cadence and storage permission continuity.",
    "Background sync behavior is browser-dependent and cannot be assumed uniform across all devices.",
  ],
};

const FUTURE_SCOPE: DocSection = {
  title: "Future Scope",
  summary: "High-value areas planned for deeper reliability and capability.",
  points: [
    "Deeper command intelligence and semantic ranking for nested content discovery.",
    "Richer storage diagnostics with guided recovery actions for permission and migration issues.",
    "More robust mobile-first workflows for long-running offline/share/zip operations.",
    "Expanded observability around partial failures, retries, and transfer bottlenecks.",
    "More export/share options for batch workflows and collaborative distribution.",
  ],
};

const TROUBLESHOOTING: DocSection = {
  title: "Troubleshooting Guide",
  summary: "Common issues and first-response checks.",
  points: [
    "If folder listings fail with `429`, wait for rate-limit window reset and retry.",
    "If offline files disappear after permission changes, reopen storage settings and relink location.",
    "If sharing is unavailable, verify platform Web Share support and use copy-link fallback.",
    "If ZIP preparation is slow, reduce selection size or split very large mixed batches.",
    "If nested results are missing, trigger nested index refresh by reopening scoped search context.",
  ],
};

export default function DocumentationPage() {
  return (
    <AppShell headerTitle="Documentation" hideHeaderFilters={true}>
      <CompactPageContainer
        regularClassName="px-4 py-5 sm:px-5"
        compactClassName="px-4 py-4 sm:px-5"
      >
        <section className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Detailed Documentation
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete reference for functionality, architecture, APIs, services, limitations,
                and roadmap.
              </p>
            </div>
            <Badge variant="secondary">
              Current {formatVersionLabel(APP_VERSION)}
            </Badge>
          </div>
        </section>

        <section className="mt-4 grid gap-2 sm:grid-cols-3">
          {GUIDE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-border/70 bg-card px-3 py-3 transition-colors hover:bg-accent/40"
            >
              <p className="text-sm font-medium text-foreground">{link.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </section>

        <section className="mt-4">
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">
                End-to-End System Flow
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Request path from catalog/personal discovery to offline and organization operations.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1.5 text-sm text-foreground/90">
                {CORE_FLOW.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/80" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 space-y-3">
          {MODULE_SECTIONS.map((section) => (
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

        <section className="mt-4 space-y-3">
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">
                API Reference
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Public route handlers currently used by dashboard, file manager, command, and
                metadata flows.
              </p>
            </CardHeader>
          </Card>

          {API_REFERENCE.map((endpoint) => (
            <Card
              key={`${endpoint.method}-${endpoint.path}`}
              className="rounded-2xl border-border/80 shadow-sm"
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={endpoint.method === "GET" ? "secondary" : "default"}>
                    {endpoint.method}
                  </Badge>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {endpoint.path}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.purpose}</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Success Response
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">{endpoint.success}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Error Cases
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                    {endpoint.errors.map((item) => (
                      <li key={`${endpoint.path}-${item}`} className="flex items-start gap-2">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-muted-foreground/70" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                    {endpoint.notes.map((item) => (
                      <li key={`${endpoint.path}-note-${item}`} className="flex items-start gap-2">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/80" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-4 space-y-3">
          {[LIMITATIONS, FUTURE_SCOPE, TROUBLESHOOTING].map((section) => (
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
      </CompactPageContainer>
    </AppShell>
  );
}
