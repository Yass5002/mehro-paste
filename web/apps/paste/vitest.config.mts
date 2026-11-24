import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        include: ["tests/**/*.test.{ts,tsx}"],
        environment: "node",
        globalSetup: ["tests/setup/redisServer.ts"],
        setupFiles: ["tests/setup/env.ts"],
        // Argon2id with MODERATE limits (256 MiB) is slow in WASM.
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
});
