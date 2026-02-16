import { redis } from "@/lib/redis.server";

const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;
const MAX_REQUESTS = 60;

function normalizeIp(ip: string): string {
  const normalized = ip.trim();
  if (!normalized) {
    return "unknown";
  }
  return normalized.slice(0, 128);
}

export async function enforceRateLimit(ip: string): Promise<void> {
  const safeIp = normalizeIp(ip);
  const key = `rate:${safeIp}`;

  const now = Date.now();
  const minScore = now - WINDOW_MS;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const transaction = redis.multi();

    transaction.zremrangebyscore(key, 0, minScore);
    transaction.zadd(key, now, member);
    transaction.zcard(key);
    transaction.expire(key, WINDOW_SECONDS);

    const results = await transaction.exec();

    if (!results) {
      throw new Error("Rate limit transaction failed");
    }

    const countResult = results[2]?.[1];
    const count =
      typeof countResult === "number"
        ? countResult
        : Number(countResult ?? 0);

    if (!Number.isFinite(count)) {
      throw new Error("Rate limit transaction failed");
    }

    if (count > MAX_REQUESTS) {
      throw new Error("Rate limit exceeded");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Rate limit exceeded") {
      throw error;
    }

    throw new Error("Rate limit check failed");
  }
}
