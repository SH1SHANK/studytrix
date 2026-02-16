import { redis } from "@/lib/redis.server";

const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;
const MAX_REQUESTS = 50;

const inMemoryHits = new Map<string, number[]>();

function normalizeIp(ip: string): string {
  const normalized = ip.trim();
  if (!normalized) {
    return "unknown";
  }

  return normalized.slice(0, 128);
}

function enforceInMemoryLimit(ip: string): void {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits = inMemoryHits.get(ip) ?? [];
  const recentHits = hits.filter((timestamp) => timestamp > cutoff);

  if (recentHits.length >= MAX_REQUESTS) {
    throw new Error("Rate limit exceeded");
  }

  recentHits.push(now);
  inMemoryHits.set(ip, recentHits);
}

export async function enforceDriveRateLimit(ip: string): Promise<void> {
  const safeIp = normalizeIp(ip);
  const key = `drive:rate:${safeIp}`;

  const now = Date.now();
  const minScore = now - WINDOW_MS;
  const member = `${now}-${Math.random().toString(36).slice(2, 12)}`;

  try {
    const transaction = redis.multi();
    transaction.zremrangebyscore(key, 0, minScore);
    transaction.zadd(key, now, member);
    transaction.zcard(key);
    transaction.expire(key, WINDOW_SECONDS);

    const results = await transaction.exec();
    if (!results) {
      enforceInMemoryLimit(safeIp);
      return;
    }

    const countValue = results[2]?.[1];
    const count =
      typeof countValue === "number" ? countValue : Number(countValue ?? 0);

    if (!Number.isFinite(count)) {
      enforceInMemoryLimit(safeIp);
      return;
    }

    if (count > MAX_REQUESTS) {
      throw new Error("Rate limit exceeded");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Rate limit exceeded") {
      throw error;
    }

    enforceInMemoryLimit(safeIp);
  }
}
