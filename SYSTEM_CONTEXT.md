# System Context

## Purpose

Studytrix is an academic content platform that presents course data, Google Drive-backed study materials, and offline persistence for selected content.

## Product Constraints

- Read-focused workflows: browse, preview, download, and cache.
- Server-only integrations for Google Drive and Redis.
- Predictable API contracts with strict input validation.
- Offline capability without blocking primary online flow.

## Runtime Context

### Browser Context

- UI rendering, interactions, and optimistic local state.
- IndexedDB-backed offline storage.
- Zustand store for download progress and offline availability snapshot.

### Server Context

- App Router route handlers as the only Drive-facing boundary.
- Service account-based Drive access using JWT auth.
- Cache and rate-limit orchestration with Redis + memory fallback.

## Data Sources

### Catalog Source

- File: `data/catalog.json`
- Contains department -> semester -> course structures.
- Validated at runtime before being cached.

### Drive Source

- **Provider**: LaunchPad Community Drive (maintained by the **LaunchPad NITC Community**).
- **Access**: Authorized via senior community members for proxying within Studytrix.
- **Service**: Google Drive API v3.
- Data fetched:
    - Folder child hierarchies with pagination support.
    - Extended file metadata (MIME-specific enrichment).
    - Binary streaming for secure resource access.

### Local Persistence

- **FileSystem Access API**: Native directory handle persistence for high-performance blob management.
- **IndexedDB**: Fallback storage for browsers without native FS API access.
- Stores:
    - `files`: Block-level blob storage and encrypted metadata references.
    - `metadata`: Engine configuration, download rules, and sync registry.

## Core Domain Models

### Catalog Domain

- `Catalog`, `Department`, `Semester`, `Course`
- Course includes `courseCode`, `courseName`, `credits`, `driveFolderId`, `courseType`

### Drive Domain

- `DriveItem`
- `DriveFolderContents`

### File Domain

- `FileMetadata`

### Offline & Bulk Domain

- `OfflineFileRecord`: Persistent descriptor of local availability.
- `DownloadTask`: Canonical unit of work for the priority queue.
- `Zippable`: In-memory transport type for bulk archive generation (`fflate`).
- `StorageStats`: Reactive capacity tracking for the user's local disk.

## API Behavior Guarantees

- Inputs are decoded, normalized, and regex-validated before business logic.
- Invalid format errors return `400`.
- Missing logical resources return `404`.
- Internal/system failures return `500` with generic error text.
- Rate limit breaches return `429`.

## Caching Strategy

- Catalog cache keyed by file `mtime` and served stale on temporary parse/read failures.
- Drive folder cache keyed by folder/page token.
- Metadata cache keyed by file ID with TTL.
- Offline cache persisted as blobs in IndexedDB.

## Integrity and Consistency

- Offline files can carry checksum and modified timestamps.
- Sync pass invalidates stale cached files when remote metadata changes.
- Corrupt/invalid schema data is treated as internal error, not silently patched.

## Abuse and Safety Controls

- Route-level input validation for dynamic params.
- Per-IP rate limiting for Drive-backed endpoints.
- In-flight dedupe to reduce repeated upstream requests.
- Secret isolation in server env vars only.

## Operational Integrity

- **Attendrix Maintenance**: The project is strictly maintained by the Attendrix Team; updates to core Drive proxying or storage abstractions must undergo rigorous testing.
- **Graceful Degradation**: If Redis is unreachable, the system must fall back to local memory caching immediately to prevent downtime.
- **User Privacy**: Local storage handles (FileSystem API) are scoped only to the user-selected directory; Studytrix has no visibility into other system files.
- **Streaming Reliability**: High-volume binary streams use piping to avoid memory pressure, ensuring stability on lower-end mobile devices.
