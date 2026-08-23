import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const globalForRedis = global as unknown as { redis?: Redis };

export const redis =
    globalForRedis.redis ??
    new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        lazyConnect: true,
    });

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
}

export const PASTE_KEY_PREFIX = "paste:";
export const DEFAULT_PASTE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
