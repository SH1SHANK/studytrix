# Features

## Versioning and Release Visibility

- Version source: `features/version/version.ts`.
- Changelog source: `features/changelog/changelog.catalog.ts`.
- In-app version banner appears after version bumps.
- Dedicated changelog page: `/changelog`.
- Current version label is visible in the app shell.

## Current Focus (`v0.9.4-experimental` + rolling updates)

- Personal Repository evolved into a local-first workspace layer.
- Added Smart Collections, pinned files shelf, and Study Sets.
- Added local device folder support with reconnect/permission flows.
- Added unified link import flow for Studytrix shared links and Drive links.
- Added code-aware preview and organization improvements.
- Refined action hierarchy and dialog/sheet continuity in Personal Repository.

## Local-First Personal Repository

- No user login/auth flow is required for app usage.
- Folder sources:
  - Link import (Studytrix share link or Drive folder link via one input flow).
  - Local device folder (File System Access API + PWA support gate).
  - App-created local virtual folders.
- Permission-aware local folder reconnect banners.
- Visibility-based auto-refresh for stale local folder scans.
- Folder health states for sync freshness/offline readiness/error guidance.

## Personal Organization Layers

- Smart Collections generated from personal embeddings and clustering.
- Pinned files shelf with ordering and max-pin guardrails.
- Study Sets for cross-folder custom bundles.
- Tag suggestions and accepted-tag filtering in Personal Repository context.

## Personal Primary Actions UX

- Header-first primary action strip for:
  - Add Folder
  - Create Folder
  - Quick Capture
  - New Study Set
- Folder Health treated as secondary action.
- Dialogs/sheets use a consistent mobile bottom-sheet pattern and centered desktop modal behavior.

## Quick Capture

- Modes:
  - Photo
  - Text note
  - Voice note
- Save destination picker tied to personal folders.
- Local-first persistence path for captures.
- Draft/restore behavior for note capture.
- Voice recording preview and limit safeguards.

## Code File Experience

- Extension-based code detection and language labeling.
- In-app code preview with lazy-loaded `highlight.js`.
- Safer notebook (`.ipynb`) rendering behavior with constrained output handling.
- Code-aware search/result rendering improvements for personal files.

## Command Center and Search Scope

- Scope prefixes:
  - `/` folder scope
  - `#` tag scope
  - `:` domain scope
  - `>` actions scope
  - `@` recents scope
- Breadcrumb-driven scope state for predictable navigation/search behavior.
- Cross-repository semantic suggestions in global scope.
- Deep nested indexing coverage for repository structures.

## Offline and Storage Engine

- Storage abstraction:
  - File System Access API (when available)
  - IndexedDB fallback
- Offline Library fallback page: `/offline-library.html`.
- Storage setup, relink, migration, and diagnostics.
- Local queue persistence for background operation bookkeeping.

## AI and Local Intelligence

- On-device semantic search model runtime.
- On-device cleanup model runtime for OCR text post-processing.
- Worker-based indexing and model lifecycle progress updates.
- Incremental indexing paths for personal repository additions/changes.

## Bulk Operations, Sharing, and Transfer Safety

- Mixed file/folder selection expansion for reliable zip/share pipelines.
- Dialog-driven transfer preparation/progress feedback.
- Large-file risk gates for download/share flows.
- Personal folder share-link generation and import handling.
- Local analytics for share-link copy/open actions.

## API and Runtime Safety

- Drive-backed global repository routes run through server handlers.
- Identifier validation and normalized error responses across route handlers.
- Request dedupe and cache-first behavior where appropriate.
- Type-safe stores, strict TypeScript, and defensive client runtime guards.

