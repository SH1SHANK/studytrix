import type { DownloadErrorCode } from "./download.types";

const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class DownloadRequestError extends Error {
  readonly status?: number;

  readonly remoteErrorCode?: string;

  constructor(message: string, options?: { status?: number; remoteErrorCode?: string }) {
    super(message);
    this.name = "DownloadRequestError";
    this.status = options?.status;
    this.remoteErrorCode = options?.remoteErrorCode;
  }
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

export function isTransientStatusCode(status: number | undefined): boolean {
  return typeof status === "number" && TRANSIENT_STATUS_CODES.has(status);
}

export function isTransientDownloadError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return false;
  }

  if (error instanceof DownloadRequestError) {
    if (isTransientStatusCode(error.status)) {
      return true;
    }

    const remoteCode = (error.remoteErrorCode ?? "").toUpperCase();
    if (remoteCode === "RATE_LIMITED" || remoteCode === "UPSTREAM_UNAVAILABLE") {
      return true;
    }

    return false;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  if (!message) {
    return false;
  }

  return includesAny(message, [
    "network",
    "timed out",
    "timeout",
    "econnreset",
    "failed to fetch",
    "upstream unavailable",
    "rate limit",
    "503",
    "502",
    "500",
  ]);
}

export function classifyDownloadErrorCode(error: unknown): DownloadErrorCode {
  if (error instanceof DownloadRequestError) {
    const remoteCode = (error.remoteErrorCode ?? "").toUpperCase();
    if (remoteCode === "RATE_LIMITED") {
      return "RATE_LIMITED";
    }
    // Drive shortcuts that resolve to a missing target are logically not found from the user's perspective.
    if (remoteCode === "FILE_NOT_FOUND" || remoteCode === "SHORTCUT_TARGET_NOT_FOUND") {
      return "NOT_FOUND";
    }
    if (remoteCode === "FILE_ACCESS_DENIED") {
      return "SERVER_ERROR";
    }
    if (remoteCode === "INVALID_FILE_ID") {
      return "SERVER_ERROR";
    }
    if (remoteCode === "UNSUPPORTED_EXPORT" || remoteCode === "UNSUPPORTED_FILE_TYPE") {
      return "SERVER_ERROR";
    }
    if (error.status === 408) {
      return "TIMEOUT";
    }
    if (typeof error.status === "number" && error.status >= 500) {
      return "SERVER_ERROR";
    }
  }

  const text = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  if (text.includes("offline storage limit") || text.includes("quota") || text.includes("storage limit")) {
    return "QUOTA";
  }

  if (includesAny(text, ["timed out", "timeout"])) {
    return "TIMEOUT";
  }

  if (includesAny(text, ["not found", "404", "access denied", "403", "forbidden", "invalid file id", "400"])) {
    return "SERVER_ERROR";
  }

  if (includesAny(text, ["you are offline", "offline", "connection"])) {
    return "OFFLINE";
  }

  if (isTransientDownloadError(error) || includesAny(text, ["network", "rate limit", "429"])) {
    return "NETWORK_ERROR";
  }

  return "UNKNOWN";
}

export function computeRetryDelayMs(attempt: number, options?: { baseMs?: number; capMs?: number; jitterRatio?: number }): number {
  const fixed = [2_000, 8_000, 30_000];
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  const selected = fixed[Math.min(normalizedAttempt - 1, fixed.length - 1)];
  if (!options) {
    return selected;
  }

  const base = Math.max(50, Math.floor(options.baseMs ?? selected));
  const cap = Math.max(base, Math.floor(options.capMs ?? selected));
  const exponential = base * Math.pow(2, normalizedAttempt - 1);
  const jitter = (options.jitterRatio ?? 0) * exponential * Math.random();
  return Math.min(cap, Math.round(exponential + jitter));
}

export async function waitForRetryDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort);
    }
  });
}
