import { beforeEach, inject } from "vitest";
import { redis } from "@/lib/redis";

export const hasRedis = Boolean(inject("redisUrl"));

/** Flushes this worker's database before each test. */
export const useCleanRedis = () => {
    beforeEach(async () => {
        await redis.flushdb();
    });
};
