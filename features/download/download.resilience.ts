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
    if (remoteCode === "FILE_NOT_FOUND") {
      return "NOT_FOUND";
    }
    if (remoteCode === "FILE_ACCESS_DENIED") {
      return "ACCESS_DENIED";
    }
    if (remoteCode === "INVALID_FILE_ID") {
      return "INVALID_ID";
    }
    if (
      remoteCode === "UNSUPPORTED_EXPORT"
      || remoteCode === "UNSUPPORTED_FILE_TYPE"
      || remoteCode === "RANGE_NOT_SUPPORTED"
    ) {
      return "UNSUPPORTED_TYPE";
    }
  }

  const text = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  if (text.includes("offline storage limit") || text.includes("quota") || text.includes("storage limit")) {
    return "QUOTA";
  }

  if (includesAny(text, ["not found", "404"])) {
    return "NOT_FOUND";
  }

  if (includesAny(text, ["access denied", "403", "forbidden", "permission"])) {
    return "ACCESS_DENIED";
  }

  if (includesAny(text, ["invalid file id", "invalid id", "400"])) {
    return "INVALID_ID";
  }

  if (includesAny(text, ["unsupported export", "unsupported file type", "415"])) {
    return "UNSUPPORTED_TYPE";
  }

  if (includesAny(text, ["rate limit", "429"])) {
    return "RATE_LIMITED";
  }

  if (includesAny(text, ["you are offline", "waiting for connection", "offline"])) {
    return "OFFLINE";
  }

  if (isTransientDownloadError(error) || includesAny(text, ["network", "offline", "connection"])) {
    return "NETWORK";
  }

  return "UNKNOWN";
}

export function computeRetryDelayMs(attempt: number, options?: { baseMs?: number; capMs?: number; jitterRatio?: number }): number {
  const base = Math.max(50, Math.floor(options?.baseMs ?? 350));
  const cap = Math.max(base, Math.floor(options?.capMs ?? 3_500));
  const jitterRatio = Math.max(0, Math.min(0.5, options?.jitterRatio ?? 0.2));

  const exponential = Math.min(cap, base * (2 ** Math.max(0, attempt - 1)));
  const jitter = exponential * jitterRatio * Math.random();
  return Math.min(cap, Math.floor(exponential + jitter));
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
