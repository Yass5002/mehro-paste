import { describe, expect, it } from "vitest";
import { redis } from "@/lib/redis";
import {
    consumeStoredPaste,
    CorruptPasteError,
    peekPasteEnvelope,
    storePasteIfAbsent,
    type StoredPaste,
} from "@/lib/pasteStore";
import { hasRedis, useCleanRedis } from "../helpers/redis";

const TOKEN = "ABCDEFGHIJ";

const samplePaste = (overrides: Partial<StoredPaste> = {}): StoredPaste => ({
    encryptedData: "ZW5jcnlwdGVk",
    decryptionHeader: "aGVhZGVy",
    encryptedPasteKey: "a2V5",
    encryptedPasteKeyNonce: "bm9uY2U=",
    kdfNonce: "c2FsdA==",
    kdfMemLimit: 67_108_864,
    kdfOpsLimit: 2,
    burnOnRead: true,
    createdAt: 1,
    expiresAt: 2,
    ...overrides,
});

describe.skipIf(!hasRedis)("pasteStore (Redis)", () => {
    useCleanRedis();

    it("stores a paste with a TTL and refuses to overwrite an existing token", async () => {
        expect(await storePasteIfAbsent(TOKEN, samplePaste(), 300)).toBe(true);
        const ttl = await redis.ttl(`paste:${TOKEN}`);
        expect(ttl).toBeGreaterThan(290);
        expect(ttl).toBeLessThanOrEqual(300);

        expect(
            await storePasteIfAbsent(TOKEN, samplePaste({ encryptedData: "b3RoZXI=" }), 300),
        ).toBe(false);
        expect((await consumeStoredPaste(TOKEN))?.encryptedData).toBe("ZW5jcnlwdGVk");
    });

    it("peeks the envelope without the ciphertext and without consuming", async () => {
        await storePasteIfAbsent(TOKEN, samplePaste(), 300);
        const envelope = await peekPasteEnvelope(TOKEN);
        expect(envelope).toEqual({
            encryptedPasteKey: "a2V5",
            encryptedPasteKeyNonce: "bm9uY2U=",
            kdfNonce: "c2FsdA==",
            kdfMemLimit: 67_108_864,
            kdfOpsLimit: 2,
        });
        expect(envelope).not.toHaveProperty("encryptedData");
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
    });

    it("returns null for unknown pastes", async () => {
        expect(await peekPasteEnvelope(TOKEN)).toBeNull();
        expect(await consumeStoredPaste(TOKEN)).toBeNull();
    });

    it("deletes burn-on-read pastes on consume", async () => {
        await storePasteIfAbsent(TOKEN, samplePaste(), 300);
        expect(await consumeStoredPaste(TOKEN)).toEqual(samplePaste());
        expect(await consumeStoredPaste(TOKEN)).toBeNull();
    });

    it("keeps multi-read pastes after consume", async () => {
        await storePasteIfAbsent(TOKEN, samplePaste({ burnOnRead: false }), 300);
        expect((await consumeStoredPaste(TOKEN))?.burnOnRead).toBe(false);
        expect((await consumeStoredPaste(TOKEN))?.burnOnRead).toBe(false);
    });

    it("hands a burn-on-read paste to exactly one of many concurrent readers", async () => {
        await storePasteIfAbsent(TOKEN, samplePaste(), 300);
        const results = await Promise.all(
            Array.from({ length: 25 }, () => consumeStoredPaste(TOKEN)),
        );
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("never JSON-decodes the ciphertext inside Redis", async () => {
        // A 4.4 MB paste used to block Redis for ~25 ms on every guard call.
        await storePasteIfAbsent(
            TOKEN,
            samplePaste({ encryptedData: "A".repeat(4_400_000), burnOnRead: false }),
            300,
        );
        const started = performance.now();
        for (let i = 0; i < 20; i++) await peekPasteEnvelope(TOKEN);
        expect((performance.now() - started) / 20).toBeLessThan(5);
    });

    it("deletes and reports corrupt records", async () => {
        await redis.hset(`paste:${TOKEN}`, { meta: "{not json", data: "x", header: "y" });
        await expect(consumeStoredPaste(TOKEN)).rejects.toBeInstanceOf(CorruptPasteError);
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(0);
    });

    describe("legacy JSON-string records (written before the hash layout)", () => {
        const legacy = (burnOnRead?: boolean) => {
            const { burnOnRead: _ignored, ...rest } = samplePaste();
            return JSON.stringify(burnOnRead === undefined ? rest : { ...rest, burnOnRead });
        };

        it("peeks and consumes burn-on-read legacy pastes", async () => {
            await redis.set(`paste:${TOKEN}`, legacy(true), "EX", 300);
            expect((await peekPasteEnvelope(TOKEN))?.kdfOpsLimit).toBe(2);
            const paste = await consumeStoredPaste(TOKEN);
            expect(paste?.encryptedData).toBe("ZW5jcnlwdGVk");
            expect(paste?.burnOnRead).toBe(true);
            expect(await redis.exists(`paste:${TOKEN}`)).toBe(0);
        });

        it("treats a missing burnOnRead flag as burn-on-read", async () => {
            await redis.set(`paste:${TOKEN}`, legacy(undefined), "EX", 300);
            expect((await consumeStoredPaste(TOKEN))?.burnOnRead).toBe(true);
            expect(await redis.exists(`paste:${TOKEN}`)).toBe(0);
        });

        it("keeps multi-read legacy pastes", async () => {
            await redis.set(`paste:${TOKEN}`, legacy(false), "EX", 300);
            expect((await consumeStoredPaste(TOKEN))?.burnOnRead).toBe(false);
            expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
        });

        it("deletes corrupt legacy records", async () => {
            await redis.set(`paste:${TOKEN}`, "{corrupt", "EX", 300);
            expect(await peekPasteEnvelope(TOKEN)).toBeNull();
            await expect(consumeStoredPaste(TOKEN)).rejects.toBeInstanceOf(CorruptPasteError);
            expect(await redis.exists(`paste:${TOKEN}`)).toBe(0);
        });
    });
});
