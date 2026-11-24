import { afterAll, inject } from "vitest";

// `@/lib/redis` reads REDIS_URL at import time, so this must run before any
// test file imports the API handlers.
//
// Each concurrently running worker gets its own logical database so files can
// flush between tests without clobbering each other. When Redis tests are
// skipped, point at an unroutable port so nothing can ever reach a developer's
// real instance on the default port.
const redisUrl = inject("redisUrl");
const workerDb = Number(process.env.VITEST_POOL_ID ?? "1") % 16;
process.env.REDIS_URL = redisUrl ? `${redisUrl}/${workerDb}` : "redis://127.0.0.1:1";

afterAll(async () => {
    // Imported lazily so REDIS_URL above is set first. The client connects
    // lazily, so this is a no-op for files that never touched Redis.
    const { redis } = await import("@/lib/redis");
    redis.disconnect();
});
