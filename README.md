# Studytrix

Studytrix is a Next.js App Router academic workspace for browsing department course catalogs, navigating Drive-backed study material, enriching file metadata for previews, and supporting offline-first workflows.

## What It Provides

- Department and semester-aware dashboard navigation.
- Static catalog API from `data/catalog.json` with strict runtime validation.
- Secure, server-only Google Drive folder listing and file proxy routes.
- Rich file metadata enrichment:
  - PDF page count
  - PPTX slide count
  - Image dimensions
- Offline subsystem with IndexedDB storage, queueing, integrity checks, and search indexing.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript (strict)
- Tailwind CSS v4
- Google Drive API (`googleapis`) via service account JWT
- Redis (`ioredis`) with memory fallback for cache/rate limiting
- IndexedDB (`idb`) for offline blobs and local indexes
- Zustand for reactive offline state

## API Surface

- `GET /api/catalog/[department]/[semester]`
- `GET /api/drive/[folderId]?pageToken=...`
- `GET /api/file/[fileId]/metadata`
- `GET /api/file/[fileId]/stream`

## Environment Variables

Required for server routes:

```bash
GOOGLE_DRIVE_CLIENT_EMAIL=
GOOGLE_DRIVE_PRIVATE_KEY=
```

Optional:

```bash
FILE_METADATA_CACHE_TTL=86400
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

Notes:

- Keep all keys server-side only.
- `GOOGLE_DRIVE_PRIVATE_KEY` should preserve line breaks (`\\n` escaped in env files).

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Validation Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Documentation Index

- `FEATURES.md`: product and platform capabilities
- `ARCHITECTURE.md`: system layers, modules, and data flow
- `SYSTEM_CONTEXT.md`: runtime behavior and operational contracts
- `VISUAL_SYSTEM.md`: design language, interaction patterns, motion
