import { getBlob as getOfflineBlob } from "@/features/offline/offline.access";
import {
  SUMMARIZE_MAX_INPUT_CHARS,
  SUMMARIZE_MIN_TEXT_LENGTH,
  buildExtractiveSummary,
  sanitizeSummarizeText,
} from "@/features/intelligence/summarize.shared";

import { extractPDFText } from "./extractors/extractor.pdf";

const SUMMARIZE_REQUEST_TIMEOUT_MS = 20_000;
const SUMMARIZE_RETRY_DELAYS_MS = [500, 1500] as const;

type SummarizeErrorPayload = {
  error?: unknown;
  code?: unknown;
  message?: unknown;
};

type SummarizeSuccessPayload = {
  summary?: unknown;
  source?: unknown;
};

export type SummarizeResult = {
  summary: string;
  source: "gemini" | "server-fallback" | "client-fallback";
};

function normalizeErrorCode(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "SUMMARIZE_FAILED";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    || "SUMMARIZE_FAILED";
}

function resolveThrownErrorCode(error: unknown): string {
  if (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") {
    return "TIMEOUT";
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "TIMEOUT";
    }

    const normalized = normalizeErrorCode(error.message);
    if (normalized.includes("ABORT")) {
      return "TIMEOUT";
    }

    if (normalized.includes("FAILED_TO_FETCH")) {
      return "NETWORK_ERROR";
    }

    return normalized;
  }

  return "NETWORK_ERROR";
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function extractTextForSummary(rawText: string): string {
  return sanitizeSummarizeText(rawText, SUMMARIZE_MAX_INPUT_CHARS);
}

function shouldFallbackToLocalSummary(errorCode: string): boolean {
  return errorCode !== "NO_TEXT_CONTENT"
    && errorCode !== "INSUFFICIENT_TEXT_CONTENT"
    && errorCode !== "FILE_FETCH_FAILED";
}

function isRetryableErrorCode(errorCode: string): boolean {
  return errorCode === "TIMEOUT"
    || errorCode === "NETWORK_ERROR"
    || errorCode === "SERVER_ERROR"
    || errorCode === "SUMMARIZE_FAILED";
}

async function resolvePDFBlob(fileId: string): Promise<Blob> {
  const offlineBlob = await getOfflineBlob(fileId).catch(() => null);
  if (offlineBlob) {
    return offlineBlob;
  }

  const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("FILE_FETCH_FAILED");
  }

  const blob = await response.blob().catch(() => null);
  if (!blob || blob.size <= 0) {
    throw new Error("FILE_FETCH_FAILED");
  }

  return blob;
}

async function fetchSummarizeApi(text: string): Promise<SummarizeResult> {
  let lastErrorCode = "SUMMARIZE_FAILED";

  for (let attempt = 0; attempt <= SUMMARIZE_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      controller.abort();
    }, SUMMARIZE_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as SummarizeErrorPayload;
        const rawCode = payload.code ?? payload.error ?? payload.message;
        lastErrorCode = normalizeErrorCode(rawCode);

        if (attempt < SUMMARIZE_RETRY_DELAYS_MS.length && response.status >= 500) {
          await sleep(SUMMARIZE_RETRY_DELAYS_MS[attempt]);
          continue;
        }

        throw new Error(lastErrorCode);
      }

      const payload = await response.json().catch(() => ({})) as SummarizeSuccessPayload;
      if (typeof payload.summary !== "string" || payload.summary.trim().length === 0) {
        lastErrorCode = "SUMMARIZE_FAILED";
        throw new Error(lastErrorCode);
      }

      const source = typeof payload.source === "string"
        ? payload.source
        : "";

      return {
        summary: payload.summary,
        source: source === "gemini" ? "gemini" : "server-fallback",
      };
    } catch (error) {
      lastErrorCode = resolveThrownErrorCode(error);

      if (attempt < SUMMARIZE_RETRY_DELAYS_MS.length && isRetryableErrorCode(lastErrorCode)) {
        await sleep(SUMMARIZE_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      break;
    } finally {
      window.clearTimeout(timer);
    }
  }

  throw new Error(lastErrorCode);
}

async function extractSummarizeTextFromPdf(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const fastPass = await extractPDFText(arrayBuffer, { maxPages: 6, minChars: 0, maxChars: 12000 });
  const fastText = extractTextForSummary(fastPass.text);
  if (fastText.length >= SUMMARIZE_MIN_TEXT_LENGTH) {
    return fastText;
  }

  const deepPass = await extractPDFText(arrayBuffer, { maxPages: 14, minChars: 0, maxChars: SUMMARIZE_MAX_INPUT_CHARS });
  const text = extractTextForSummary(deepPass.text);
  if (!text) {
    throw new Error("NO_TEXT_CONTENT");
  }

  return text;
}

export async function summarizePDF(fileId: string): Promise<SummarizeResult> {
  const blob = await resolvePDFBlob(fileId);
  const text = await extractSummarizeTextFromPdf(blob);
  if (text.length < SUMMARIZE_MIN_TEXT_LENGTH) {
    throw new Error("INSUFFICIENT_TEXT_CONTENT");
  }

  try {
    return await fetchSummarizeApi(text);
  } catch (error) {
    const errorCode = error instanceof Error ? normalizeErrorCode(error.message) : "SUMMARIZE_FAILED";
    if (!shouldFallbackToLocalSummary(errorCode)) {
      throw new Error(errorCode);
    }

    return {
      summary: buildExtractiveSummary(text),
      source: "client-fallback",
    };
  }
}
