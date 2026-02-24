# Local Models in Studytrix

Studytrix runs semantic search indexing and retrieval on-device in a dedicated Web Worker using `@huggingface/transformers@4.0.0-next.4`.

> Updated in `v0.9.4-experimental` with repository-partitioned scope querying and improved setup/indexing UX feedback.

## What Runs Locally

### Semantic Search

- Task: `feature-extraction`
- Default model: `Xenova/bge-small-en-v1.5`
- Worker protocol:
  - `INIT`
  - `INDEX_FILES`
  - `QUERY`
  - `GET_STATS`
  - `CANCEL_INDEXING`
  - `CLEAR_INDEX`
- Query payload includes route-aware scope metadata (`global-root`, `personal-root`, folder subtree) and optional repo filtering.

### Runtime Behavior

- The embedding pipeline is initialized once and reused.
- Model downloads emit `MODEL_DOWNLOAD_PROGRESS` events.
- If model setup fails, the store retries transient failures before surfacing permanent error status.
- Model ID changes invalidate existing vectors and trigger a clean rebuild.

## Persistence

- Semantic vectors are kept in memory and mirrored to IndexedDB.
- Snapshot data is persisted in the intelligence IndexedDB store.
- Model artifacts are cached by browser/runtime cache.
- Incremental file-index updates can be triggered from Service Worker cache events (`FILES_CACHED` → `SW_FILES_CACHED`) without full index rebuilds.

## Privacy

Semantic indexing and query inference run locally. No local semantic index data is sent to external model providers.
