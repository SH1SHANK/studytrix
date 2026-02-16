import Redis from "ioredis";

declare global {
  var _redis: Redis | undefined;
}

const redisHost = process.env.REDIS_HOST ?? "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const redisPassword = process.env.REDIS_PASSWORD;

export const redis =
  global._redis ??
  new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    tls: {},
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
    autoResubscribe: false,
    lazyConnect: true,
    retryStrategy(attempts) {
      if (attempts > 5) {
        return null;
      }
      return Math.min(attempts * 200, 1_000);
    },
  });

if (process.env.NODE_ENV !== "production") {
  global._redis = redis;
}
