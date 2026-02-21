# Studytrix

> **Status**: Beta  
> **Current app version**: `v0.8.2` (released on `2026-02-21`)

Studytrix is an offline-first academic workspace built with Next.js 16, React 19, and TypeScript. It combines Drive-backed content browsing, local persistence, command-driven navigation, and mobile/PWA-aware workflows into a single high-performance interface.

## Product Goals

- Provide reliable access to study material, even with unstable connectivity.
- Keep cloud credentials and privileged access server-only.
- Improve discovery with command scopes, tags, and contextual navigation.
- Support fast, safe bulk actions for download, zip, and share workflows.

## In-App Guide Pages

- `/changelog`: version history from `v0.1.0` to current.
- `/features`: capability overview grouped by platform area.
- `/shortcuts`: keyboard and command-prefix hints.

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

## Documentation Index

- [Features](./FEATURES.md)
- [Architecture](./ARCHITECTURE.md)
- [System Context](./SYSTEM_CONTEXT.md)
- [Visual System](./VISUAL_SYSTEM.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)

## License

Licensed under MIT. See [LICENSE.md](./LICENSE.md).
