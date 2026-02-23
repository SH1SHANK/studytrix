# Local Models in Studytrix

Studytrix runs intelligence features entirely on-device using a dedicated Web Worker and `@huggingface/transformers@4.0.0-next.4`. No semantic query or cleanup text is sent to external inference APIs.

## What Runs Locally

### 1. Semantic Search Embeddings

- Task: `feature-extraction`
- Primary models:
  - `Xenova/all-MiniLM-L6-v2`
  - `Xenova/bge-small-en-v1.5`
- Usage:
  - CommandCenter semantic indexing (`INDEX_DOCS`)
  - Query embeddings (`QUERY`)

### 2. OCR Cleanup (Denoising)

- Tasks:
  - `text2text-generation` for T5 models
  - `summarization` for BART
- Models (settings-selectable):
  - `Lite`: `Xenova/t5-tiny` (~15MB)
  - `Balanced`: `Xenova/t5-small` (~40MB)
  - `Pro`: `Xenova/bart-base-cnn` (~100MB)
- Usage:
  - File Manager `Copy Contents` flow for OCR-derived text (`CLEAN_TEXT`)

## Worker Multiplexing and Model Lifecycle

The single worker multiplexes search + cleanup pipelines:

- `INIT` / `SET_MODEL`: semantic runtime
- `SWITCH_MODEL`: cleanup runtime
- `INDEX_DOCS` / `QUERY`: semantic indexing and retrieval
- `CLEAN_TEXT`: OCR denoising

Model runtimes are singleton-managed:

- Existing runtime reused when model ID matches.
- Previous cleanup runtime is disposed before loading the next model.
- Semantic model switches invalidate incompatible vectors so stale embeddings are not reused.
- Cleanup runtime is terminated on persist/clear flows to release memory pressure.

## Runtime Backends and Fallbacks

Model execution prefers GPU acceleration and degrades safely:

1. Try `webgpu` when available.
2. Fallback to `wasm`.
3. If semantic pipeline cannot load, fallback hashed embeddings are used for non-blocking search behavior.
4. If cleanup model cannot load, `Copy Contents` falls back to original OCR text.

## Download Progress and UX Feedback

The worker emits event-based lifecycle feedback:

- `MODEL_DOWNLOAD_PROGRESS`
- `MODEL_PIPELINE_STATUS`

These events drive:

- CommandCenter setup indicators for semantic model provisioning.
- Settings `Model Activity` panel with animated semantic + cleanup progress bars.
- Status badges (`loading`, `ready`, `error`) and transient success/error feedback messages.

## OCR Cleanup Guardrails

To prevent over-aggressive rewriting:

- T5 prompts use `fix errors:` prefix.
- Generation uses deterministic settings:
  - `temperature: 0`
  - `repetition_penalty: 1.2`
- If cleaned output is too short (less than 40% of input length), output is discarded and original OCR text is copied.

## Persistence

- Selected cleanup model is persisted locally (`localStorage`).
- Semantic index snapshots are persisted in IndexedDB.
- Model artifacts are cached by the browser runtime used by Transformers.

## Privacy

All semantic embedding, OCR cleanup, and model inference steps execute in-browser. Studytrix does not ship user OCR text or search intent to third-party model endpoints.
