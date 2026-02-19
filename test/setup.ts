import { afterEach, beforeEach, jest } from "@jest/globals";

jest.mock("server-only", () => ({}));

type RedisStringEntry = {
  value: string;
  expiresAt: number | null;
};

type RedisSortedSetState = {
  members: Map<string, number>;
  expiresAt: number | null;
};

const redisStringStore = new Map<string, RedisStringEntry>();
const redisSortedSetStore = new Map<string, RedisSortedSetState>();

function nowMs(): number {
  return Date.now();
}

function getStringValue(key: string): string | null {
  const entry = redisStringStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt !== null && nowMs() >= entry.expiresAt) {
    redisStringStore.delete(key);
    return null;
  }

  return entry.value;
}

function setStringValue(
  key: string,
  value: string,
  mode?: string,
  ttlSeconds?: number,
): "OK" {
  const normalizedMode = mode?.toUpperCase();
  const expiresAt =
    normalizedMode === "EX" && typeof ttlSeconds === "number"
      ? nowMs() + ttlSeconds * 1000
      : null;

  redisStringStore.set(key, {
    value,
    expiresAt,
  });

  return "OK";
}

function getOrCreateSortedSet(key: string): RedisSortedSetState {
  const existing = redisSortedSetStore.get(key);
  if (existing) {
    if (existing.expiresAt !== null && nowMs() >= existing.expiresAt) {
      redisSortedSetStore.delete(key);
    } else {
      return existing;
    }
  }

  const next: RedisSortedSetState = {
    members: new Map<string, number>(),
    expiresAt: null,
  };

  redisSortedSetStore.set(key, next);
  return next;
}

function purgeExpiredSortedSet(key: string): void {
  const entry = redisSortedSetStore.get(key);
  if (!entry) {
    return;
  }

  if (entry.expiresAt !== null && nowMs() >= entry.expiresAt) {
    redisSortedSetStore.delete(key);
  }
}

type RedisCommandResult = [null, unknown];

type RedisMulti = {
  zremrangebyscore: (key: string, min: number, max: number) => RedisMulti;
  zadd: (key: string, score: number, member: string) => RedisMulti;
  zcard: (key: string) => RedisMulti;
  zrange: (
    key: string,
    start: number,
    stop: number,
    withScores?: string,
  ) => RedisMulti;
  expire: (key: string, ttlSeconds: number) => RedisMulti;
  exec: () => Promise<RedisCommandResult[]>;
};

function createMockMulti(): RedisMulti {
  const commands: Array<() => unknown> = [];

  const chain: RedisMulti = {
    zremrangebyscore(key, min, max) {
      commands.push(() => {
        purgeExpiredSortedSet(key);
        const set = getOrCreateSortedSet(key);
        let removed = 0;

        for (const [member, score] of set.members.entries()) {
          if (score >= min && score <= max) {
            set.members.delete(member);
            removed += 1;
          }
        }

        return removed;
      });

      return chain;
    },
    zadd(key, score, member) {
      commands.push(() => {
        const set = getOrCreateSortedSet(key);
        set.members.set(member, score);
        return 1;
      });

      return chain;
    },
    zcard(key) {
      commands.push(() => {
        purgeExpiredSortedSet(key);
        const set = getOrCreateSortedSet(key);
        return set.members.size;
      });

      return chain;
    },
    zrange(key, start, stop, withScores) {
      commands.push(() => {
        purgeExpiredSortedSet(key);
        const set = getOrCreateSortedSet(key);

        const sorted = [...set.members.entries()].sort((a, b) => a[1] - b[1]);
        const normalizedStop = stop >= 0 ? stop : sorted.length + stop;
        const selected = sorted.slice(start, normalizedStop + 1);

        if (withScores?.toUpperCase() === "WITHSCORES") {
          const [first] = selected;
          if (!first) {
            return [] as string[];
          }

          return [first[0], String(first[1])];
        }

        return selected.map((entry) => entry[0]);
      });

      return chain;
    },
    expire(key, ttlSeconds) {
      commands.push(() => {
        const expiresAt = nowMs() + ttlSeconds * 1000;

        const stringEntry = redisStringStore.get(key);
        if (stringEntry) {
          redisStringStore.set(key, {
            ...stringEntry,
            expiresAt,
          });
        }

        const sortedSet = getOrCreateSortedSet(key);
        sortedSet.expiresAt = expiresAt;

        return 1;
      });

      return chain;
    },
    async exec() {
      return commands.map((command) => [null, command()]);
    },
  };

  return chain;
}

const mockRedis = {
  get: jest.fn(async (key: string) => getStringValue(key)),
  set: jest.fn(
    async (key: string, value: string, mode?: string, ttlSeconds?: number) =>
      setStringValue(key, value, mode, ttlSeconds),
  ),
  multi: jest.fn(() => createMockMulti()),
  quit: jest.fn(async () => "OK"),
};

jest.mock("@/lib/redis.server", () => ({
  redis: mockRedis,
}));

const defaultGeminiResponse = {
  candidates: [
    {
      content: {
        parts: [{ text: JSON.stringify({ text: "mock text", confidence: 0.95 }) }],
      },
    },
  ],
};

if (typeof globalThis.fetch !== "function") {
  Object.defineProperty(globalThis, "fetch", {
    value: jest.fn(async () =>
      new Response(JSON.stringify(defaultGeminiResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
    writable: true,
  });
} else {
  globalThis.fetch = jest.fn(async () =>
    new Response(JSON.stringify(defaultGeminiResponse), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  ) as typeof fetch;
}

declare global {
  var createMockFileBuffer: (text?: string) => Buffer;
}

globalThis.createMockFileBuffer = (text: string = "mock") =>
  Buffer.from(text, "utf8");

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  redisStringStore.clear();
  redisSortedSetStore.clear();
});
