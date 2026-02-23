# Local AI Models Integration

Studytrix incorporates completely offline, serverless AI capabilities directly within your browser. By utilizing device hardware through WebAssembly (WASM) and WebGPU, Studytrix performs advanced text processing tasks—like semantic search and document error correction—without uploading your data to third-party endpoints.

## The Architecture

Studytrix uses `@huggingface/transformers@4.36.2` to run machine learning models natively in JavaScript. These models run in a dedicated, singleton **Web Worker** (`intelligence.worker.ts`) to avoid blocking the main UI thread.

### Web Worker Multiplexing

The intelligence worker handles multiple machine learning pipelines concurrently:
1.  **`SEARCH_INDEX`**: Generates high-dimensional vector embeddings for file contents to enable concept-based (Semantic) Search.
2.  **`CLEAN_TEXT`**: Employs sequence-to-sequence language models to fix garbled OCR artifacts from scanned documents.

The worker implements a "Pipeline Singleton Map" pattern, acquiring mutual-exclusion locks during model loading to prevent concurrent instantiation races while ensuring that models are disposed of gracefully when the user alters settings or changes limits.

## The Models

Studytrix provides tiered intelligence quality controls under the "Local AI Models" settings panel, allowing users to balance accuracy against network usage (for the initial model download) and system memory consumption.

### Embeddings Pipeline (Semantic Search)
The app uses Xenova's quantized `all-MiniLM-L6-v2`. At less than 25MB, it excels at generating 384-dimensional vector representations of document chunks.

### Denoising Pipeline (AI Cleanup Engine)
The **Cleanup Engine** is triggered during the "Copy Contents" flow on scanned documents. Since OCR on noisy scans (using Tesseract.js) often yields misspellings and formatting errors, Studytrix uses T5-family encoder-decoder models to denoise the text.

The settings menu provides three tiers:
| Tier       | Model                           | Size   | Use Case |
| ---------- | ------------------------------- | ------ | -------- |
| **Lite**   | `Xenova/t5-tiny` (q4)           | ~15MB  | Mobile devices, strict data caps |
| **Balanced**| `Xenova/t5-small` (q4)         | ~40MB  | Default. Excellent error correction speed. |
| **Pro**    | `Xenova/bart-base-cnn` (q4)     | ~100MB | High-fidelity recovery of academic layouts. |

> **Note:** Models are downloaded directly from the Hugging Face hub on their first execution. The browser's native Cache API persistently stores them locally. Subsequent executions, even after app uninstalls or offline sessions, are instantaneous.

## OCR & Sanity Guards

Running generative models on raw text includes the risk of "hallucinations" (where the model creatively alters facts instead of just fixing spelling). To enforce accuracy inside an academic workspace:

1.  **Inference Parameters**: The models operate at a generation `temperature=0` (greedy decoding) with `repetition_penalty=1.2` to ensure deterministic, grounded outputs.
2.  **Explicit Prompting**: The engine prefixes all payloads with a rigid `fix errors: ` prompt, anchoring the T5 model strictly in its grammatical denoising objective rather than broader summarization or paraphrasing tasks.
3.  **The Sanity Check**: After the text is generated, proper length validation occurs. If the AI output length is less than 40% of the input's bounding box text density, Studytrix discards the generated text and falls back to the original OCR stream to prevent data suppression.

## Storage and Compatibility

Local AI integration relies heavily on WebGL and WebGPU acceleration (if enabled). Devices without dedicated hardware support will default to standard WebAssembly single-threaded execution, causing slower processing times.

You can observe active model loading bars and processing indicators inside the Command Center and the offline storage page, providing transparency into resource availability and execution.
