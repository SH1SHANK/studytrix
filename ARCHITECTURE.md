# Architecture

## System Overview

Studytrix uses a layered App Router architecture:

1. UI components issue requests to internal API routes.
2. Route handlers validate input and enforce abuse controls.
3. Feature services call Google Drive and normalize data.
4. Cache/rate-limit modules reduce upstream load.
5. Offline modules persist selected content in IndexedDB.

## Runtime Boundaries

### Server Runtime (Node.js)

- `app/api/catalog/[department]/[semester]/route.ts`
- `app/api/drive/[folderId]/route.ts`
- `app/api/file/[fileId]/metadata/route.ts`
- `app/api/file/[fileId]/stream/route.ts`
- `lib/drive.server.ts`, `lib/drive.client.ts`, `lib/redis.server.ts`
- `features/drive/*`, `features/file/*`

### Client Runtime

- Dashboard, folder/file manager, command bar, and popovers (`components/*`).
- Hook/store-driven state and interactions (`features/*/*.hooks.ts`, Zustand stores).
- Offline orchestration modules (`features/offline/*`) built for browser APIs.

## API Layer Contracts

### Catalog Endpoint

- Path: `/api/catalog/[department]/[semester]`
- Source: `data/catalog.json`
- Returns: `{ courses: Course[] }`
- Validation:
  - Department: uppercase ASCII letters only
  - Semester: bounded positive integer
- Error contract: `400`, `404`, `500`

### Drive Folder Endpoint

- Path: `/api/drive/[folderId]?pageToken=...`
- Returns: `{ items: DriveItem[], nextPageToken?: string }`
- Features:
  - Folder ID validation
  - Per-IP rate limiting
  - Cache lookup + request dedupe
  - Paginated Drive listing

### File Metadata Endpoint

- Path: `/api/file/[fileId]/metadata`
- Returns: `{ metadata: EnrichedFileMetadata }`
- Features:
  - Input validation
  - Metadata enrichment and cache
  - Rate-limit enforcement

### File Stream Endpoint

- Path: `/api/file/[fileId]/stream`
- Returns: streamed binary response
- Features:
  - Safe content headers
  - Drive binary proxy without exposing credentials
  - Rate-limit enforcement

## Feature Module Layout

### `features/drive`

- `drive.service.ts`: Drive folder-list orchestration
- `drive.cache.ts`: cache and in-flight request dedupe
- `drive.rateLimit.ts`: Redis/memory rate limiting
- `drive.types.ts`: normalized transport types

### `features/file`

- `file.service.ts`: metadata orchestration
- `file.enrich.ts`: MIME-specific enrichers and formatting
- `file.cache.ts`: TTL metadata cache
- `file.types.ts`: strict metadata union types

### `features/offline`

- `offline.db.ts`: IndexedDB abstraction
- `offline.rules.ts`: pure download eligibility rules
- `offline.queue.ts`: concurrent priority queue
- `offline.prefetch.ts`: low-priority prefetch logic
- `offline.search.ts`: offline text index/search
- `offline.integrity.ts`: checksum/integrity checks
- `offline.sync.ts`: stale cache invalidation against remote metadata
- `offline.service.ts`: orchestration layer
- `offline.store.ts`: reactive state adapter for UI

## Caching and Rate Limiting

- Folder and metadata APIs use cache-first behavior when safe.
- Redis is preferred in production; memory fallback keeps local/dev stable.
- Request dedupe prevents thundering herd on repeated folder requests.
- Per-IP rate limiting protects Google Drive project quota.

## Security Model

- Credentials are read from server env vars only.
- No service account secrets are exposed in client bundles.
- All dynamic route params are validated before service execution.
- Client error payloads are intentionally generic for internal failures.

## Scalability and Reliability

- Streamed binary responses reduce memory pressure.
- Bounded download concurrency avoids browser and network saturation.
- Offline storage supports cleanup and invalidation workflows.
- Schema validation and defensive key checks reduce data corruption risk.
