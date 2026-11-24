import { describe, expect, it } from "vitest";
import consume from "@/pages/api/paste/consume";
import guard from "@/pages/api/paste/guard";
import { redis } from "@/lib/redis";
import { storePasteIfAbsent, type StoredPaste } from "@/lib/pasteStore";
import { browserHeaders, call, cookieFromSetCookie } from "../helpers/http";
import { hasRedis, useCleanRedis } from "../helpers/redis";

const TOKEN = "ABCDEFGHIJ";

const seed = (overrides: Partial<StoredPaste> = {}) =>
    storePasteIfAbsent(
        TOKEN,
        {
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
        },
        300,
    );

const getGuard = async (headers = browserHeaders(), accessToken = TOKEN) => {
    const res = await call(guard, { headers, body: { accessToken } });
    return { res, cookie: cookieFromSetCookie(res.headers["set-cookie"], "paste_guard") };
};

const consumeWith = (
    cookie: string | undefined,
    headers: Record<string, string> = browserHeaders(),
    accessToken = TOKEN,
) =>
    call(consume, {
        headers: { ...headers, "x-paste-consume": "1" },
        cookies: cookie === undefined ? {} : { paste_guard: cookie },
        body: { accessToken },
    });

describe.skipIf(!hasRedis)("POST /api/paste/guard", () => {
    useCleanRedis();

    it("rejects non-POST and malformed tokens", async () => {
        expect((await call(guard, { method: "GET" })).statusCode).toBe(405);
        for (const accessToken of [undefined, "", "abcdefghij", "ABC", "ABCDEFGHIJK", "paste:ABCD", 42]) {
            const res = await call(guard, { body: { accessToken } });
            expect(res.statusCode).toBe(400);
        }
    });

    it("blocks preview bots without setting a cookie", async () => {
        await seed();
        const { res, cookie } = await getGuard({ ...browserHeaders(), "user-agent": "Slackbot 1.0" });
        expect(res.statusCode).toBe(410);
        expect(cookie).toBeUndefined();
    });

    it("returns 410 for unknown pastes", async () => {
        const { res, cookie } = await getGuard();
        expect(res.statusCode).toBe(410);
        expect(cookie).toBeUndefined();
    });

    it("sets a guard cookie and returns only the key envelope", async () => {
        await seed();
        const { res, cookie } = await getGuard({ ...browserHeaders(), "x-forwarded-proto": "https" });
        expect(res.statusCode).toBe(200);
        expect(cookie).toBeTruthy();
        expect(res.headers["set-cookie"]).toMatch(/HttpOnly; SameSite=Strict; Secure$/);
        expect(res.body).toEqual({
            status: "ok",
            envelope: {
                encryptedPasteKey: "a2V5",
                encryptedPasteKeyNonce: "bm9uY2U=",
                kdfNonce: "c2FsdA==",
                kdfMemLimit: 67_108_864,
                kdfOpsLimit: 2,
            },
        });
        // Peeking must not consume.
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
    });

    it("trims surrounding whitespace from the token", async () => {
        await seed();
        const { res } = await getGuard(browserHeaders(), `  ${TOKEN}\n`);
        expect(res.statusCode).toBe(200);
    });
});

describe.skipIf(!hasRedis)("POST /api/paste/consume", () => {
    useCleanRedis();

    it("requires the explicit consume header", async () => {
        await seed();
        const { cookie } = await getGuard();
        const res = await call(consume, {
            cookies: { paste_guard: cookie! },
            body: { accessToken: TOKEN },
        });
        expect(res.statusCode).toBe(400);
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
    });

    it("blocks preview bots before touching the paste", async () => {
        await seed();
        const { cookie } = await getGuard();
        const res = await consumeWith(cookie, { ...browserHeaders(), "user-agent": "" });
        expect(res.statusCode).toBe(410);
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
    });

    it("returns the paste once, with burnOnRead, and clears the cookie", async () => {
        await seed();
        const { cookie } = await getGuard();
        const res = await consumeWith(cookie);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            encryptedData: "ZW5jcnlwdGVk",
            decryptionHeader: "aGVhZGVy",
            encryptedPasteKey: "a2V5",
            encryptedPasteKeyNonce: "bm9uY2U=",
            kdfNonce: "c2FsdA==",
            kdfMemLimit: 67_108_864,
            kdfOpsLimit: 2,
            burnOnRead: true,
        });
        expect(res.headers["set-cookie"]).toMatch(/^paste_guard=; Path=\/; Max-Age=0/);
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(0);

        // A fresh guard can't be obtained for a burned paste.
        expect((await getGuard()).res.statusCode).toBe(410);
    });

    it("lets multi-read pastes be opened again with a new guard", async () => {
        await seed({ burnOnRead: false });
        for (let i = 0; i < 3; i++) {
            const { cookie } = await getGuard();
            const res = await consumeWith(cookie);
            expect(res.statusCode).toBe(200);
            expect(res.body).toMatchObject({ burnOnRead: false });
        }
    });

    it("rejects a missing cookie as a guard problem without touching the paste", async () => {
        await seed();
        const res = await consumeWith(undefined);
        expect(res.statusCode).toBe(410);
        expect(res.body).toMatchObject({ code: "guard_rejected" });
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
    });

    it("rejects a guard issued for another paste or another client", async () => {
        await seed();
        await storePasteIfAbsent(
            "ZZZZZZZZZZ",
            {
                encryptedData: "b3RoZXI=",
                decryptionHeader: "aA==",
                encryptedPasteKey: "aw==",
                encryptedPasteKeyNonce: "bg==",
                kdfNonce: "cw==",
                kdfMemLimit: 67_108_864,
                kdfOpsLimit: 2,
                burnOnRead: true,
                createdAt: 1,
                expiresAt: 2,
            },
            300,
        );
        const other = await getGuard(browserHeaders(), "ZZZZZZZZZZ");
        const wrongPaste = await consumeWith(other.cookie);
        expect(wrongPaste.body).toMatchObject({ code: "guard_rejected" });

        const mine = await getGuard();
        const otherClient = await consumeWith(mine.cookie, {
            ...browserHeaders(),
            "accept-language": "de-DE",
        });
        expect(otherClient.body).toMatchObject({ code: "guard_rejected" });
        expect(otherClient.headers["set-cookie"]).toMatch(/Max-Age=0/);
        expect(await redis.exists(`paste:${TOKEN}`)).toBe(1);
    });

    it("allows each guard cookie to be used only once", async () => {
        await seed({ burnOnRead: false });
        const { cookie } = await getGuard();
        expect((await consumeWith(cookie)).statusCode).toBe(200);
        const replay = await consumeWith(cookie);
        expect(replay.statusCode).toBe(410);
        expect(replay.body).toMatchObject({ code: "guard_rejected" });
    });

    it("reports an expired paste distinctly from a guard problem", async () => {
        await seed();
        const { cookie } = await getGuard();
        await redis.del(`paste:${TOKEN}`);
        const res = await consumeWith(cookie);
        expect(res.statusCode).toBe(410);
        expect(res.body).not.toHaveProperty("code");
    });

    it("serves a burn-on-read paste to exactly one of many concurrent readers", async () => {
        await seed();
        const guards = await Promise.all(Array.from({ length: 10 }, () => getGuard()));
        const results = await Promise.all(guards.map(({ cookie }) => consumeWith(cookie)));
        expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
        expect(results.filter((r) => r.statusCode === 410)).toHaveLength(9);
    });

    it("returns 500 and deletes corrupt records", async () => {
        await redis.hset(`paste:${TOKEN}`, { meta: "nope", data: "x", header: "y" });
        await redis.expire(`paste:${TOKEN}`, 300);
        const guardRes = await getGuard();
        expect(guardRes.res.statusCode).toBe(500);
    });
});
