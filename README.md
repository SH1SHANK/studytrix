# Studytrix

> **Status**: Beta / Experimental
> **Current app version**: `v0.9.4-experimental` (released on `2026-02-23`)

Studytrix is an offline-first academic workspace built with Next.js 16, React 19, and TypeScript. It combines Drive-backed content browsing, local persistence, on-device AI for semantic search and OCR denoising, command-driven navigation, and mobile/PWA-aware workflows into a single high-performance interface.

## Product Goals

- Provide reliable, offline-first access to study material, even with unstable connectivity.
- Keep cloud credentials and privileged access server-side to ensure maximum security.
- Improve content discovery with command scopes, tags, semantic embedding search, and contextual navigation.
- Empower learning through completely local, privacy-first AI text cleanup and extraction.
- Support fast, safe bulk actions for download, zip, and share workflows.

## In-App Guide Pages

- `/changelog`: version history from `v0.1.0` to current.
- `/features`: capability overview grouped by platform area.
- `/shortcuts`: keyboard and command-prefix hints.
- `/documentation`: detailed architecture, API, and operations reference.

These pages are linked from:
- Settings menu (header)
- File Manager top-right menu
- Settings page quick links (`Guides & References`)

## Shortcut Hints

Key command shortcuts:

- `Cmd+K` / `Ctrl+K`: open Command Center
- `Esc`: close active layer or clear command state
- `ArrowUp` / `ArrowDown`: navigate command results
- `Enter`: run selected command

Scope prefixes:

- `/`: folder scope
- `#`: tag scope
- `:`: academic/domain scope
- `>`: actions scope
- `@`: recents scope

## Release Notes (Detailed)

### v0.9.4-experimental - Search Scope Redesign + Deep Indexing + Intelligence Setup UX Revamp (`2026-02-23`)

- Unified folder scoping in CommandCenter so breadcrumb scope is the single source of truth (no duplicate folder scopes between prefix UI and top scope chip).
- Added route-aware scope behavior with clearer folder-context search transitions and better scope reset handling.
- Added cross-repository semantic suggestions in global scope, surfacing high-confidence Personal Repository matches in a dedicated section.
- Expanded intelligence indexing coverage and scope filtering behavior for deeper nested repository structures.
- Upgraded model download + indexing setup UX with clearer staged progress, richer animated bars, and improved current-file feedback.

### v0.9.3-experimental - Intelligence UX Polish + Local Model Switching (`2026-02-23`)

- Added live model switching for CommandCenter semantic search directly from Settings (manual model change and auto/manual mode transitions).
- Added robust index-safety behavior when semantic model changes so stale vectors are invalidated and rebuilt cleanly.
- Added a polished `Model Activity` panel in Settings showing animated download/provisioning progress for:
  - Semantic search model
  - Cleanup engine model
- Added stronger runtime feedback across local-model lifecycle (`loading`, `ready`, `error`) with responsive status badges and progress bars.
- Improved OCR cleanup reliability by enforcing strict fallback to original OCR text whenever generated output is too short or invalid.
- Kept all model execution on-device via Web Worker + Transformers runtime (WebGPU with WASM fallback).

### v0.9.1 - Shortcut Streaming Fix + Mobile Command and Dock Refinements (`2026-02-23`)

- Fixed Google Drive shortcut downloads by resolving shortcut targets before stream/export and improving error mapping for inaccessible/missing targets.
- Added focused regression tests for shortcut metadata/stream paths to prevent 500s on shortcut-backed files.
- Improved breadcrumb UX by auto-scrolling the active folder segment into view after folder navigation and responsive layout changes.
- Reworked file/folder action menus into a clearer hierarchy with:
  - metadata context section
  - organization actions section
  - bottom dock for primary actions
- Updated `Copy Link` to copy actual Google Drive share links derived from file/folder IDs (preferring Drive `webViewLink` when available).
- Improved CommandCenter search input area by separating scope chips from the input field and refining scoped placeholder behavior.
- Fixed mobile CommandCenter empty-space behavior when keyboard is closed by removing restrictive list-height caps.
- Fixed floating dock clipping/rendering on mobile with tighter width handling, safer bottom offsets, and clearer search placeholder text.
- Removed redundant action-menu and command-input plumbing introduced by previous UI iterations.

### v0.9.0 - Robust Download Pipeline + Prefix-First Command UX (`2026-02-21`)

- Added shared large-file risk safeguards across all download entrypoints:
  - soft warning at `>=25MB`
  - blocking confirmation at `>=100MB`
- Added a global download risk dialog + gate so file download, folder ZIP/share, offline save, and retry actions use one consistent preflight path.
- Refactored download controller resilience with transient-only retries (up to 3 attempts), normalized error codes, and coherent `retryCount` updates.
- Added known-size pre-download storage-limit checks while preserving final post-download enforcement.
- Simplified CommandCenter idle UI to one compact essential bar: `Folder`, `Tag`, `Actions`, `Clear`.
- Implemented sticky deterministic prefix behavior for `/`, `#`, `>`, `:`, and `@`, including mixed-prefix normalization and better paste/delete transitions.
- Added keyboard interaction improvements:
  - `Alt+1` Folder mode
  - `Alt+2` Tag mode
  - `Alt+3` Actions mode
  - layered `Esc` / `Backspace` cancel flow
- Improved copy/share UX by preferring actual file clipboard copy where supported and sanitizing shared links for cleaner URLs.
- Included standalone PWA polish and dock interaction stability refinements.

### v0.8.3 - PWA + Discoverability Polish (`2026-02-21`)

- Added copy/download actions for files and folders, including mixed-selection flows.
- Improved floating dock behavior for mobile/PWA ergonomics and responsiveness.
- Fixed Offline Library availability while fully offline by adding a static fallback page (`/offline-library.html`) that reads cached files directly from local storage.
- Added offline-aware routing so Offline Library actions open fallback content during disconnect and return to app route behavior after reconnect.
- Updated service worker shell cache behavior to precache offline fallback pages and resolve `/offline-library` to offline-safe content when network requests fail.
- Updated favicon wiring across browser, Apple touch, and Android launcher contexts.
- Improved site manifest metadata and install shortcuts for better PWA install UX.
- Added richer page-level metadata (titles, descriptions, canonical URLs) across key routes.
- Improved deep-link metadata for dynamic folder and tag pages.
- Included minor release-hardening fixes and cleanup.

### v0.8.2 - Greeting System Upgrade (`2026-02-21`)

- Replaced static quote header with a dynamic time-based greeting system on dashboard.
- Added greeting generation with primary + secondary message structure and weather-aware nudges.
- Added new Greeting settings section with:
  - Show Greeting
  - Weather Forecast (Open-Meteo)
  - Use My Name
  - Greeting Style (`study`, `motivational`, `minimal`)
- Added `greetingPreferences` settings object for persistent greeting personalization.
- Added Study Mode message pools for six time periods with focused study-specific guidance.
- Added anonymous-name grammar handling so disabled name mode reads naturally (for example, `Good morning!`).

### v0.8.1 - Share Reliability Update (`2026-02-21`)

- Stabilized zipping for single folders, multiple folders, and mixed file/folder selections.
- Reworked prepare pipeline to resolve nested folder entries before zip/share.
- Replaced plain toast-style progress with dialog-driven preparation/progress feedback.
- Reduced share-start delay by showing preparation UI immediately after tap/click.
- Added top-right page share action to share current route + active filters/query state.
- Introduced custom version system and release banner with `View Changelog` + `Dismiss`.

### v0.8.0 - Offline + Command Scope Expansion (`2026-02-20`)

- Improved nested-scope command search behavior for local and global flows.
- Improved offline coverage indicators for nested folder structures.
- Refined command scope switching behavior for `/` and `#`.
- Improved mobile responsiveness for command and storage surfaces.

### v0.7.0 - Storage Location System (`2026-02-16`)

- Added offline storage location setup and relink/migration support.
- Added storage fallback handling for restricted browser/PWA environments.
- Added storage diagnostics in settings and storage management views.

### v0.6.0 - Theme + Settings Upgrade (`2026-02-12`)

- Expanded theme and settings controls.
- Improved settings navigation, structure, and consistency.

### v0.5.0 - Offline Runtime Foundation (`2026-02-08`)

- Added offline runtime sync/cache primitives and resiliency behavior.
- Introduced stronger local-first access helpers.

### v0.4.0 - Tagging and Selection (`2026-02-04`)

- Added stronger multi-entity tag and selection workflows.
- Improved file/folder contextual action coverage.

### v0.3.0 - Downloads + Commands (`2026-01-31`)

- Expanded download state handling and command result quality.
- Improved grouped transfer tracking.

### v0.2.0 - UI Platform Build-Out (`2026-01-24`)

- Established reusable UI primitives, interaction patterns, and shared components.

### v0.1.0 - Initial Release (`2026-01-18`)

- Launched baseline app shell, routing, and core browsing experience.

## Technology Stack

| Layer | Implementation |
| :--- | :--- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, Framer Motion, Tabler Icons |
| State | Zustand |
| Persistence | IndexedDB, File System Access API |
| Local AI | `@huggingface/transformers` (Web Worker + WebAssembly/WebGPU) |
| Cloud | Google Drive API, Open-Meteo (greeting weather context) |
| Caching | Redis + in-memory fallback |
| Compression | `fflate` (client zip generation) |

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (recommended for production cache/rate-limit behavior)
- Google Cloud service account with Drive read permissions

### Install

```bash
git clone https://github.com/sh1shank/studytrix.git
cd studytrix
npm install
```

### Configure

Create `.env.local` from `.env.local.example`. Keep Google private key line breaks intact.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build Verification (CI/Sandbox)

If remote Google Font fetches are blocked during build verification, run:

```bash
NEXT_DISABLE_REMOTE_FONTS=1 npm run build
```

This switches layout font loading to local assets for deterministic verification runs.

## Documentation Index

- [Features](./FEATURES.md)
- [Architecture](./ARCHITECTURE.md)
- [System Context](./SYSTEM_CONTEXT.md)
- [Visual System](./VISUAL_SYSTEM.md)
- [Local Models Integration](./LOCAL_MODELS.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)

## License

Licensed under MIT. See [LICENSE.md](./LICENSE.md).
