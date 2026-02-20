export type QueryCacheDomain =
  | "catalog:index"
  | "catalog:semester"
  | "drive:folder"
  | "file:metadata"
  | "drive:nested-index";

export type QueryCachePolicy = {
  expiresInMs: number;
  maxStaleInMs: number;
};

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const DAY = 24 * HOUR;

const POLICY_BY_DOMAIN: Record<QueryCacheDomain, QueryCachePolicy> = {
  "catalog:index": {
    expiresInMs: 6 * HOUR,
    maxStaleInMs: 7 * DAY,
  },
  "catalog:semester": {
    expiresInMs: 24 * HOUR,
    maxStaleInMs: 14 * DAY,
  },
  "drive:folder": {
    expiresInMs: 15 * MINUTE,
    maxStaleInMs: 48 * HOUR,
  },
  "file:metadata": {
    expiresInMs: 24 * HOUR,
    maxStaleInMs: 7 * DAY,
  },
  "drive:nested-index": {
    expiresInMs: 30 * MINUTE,
    maxStaleInMs: 72 * HOUR,
  },
};

export type QueryCacheLiveness = "fresh" | "stale" | "expired";

export function resolveQueryCacheDomain(key: string): QueryCacheDomain | null {
  if (key === "catalog:index") {
    return "catalog:index";
  }

  if (key.startsWith("catalog:semester:")) {
    return "catalog:semester";
  }

  if (key.startsWith("drive:folder:")) {
    return "drive:folder";
  }

  if (key.startsWith("file:metadata:")) {
    return "file:metadata";
  }

  if (key.startsWith("drive:nested-index:")) {
    return "drive:nested-index";
  }

  return null;
}

export function getQueryCachePolicy(key: string): QueryCachePolicy {
  const domain = resolveQueryCacheDomain(key) ?? "drive:folder";
  return POLICY_BY_DOMAIN[domain];
}

export function resolveQueryCacheWindow(
  key: string,
  now = Date.now(),
): { expiresAt: number; maxStaleAt: number } {
  const policy = getQueryCachePolicy(key);
  return {
    expiresAt: now + policy.expiresInMs,
    maxStaleAt: now + policy.maxStaleInMs,
  };
}

export function getQueryCacheLiveness(
  now: number,
  expiresAt: number,
  maxStaleAt: number,
): QueryCacheLiveness {
  if (now <= expiresAt) {
    return "fresh";
  }

  if (now <= maxStaleAt) {
    return "stale";
  }

  return "expired";
}
