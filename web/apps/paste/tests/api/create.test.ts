import { describe, expect, it, vi } from "vitest";
import create from "@/pages/api/paste/create";
import { redis } from "@/lib/redis";
import { MAX_CIPHERTEXT_LENGTH } from "@/lib/pasteLimits";
import { consumeStoredPaste } from "@/lib/pasteStore";
import { call } from "../helpers/http";
import { hasRedis, useCleanRedis } from "../helpers/redis";

const validBody = (overrides: Record<string, unknown> = {}) => ({
    encryptedData: "ZW5jcnlwdGVk",
    decryptionHeader: "aGVhZGVy",
    encryptedPasteKey: "a2V5",
    encryptedPasteKeyNonce: "bm9uY2U=",
    kdfNonce: "c2FsdA==",
    kdfMemLimit: 67_108_864,
    kdfOpsLimit: 2,
    ...overrides,
});

const createdToken = (body: unknown) => (body as { accessToken: string }).accessToken;

describe.skipIf(!hasRedis)("POST /api/paste/create", () => {
    useCleanRedis();

    it("rejects non-POST methods", async () => {
        expect((await call(create, { method: "GET" })).statusCode).toBe(405);
    });

    it("stores a paste and returns a 10-char token with an expiry in milliseconds", async () => {
        const before = Date.now();
        const res = await call(create, { body: validBody({ ttlSeconds: 300 }) });
        expect(res.statusCode).toBe(200);
        const { accessToken, expiresAt } = res.body as { accessToken: string; expiresAt: number };
        expect(accessToken).toMatch(/^[0-9A-Z]{10}$/);
        expect(expiresAt).toBeGreaterThanOrEqual(before + 300_000);
        expect(expiresAt).toBeLessThanOrEqual(Date.now() + 300_000);

        const stored = await consumeStoredPaste(accessToken);
        expect(stored).toMatchObject({ ...validBody(), burnOnRead: true, expiresAt });
    });

    it.each([
        ["missing body", undefined],
        ["array body", [validBody()]],
        ["string body", "x"],
        ["empty ciphertext", validBody({ encryptedData: "" })],
        ["non-string ciphertext", validBody({ encryptedData: ["a"] })],
        ["object ciphertext", validBody({ encryptedData: { length: 1 } })],
        ["missing header", validBody({ decryptionHeader: undefined })],
        ["oversized nonce", validBody({ kdfNonce: "a".repeat(513) })],
        ["non-string key", validBody({ encryptedPasteKey: 123 })],
        ["float ops limit", validBody({ kdfOpsLimit: 2.5 })],
        ["huge ops limit", validBody({ kdfOpsLimit: 1e9 })],
        ["NaN mem limit", validBody({ kdfMemLimit: Number.NaN })],
        ["huge mem limit", validBody({ kdfMemLimit: 1_073_741_824 })],
        ["string mem limit", validBody({ kdfMemLimit: "67108864" })],
    ])("rejects %s", async (_label, body) => {
        const res = await call(create, { body });
        expect(res.statusCode).toBe(400);
        expect(await redis.dbsize()).toBe(0);
    });

    it("rejects ciphertext above the size limit", async () => {
        const res = await call(create, {
            body: validBody({ encryptedData: "A".repeat(MAX_CIPHERTEXT_LENGTH + 1) }),
        });
        expect(res.statusCode).toBe(400);
    });

    it.each([
        [undefined, 86_400],
        [1, 60],
        [60, 60],
        [90.9, 90],
        [1e12, 604_800],
        [Number.POSITIVE_INFINITY, 86_400],
        ["300", 86_400],
    ])("maps ttlSeconds=%s to a Redis TTL of %s", async (ttlSeconds, expected) => {
        const res = await call(create, { body: validBody({ ttlSeconds }) });
        expect(res.statusCode).toBe(200);
        const ttl = await redis.ttl(`paste:${createdToken(res.body)}`);
        expect(ttl).toBeGreaterThan(expected - 5);
        expect(ttl).toBeLessThanOrEqual(expected);
    });

    it("defaults to burn-on-read unless burnOnRead is exactly false", async () => {
        for (const [burnOnRead, expected] of [
            [undefined, true],
            ["false", true],
            [0, true],
            [false, false],
        ] as const) {
            const res = await call(create, { body: validBody({ burnOnRead }) });
            const stored = await consumeStoredPaste(createdToken(res.body));
            expect(stored?.burnOnRead).toBe(expected);
        }
    });

    it("returns 500 when Redis fails", async () => {
        const spy = vi.spyOn(redis, "eval").mockRejectedValueOnce(new Error("down"));
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        try {
            const res = await call(create, { body: validBody() });
            expect(res.statusCode).toBe(500);
        } finally {
            vi.restoreAllMocks();
        }
        expect(spy).toHaveBeenCalled();
    });
});
