import { APP_VERSION } from "@/features/version/version";

export interface ChangelogEntry {
  version: string;
  releasedOn: string;
  title: string;
  summary: string;
  highlights: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "0.9.4-experimental",
    releasedOn: "2026-02-23",
    title: "Search Scope Redesign + Deep Indexing + Intelligence Setup UX Revamp",
    summary:
      "Unified CommandCenter folder scope around breadcrumbs, added cross-repository semantic suggestions, expanded deep indexing coverage, and upgraded model/indexing setup feedback.",
    highlights: [
      "Reworked CommandCenter scope model so folder context is breadcrumb-driven (route-aware) and no longer duplicated between prefix pills and top scope chips.",
      "Added global-root cross-repository semantic suggestions that can surface high-confidence Personal Repository matches in a dedicated secondary section.",
      "Expanded intelligence indexing architecture to support deeper nested traversal with richer index metadata and scoped querying behavior.",
      "Strengthened worker/store scope filtering contracts so global-root, personal-root, and folder subtree queries resolve consistently.",
      "Improved Service Worker incremental-index signaling and related indexing orchestration for newly cached content.",
      "Redesigned model download/indexing dialog UX with clearer two-step state, friendlier progress copy, richer animated progress bars, and better current-file visibility.",
    ],
  },
  {
    version: "0.9.3-experimental",
    releasedOn: "2026-02-23",
    title: "Offline Reliability + CommandCenter UI Refactor",
    summary:
      "Stabilized offline download/summarize behavior, hardened smart-search indexing lifecycle, and shipped a cleaner, denser CommandCenter layout for mobile and desktop.",
    highlights: [
      "Fixed make-available-offline pipeline so file and folder actions always enqueue real download tasks, surface in Downloads, and complete with proper status transitions.",
      "Fixed summarize pipeline with resilient server/client fallback behavior, stronger PDF extraction passes, retry+timeout handling, and clearer error copy.",
      "Refined CommandCenter visual hierarchy with improved header wording, smarter status chips, better Smart Search notice spacing, and tighter, more readable file/folder cards.",
      "Reduced CommandCenter result-card density for compact scanning: shorter rows, tighter metadata chips, and cleaner typography across mobile widths.",
      "Prevented repeated model download and full reindex loops by reusing persisted index snapshots, adding corpus-signature short-circuit checks, and gating indexing dialog visibility.",
      "Improved indexing dialog copy and progress presentation to clearly distinguish model setup from file indexing while preserving keyword-search continuity.",
    ],
  },
  {
    version: "0.9.2",
    releasedOn: "2026-02-23",
    title: "Storage/Download Platform Hardening",
    summary:
      "Introduced the major offline platform hardening pass across storage providers, download queue behavior, multi-select tooling, and offline management resilience.",
    highlights: [
      "Refactored storage-location flows with explicit provider contracts, handle-state tracking, resumable migration checkpoints, and safer filesystem relink behavior.",
      "Added IndexedDB fallback write safety with pending-sync tracking so storage writes can survive filesystem-provider interruptions.",
      "Overhauled download lifecycle with waiting/queued semantics, queue-position support, capped concurrency, reconnect FIFO resumption, and canonical completion metadata.",
      "Added retry/backoff and error-code normalization for download failures, plus improved indeterminate progress handling when total size is unavailable.",
      "Expanded multi-select action capabilities and refreshed toolbar UX with improved motion, action-state feedback, and offline batch operations.",
      "Strengthened offline management surfaces with quota-state messaging, stale/evicted handling, and broader cache/runtime integrity checks.",
    ],
  },
  {
    version: "0.9.1",
    releasedOn: "2026-02-23",
    title: "Shortcut Streaming Fix + Mobile Command and Dock Refinements",
    summary:
      "Fixed Google Drive shortcut download failures and streamlined core mobile interactions across breadcrumb, item actions, CommandCenter, and floating dock layouts.",
    highlights: [
      "Fixed file streaming for Google Drive shortcuts by resolving shortcut targets before media/export requests and strengthening shortcut error handling.",
      "Added shortcut-focused service and route regression coverage for target resolution, missing targets, and access-denied/not-found mappings.",
      "Improved file-manager breadcrumb behavior by auto-scrolling the active breadcrumb segment into view after navigation and responsive layout changes.",
      "Reworked file/folder action menu hierarchy into context, organization, and docked primary-action sections for faster scanning and lower interaction cost.",
      "Updated Copy Link behavior to use true Google Drive share URLs derived from item IDs (with `webViewLink` preference when available).",
      "Improved CommandCenter search-input ergonomics by separating scope pills from the input field, refining placeholder behavior, and fixing mobile list sizing when keyboard is closed.",
      "Fixed floating dock clipping on mobile and tuned dock sizing, safe-area offsets, and search placeholder text for stable rendering across narrow screens.",
      "Removed redundant action-menu and command-input plumbing no longer needed after the UX refactor.",
    ],
  },
  {
    version: "0.9.0",
    releasedOn: "2026-02-21",
    title: "Robust Download Pipeline + Prefix-First Command UX",
    summary:
      "Unified large-file safety across all download entrypoints, added transient retry resilience, and simplified CommandCenter into a cleaner sticky-prefix workflow.",
    highlights: [
      "Added shared download risk evaluation with enforced thresholds: warn at >=25MB and blocking confirmation at >=100MB.",
      "Added a single global download risk dialog and shared gate hook so file download, folder ZIP/share, offline save, and retry flows all use one preflight path.",
      "Refactored download controller reliability with transient-only auto-retries (up to 3 attempts), normalized error-code semantics, and consistent retryCount task state updates.",
      "Added controller-level pre-download storage-limit checks when metadata size is known while preserving final post-download enforcement.",
      "Replaced CommandCenter idle quick rows with one compact essential bar: Folder, Tag, Actions, and Clear.",
      "Implemented sticky deterministic prefix handling for `/`, `#`, `>`, `:`, and `@` with predictable paste/delete transitions and mixed-prefix normalization.",
      "Added keyboard reliability updates for scope interaction: Alt+1 (Folder), Alt+2 (Tag), Alt+3 (Actions), and layered Esc/Backspace cancel behavior.",
      "Improved share/copy ergonomics by preferring actual file clipboard copy where supported and keeping shared links sanitized/clean.",
      "Included additional PWA shell polish and interaction refinements for standalone-app behavior and dock stability.",
    ],
  },
  {
    version: "0.8.3",
    releasedOn: "2026-02-21",
    title: "PWA + Discoverability Polish",
    summary:
      "Improved mobile/PWA interactions, added copy/download actions, and upgraded favicon/manifest/SEO coverage.",
    highlights: [
      "Added copy/download actions for files and folders, including mixed-selection support in file-manager flows.",
      "Improved floating dock behavior for mobile and PWA usage with better responsiveness and interaction stability.",
      "Fixed offline-library reliability by adding a static fallback (`/offline-library.html`) that opens cached files directly from IndexedDB when route chunks are unavailable offline.",
      "Added offline-aware navigation routing so Offline Library actions resolve to the fallback page while disconnected and return to the full app route when reconnected.",
      "Updated service worker shell caching to precache offline fallback pages and route `/offline-library` requests to offline-safe fallback content.",
      "Wired new favicon assets across app metadata (`favicon`, `apple-touch-icon`, Android launcher icons).",
      "Improved web manifest definitions with stronger install metadata and launcher shortcuts.",
      "Expanded page-level SEO metadata (titles, descriptions, canonical URLs) across dashboard, settings, guides, and utility pages.",
      "Improved dynamic folder and tag route metadata for better deep-link discoverability.",
      "Included minor UX and reliability fixes discovered during release hardening.",
    ],
  },
  {
    version: "0.8.2",
    releasedOn: "2026-02-21",
    title: "Greeting System Upgrade",
    summary:
      "Replaced quote-based dashboard header with a configurable time-based greeting system.",
    highlights: [
      "Replaced static motivational quote header with dynamic primary/secondary greeting content.",
      "Added `generateGreetingMessage(userName, includeWeather, greetingTheme)` greeting action with Open-Meteo weather integration.",
      "Added study-specific secondary message pools across early morning, morning, midday, afternoon, evening, and night periods.",
      "Added weather-aware greeting nudges mapped from Open-Meteo `current_weather.weathercode` conditions.",
      "Added new settings-backed `greetingPreferences` object with `enabled`, `includeWeather`, `useName`, and `greetingTheme` fields.",
      "Added Greeting settings section with Show Greeting, Weather Forecast, Use My Name, and Greeting Style controls.",
      "Added Motivational and Minimal greeting styles and removed dashboard quote attribution rendering.",
    ],
  },
  {
    version: "0.8.1",
    releasedOn: "2026-02-21",
    title: "Share Reliability Update",
    summary:
      "Improved sharing and zip workflows for files, folders, and mixed selections.",
    highlights: [
      "Stabilized multi-folder and mixed file/folder ZIP preparation.",
      "Added an explicit preparation phase before share to resolve selected folders and nested files.",
      "Moved zip/share progress from transient toasts to resilient dialog-driven feedback.",
      "Added better partial-failure reporting so skipped files are visible to users.",
      "Improved immediate feedback on share tap by opening progress UI without waiting for fetch startup.",
      "Improved mobile/PWA responsiveness for storage and sharing interactions.",
      "Added in-app Features and Shortcut Hints reference pages and wired them into Settings navigation.",
    ],
  },
  {
    version: "0.8.0",
    releasedOn: "2026-02-20",
    title: "Offline + Command Scope Expansion",
    summary:
      "Expanded offline runtime behavior and command scope intelligence across nested content.",
    highlights: [
      "Improved nested folder/file indexing and scoped command search behavior.",
      "Added folder ancestry-aware scope matching for nested file discovery.",
      "Improved command scope switching UX with clearer scope shortcuts and suggestions.",
      "Refined offline library synchronization and diagnostics.",
      "Improved offline folder coverage indicators for nested folder hierarchies.",
      "Polished mobile interactions for command and storage flows.",
    ],
  },
  {
    version: "0.7.0",
    releasedOn: "2026-02-16",
    title: "Storage Location System",
    summary:
      "Introduced configurable offline storage location setup, migration, and relink flows.",
    highlights: [
      "Added folder-based offline storage selection with fallback provider support.",
      "Implemented migration and recovery flows for storage path changes.",
      "Added persisted storage-location state and better error handling for revoked permissions.",
      "Improved compatibility behavior for browsers/PWAs without complete File System Access support.",
      "Added storage-location controls in settings and storage dashboard.",
    ],
  },
  {
    version: "0.6.0",
    releasedOn: "2026-02-12",
    title: "Theme + Settings Upgrade",
    summary:
      "Expanded theming and settings controls with stronger UX consistency.",
    highlights: [
      "Added richer settings controls and category organization.",
      "Improved theme selection and appearance customization.",
      "Added reusable setting shells and improved settings interaction affordances.",
      "Improved navigation discoverability across settings-related tooling.",
      "Refined settings card interactions and visual consistency.",
    ],
  },
  {
    version: "0.5.0",
    releasedOn: "2026-02-08",
    title: "Offline Runtime Foundation",
    summary:
      "Established robust offline runtime primitives for sync and cache behavior.",
    highlights: [
      "Introduced service worker runtime and offline sync scheduling.",
      "Added query-cache policies and offline persistence rules.",
      "Added stronger offline access helpers for local-first file opening.",
      "Improved resilience when connectivity state changes mid-operation.",
      "Improved resilience for intermittent connectivity use cases.",
    ],
  },
  {
    version: "0.4.0",
    releasedOn: "2026-02-04",
    title: "Tagging and Selection Workflows",
    summary:
      "Added stronger organization workflows for tags and multi-entity actions.",
    highlights: [
      "Introduced dedicated tag management and tag views.",
      "Added multi-entity selection and assignment flows.",
      "Expanded contextual item action menus for files and folders.",
      "Improved action consistency across grid/list file manager modes.",
      "Improved download and item action interfaces.",
    ],
  },
  {
    version: "0.3.0",
    releasedOn: "2026-01-31",
    title: "Downloads + Command Improvements",
    summary:
      "Expanded download management and command center capabilities.",
    highlights: [
      "Added richer download status tracking and controls.",
      "Improved command center result quality and interaction patterns.",
      "Added improved grouping and lifecycle handling for transfer states.",
      "Expanded offline-oriented controls for frequently accessed content.",
      "Expanded storage-oriented tooling in the app.",
    ],
  },
  {
    version: "0.2.0",
    releasedOn: "2026-01-24",
    title: "UI Platform Build-Out",
    summary:
      "Built the reusable UI foundation used across settings, commands, and dialogs.",
    highlights: [
      "Added shared UI primitives for forms, menus, and feedback states.",
      "Improved visual consistency across key workflows.",
      "Standardized interaction tokens and component-level accessibility patterns.",
      "Reduced duplication by establishing reusable utility component patterns.",
      "Enabled faster feature delivery via reusable components.",
    ],
  },
  {
    version: "0.1.0",
    releasedOn: "2026-01-18",
    title: "Initial Release",
    summary:
      "Launched the first production-ready baseline of Studytrix.",
    highlights: [
      "Established app shell, routing, and baseline page architecture.",
      "Shipped initial browsing flow for study content.",
      "Added first-pass environment wiring and deployment-ready project structure.",
      "Defined the foundation used by later offline, command, and storage modules.",
      "Set up the foundation for iterative feature releases.",
    ],
  },
];

export const LATEST_CHANGELOG_ENTRY = CHANGELOG_ENTRIES[0];

export const IS_VERSION_DECLARATION_SYNCED =
  LATEST_CHANGELOG_ENTRY.version === APP_VERSION;

export function getChangelogByVersion(version: string): ChangelogEntry | null {
  return CHANGELOG_ENTRIES.find((entry) => entry.version === version) ?? null;
}
