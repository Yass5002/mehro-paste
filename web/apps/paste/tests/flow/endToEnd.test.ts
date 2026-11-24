import { describe, expect, it, vi } from "vitest";

// The app normally runs libsodium in a Web Worker; call it directly in Node.
vi.mock("mehro-base/crypto", () => import("mehro-base/crypto/libsodium"));

import consume from "@/pages/api/paste/consume";
import create from "@/pages/api/paste/create";
import guard from "@/pages/api/paste/guard";
import { redis } from "@/lib/redis";
import {
    decryptConsumedPaste,
    encryptPasteForCreate,
    IncorrectPastePasswordError,
    InvalidLinkKeyError,
    parsePasteKey,
    resolvePasteKey,
} from "@/features/paste/utils/pasteCrypto";
import type { PasteKeyEnvelope, PastePayload } from "@/services/paste";
import { browserHeaders, call, cookieFromSetCookie } from "../helpers/http";
import { hasRedis, useCleanRedis } from "../helpers/redis";

const createPaste = async (text: string, password?: string, burnOnRead = true) => {
    const { linkFragment, payload } = await encryptPasteForCreate(text, password);
    const res = await call(create, { body: { ...payload, ttlSeconds: 300, burnOnRead } });
    expect(res.statusCode).toBe(200);
    return { accessToken: (res.body as { accessToken: string }).accessToken, linkFragment };
};

const openGuard = async (accessToken: string) => {
    const res = await call(guard, { body: { accessToken } });
    expect(res.statusCode).toBe(200);
    return {
        cookie: cookieFromSetCookie(res.headers["set-cookie"], "paste_guard")!,
        envelope: (res.body as { envelope: PasteKeyEnvelope }).envelope,
    };
};

const consumeWith = async (accessToken: string, cookie: string) => {
    const res = await call(consume, {
        headers: { ...browserHeaders(), "x-paste-consume": "1" },
        cookies: { paste_guard: cookie },
        body: { accessToken },
    });
    return res;
};

describe.skipIf(!hasRedis)("create → guard → consume → decrypt", () => {
    useCleanRedis();

    it("round-trips a plain paste, including non-ASCII text", async () => {
        const text = "secret: hunter2\nمرحبا 日本語 🔥";
        const { accessToken, linkFragment } = await createPaste(text);
        const pasteKey = parsePasteKey(linkFragment);
        expect(pasteKey.passwordRequired).toBe(false);

        const { cookie } = await openGuard(accessToken);
        const res = await consumeWith(accessToken, cookie);
        expect(res.statusCode).toBe(200);
        expect(await decryptConsumedPaste(pasteKey, res.body as PastePayload)).toBe(text);
        expect(await redis.exists(`paste:${accessToken}`)).toBe(0);
    });

    it("lets a wrong password be detected before the paste is burned", async () => {
        const { accessToken, linkFragment } = await createPaste("top secret", "correct horse");
        const pasteKey = parsePasteKey(linkFragment);
        expect(pasteKey.passwordRequired).toBe(true);
        expect(linkFragment.startsWith("p-")).toBe(true);

        const { cookie, envelope } = await openGuard(accessToken);

        await expect(resolvePasteKey(pasteKey, envelope, "wrong")).rejects.toBeInstanceOf(
            IncorrectPastePasswordError,
        );
        // The paste survives a wrong guess.
        expect(await redis.exists(`paste:${accessToken}`)).toBe(1);

        const key = await resolvePasteKey(pasteKey, envelope, "correct horse");
        const res = await consumeWith(accessToken, cookie);
        expect(res.statusCode).toBe(200);
        expect(
            await decryptConsumedPaste(pasteKey, res.body as PastePayload, "correct horse", key),
        ).toBe("top secret");
    });

    it("detects a mangled link from the envelope before the paste is burned", async () => {
        const { accessToken, linkFragment } = await createPaste("hidden");
        const mangled = parsePasteKey(
            linkFragment.slice(0, -1) + (linkFragment.endsWith("A") ? "B" : "A"),
        );
        const { cookie, envelope } = await openGuard(accessToken);
        await expect(resolvePasteKey(mangled, envelope)).rejects.toBeInstanceOf(
            InvalidLinkKeyError,
        );
        expect(await redis.exists(`paste:${accessToken}`)).toBe(1);

        // Without the right fragment the ciphertext is useless even once consumed.
        const res = await consumeWith(accessToken, cookie);
        await expect(
            decryptConsumedPaste(mangled, res.body as PastePayload),
        ).rejects.toBeInstanceOf(InvalidLinkKeyError);
    });
});

describe("pasteCrypto", () => {
    it.each(["", "short", "has-dash-1234", "p-short", "ABCDEFGHIJKLM", "ABCDEFGHIJK!"])(
        "rejects malformed fragment %j",
        (fragment) => {
            expect(() => parsePasteKey(fragment)).toThrow("Invalid key in URL");
        },
    );

    it("refuses to run Argon2 with server-supplied limits out of range", async () => {
        const { payload, linkFragment } = await encryptPasteForCreate("x");
        const pasteKey = parsePasteKey(linkFragment);
        for (const bad of [
            { kdfMemLimit: 4 * 1024 ** 3 },
            { kdfOpsLimit: 1_000 },
            { kdfOpsLimit: 0 },
        ]) {
            await expect(resolvePasteKey(pasteKey, { ...payload, ...bad })).rejects.toThrow(
                "Invalid KDF parameters",
            );
        }
    });

    it("requires a password for password-protected links", async () => {
        const { payload, linkFragment } = await encryptPasteForCreate("x", "pw");
        await expect(resolvePasteKey(parsePasteKey(linkFragment), payload)).rejects.toThrow(
            "Password required",
        );
    });
});
