import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import Redis from "ioredis";
import type { TestProject } from "vitest/node";

declare module "vitest" {
    export interface ProvidedContext {
        redisUrl: string | null;
    }
}

const getFreePort = () =>
    new Promise<number>((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            server.close(() => resolve(port));
        });
    });

const waitForRedis = async (url: string, timeoutMs = 10_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const client = new Redis(url, {
            lazyConnect: true,
            maxRetriesPerRequest: 0,
            retryStrategy: () => null,
        });
        client.on("error", () => {
            // Expected while the server is still starting up.
        });
        try {
            await client.connect();
            await client.ping();
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        } finally {
            client.disconnect();
        }
    }
    throw new Error(`Redis at ${url} did not become ready`);
};

/**
 * Integration tests run against a throwaway `redis-server` on a random port so
 * they never touch a developer's real Redis. Set TEST_REDIS_URL to point at a
 * dedicated (flushable!) instance instead, e.g. in CI.
 */
export default async function setup(project: TestProject) {
    const explicitUrl = process.env.TEST_REDIS_URL;
    if (explicitUrl) {
        await waitForRedis(explicitUrl);
        project.provide("redisUrl", explicitUrl);
        return;
    }

    const port = await getFreePort();
    let child: ChildProcess;
    try {
        child = spawn(
            "redis-server",
            ["--port", String(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no"],
            { stdio: "ignore" },
        );
        await new Promise<void>((resolve, reject) => {
            child.once("error", reject);
            child.once("spawn", resolve);
        });
    } catch {
        console.warn(
            "\n[tests] redis-server not found and TEST_REDIS_URL unset: Redis integration tests will be skipped.\n",
        );
        project.provide("redisUrl", null);
        return;
    }

    const url = `redis://127.0.0.1:${port}`;
    await waitForRedis(url);
    project.provide("redisUrl", url);

    return () => {
        child.kill("SIGTERM");
    };
}
