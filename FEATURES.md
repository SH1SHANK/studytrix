# Features

## Dashboard and Navigation

- Department and semester-scoped academic browsing.
- Folder-first file manager for course material discovery.
- Command-centered interactions for quick navigation and actions (Global vs. Local scope filtering).
- Dynamic "Quote of the Day" powered by API Ninjas with client-side daily caching.
- Contextual entity actions via long-press and persistent grid menus.
- Intelligently sorted lists (starred items pinned to top).

## Catalog API Layer

- Static catalog resolver backed by `data/catalog.json`.
- Hardened route validation for department and semester params.
- Runtime schema validation for departments, semesters, and courses.
- Deterministic error mapping (`400`, `404`, `500`) with safe messages.

## Drive Dynamic Fetch Layer

- Server-only Drive API integration using service account JWT.
- Folder child listing with pagination (`nextPageToken`).
- Request deduplication to reduce repeated upstream calls.
- Cache-first folder responses with Redis/memory fallback.
- Per-IP rate limiting to protect Drive project quota.

## File Preview Metadata Layer

- Raw metadata fetch (`id`, `name`, `mimeType`, `size`, `modifiedTime`).
- Metadata enrichment by MIME type:
  - PDF page count
  - PPTX slide count
  - Image dimensions
- Size/date normalization for display-ready metadata.
- Enriched metadata caching with configurable TTL.
- Binary streaming proxy endpoint with safe headers.

## Offline Engine

- IndexedDB and native FileSystem Access API abstractions for blob persistence.
- Selective download rules (allow/exclude MIME, max size).
- Priority download queue with concurrency control and retry.
- Progressive download updates for UI progress tracking.
- Auto-prefetch of nearby/sibling files.
- Offline text indexing and local search.
- Integrity checksum generation and verification.
- Sync invalidation flow for modified remote files.

## Bulk Operations & Sharing

- Client-side ZIP archive generation (`fflate`) for bulk downloading/sharing.
- Native device sharing via Web Share API fallback mechanism.
- Selection toolbars for batch processing.

## Reliability and Safety

- Strict TypeScript typing across route, service, and domain layers.
- No credential exposure to client code.
- Generic internal error responses (no stack/path leakage).
- Graceful fallback behavior when Redis or IndexedDB is unavailable.

## Performance Characteristics

- Streaming file responses to avoid large memory spikes.
- Bounded queue concurrency for controlled download throughput.
- Request deduplication and cache reuse for hot paths.
- Search result limits and controlled indexing size.
