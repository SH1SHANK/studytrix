# Features

## Versioning and Release Visibility

- Custom version declaration source at `features/version/version.ts`.
- Curated release notes source at `features/changelog/changelog.catalog.ts`.
- In-app version banner shown after a version bump with `View Changelog` and `Dismiss`.
- Dedicated changelog page at `/changelog`, covering versions `v0.1.0` through current.
- Version label rendered in the app shell footer for quick reference.

## Dashboard and Navigation

- Department- and semester-scoped academic browsing.
- Folder-first file manager for course material discovery.
- Command-centered interactions with global and local folder modes.
- Time-based greeting panel with theme-based secondary message behavior.
- Weather-aware greeting enhancement via Open-Meteo weather code mapping.
- Contextual item actions via mobile-friendly menus and long-press support.
- Sort modes and starred-priority presentation.

## Greeting Personalization

- Persistent `greetingPreferences` object in settings store:
  - `enabled`
  - `includeWeather`
  - `useName`
  - `greetingTheme` (`study` | `motivational` | `minimal`)
- Greeting settings section with:
  - `Show Greeting` master toggle
  - `Weather Forecast` toggle
  - `Use My Name` toggle
  - `Greeting Style` segmented control
- Study theme supports six time periods with study-specific secondary message pools.
- Motivational theme provides generic encouragement alternatives.
- Minimal theme suppresses secondary line and shows primary greeting only.

## Command Center and Scope System

- Scope prefixes for fast intent switching:
  - `/` for folder scope
  - `#` for tag scope
  - `:` for domain/academic scope
  - `>` for actions scope
  - `@` for recents scope
- Sticky prefix interaction model with deterministic mixed-prefix parsing and predictable cancel behavior.
- Single essential scope bar in idle command state (`Folder`, `Tag`, `Actions`, `Clear`) to reduce UI clutter.
- Nested folder-aware search resolution for both local and global search scopes.
- Command suggestions aligned to active scope context.
- Improved scope switching UX for quick mode transitions on desktop and mobile.

## Offline and Storage Engine

- Dual-provider storage abstraction:
  - File System Access API when available
  - IndexedDB fallback for broader compatibility
- Storage location configuration, migration, relink, and fallback handling.
- Offline metadata/index updates with nested coverage visibility.
- Integrity checks and stale-file invalidation workflows.
- Offline diagnostics and storage health surfaces.
- Offline Library static fallback (`/offline-library.html`) for guaranteed offline access when app route bundles are unavailable.
- Offline-aware navigation handoff between fallback and full app route when connectivity changes.

## AI and Local Intelligence

- Full-content extraction (`Copy Contents` pipeline) for PDFs, DOCXs, PPTXs, and images.
- Extractor routers orchestrate native Mammoth (DOCX), `<a:t>` tags (PPTX), native PDF text, and `Tesseract.js` image OCR fallbacks.
- AI Cleanup Engine powered by local T5 models via `@huggingface/transformers` to denoise and format garbled OCR output.
- Configurable intelligence profiles in settings mapped to Xenova's model tiers (Lite, Balanced, Pro).
- Fully private, on-device compute via Web Workers, utilizing WebGPU and multi-threading where available.

## Bulk Operations, Zip, and Share

- Reliable zip preparation for:
  - single folders
  - multiple folders
  - mixed file/folder selections
  - file-only selections
- Explicit pre-flight resolution pipeline for nested folder expansion.
- Dialog-based progress UX for zip/share preparation and execution.
- Reduced perceived latency by opening preparation dialogs immediately.
- Native share via Web Share API with graceful fallback behavior.
- Copy/download actions for files and folders with local-first behavior.
- Unified large-file safeguards across download entrypoints (warn at `>=25MB`, confirm at `>=100MB`).
- Shared risk-gate pipeline for download, share, offline-save, and retry actions.
- Transient failure retry policy for downloads (up to 3 attempts) with normalized task error states.

## Page-Level Sharing

- Header top-right share action for current page URL.
- Share link preserves active filters and query customizations.
- Copy-link fallback for platforms without native share support.
- File Manager top-right menu includes contextual share/open utilities.

## Mobile, PWA, and SEO

- Floating dock behavior tuned for better mobile/PWA touch interactions.
- Updated favicon set wired for browser tabs, PWA install, and Apple touch icon.
- Improved manifest metadata with richer install fields and shortcut entries.
- Expanded page-level metadata (title, description, canonical) for better discoverability.

## Tags and Organization

- Dedicated tags management page and tag-centric organization workflows.
- Multi-entity assignment tools for files/folders.
- Improved tag filtering and selection controls.

## Settings, Guides, and Discoverability

- Settings quick links section (`Guides & References`) for:
  - Changelog
  - Features
  - Shortcut Hints
- Shortcut hints page at `/shortcuts` with keyboard and prefix guidance.
- Features overview page at `/features` with curated capability breakdowns.

## API, Safety, and Performance

- Server-only Google Drive access using service-account JWT credentials.
- Request deduplication and cache-first behavior where safe.
- Streaming file responses to reduce memory spikes.
- Redis-first rate limit/cache design with local fallback support.
- Strict TypeScript and defensive error normalization.
