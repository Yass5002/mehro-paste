import { describe, expect, it, vi } from "vitest";

// Force token collisions: the first three generated tokens are identical.
const tokens = vi.hoisted(() => ["AAAAAAAAAA", "AAAAAAAAAA", "BBBBBBBBBB", "CCCCCCCCCC"]);
vi.mock("nanoid", () => ({
    customAlphabet: () => () => tokens.shift() ?? "ZZZZZZZZZZ",
}));

import create from "@/pages/api/paste/create";
import { consumeStoredPaste } from "@/lib/pasteStore";
import { call } from "../helpers/http";
import { hasRedis, useCleanRedis } from "../helpers/redis";

const body = (encryptedData: string) => ({
    encryptedData,
    decryptionHeader: "aGVhZGVy",
    encryptedPasteKey: "a2V5",
    encryptedPasteKeyNonce: "bm9uY2U=",
    kdfNonce: "c2FsdA==",
    kdfMemLimit: 67_108_864,
    kdfOpsLimit: 2,
    burnOnRead: false,
});

describe.skipIf(!hasRedis)("create token collisions", () => {
    useCleanRedis();

    it("retries with a new token instead of overwriting an existing paste", async () => {
        const first = await call(create, { body: body("Zmlyc3Q=") });
        expect(first.body).toMatchObject({ accessToken: "AAAAAAAAAA" });

        const second = await call(create, { body: body("c2Vjb25k") });
        expect(second.statusCode).toBe(200);
        expect(second.body).toMatchObject({ accessToken: "BBBBBBBBBB" });

        expect((await consumeStoredPaste("AAAAAAAAAA"))?.encryptedData).toBe("Zmlyc3Q=");
        expect((await consumeStoredPaste("BBBBBBBBBB"))?.encryptedData).toBe("c2Vjb25k");
    });

    it("gives up with 500 after repeated collisions", async () => {
        tokens.splice(0, tokens.length, "DDDDDDDDDD", "DDDDDDDDDD", "DDDDDDDDDD", "DDDDDDDDDD");
        expect((await call(create, { body: body("YQ==") })).statusCode).toBe(200);
        expect((await call(create, { body: body("Yg==") })).statusCode).toBe(500);
        expect((await consumeStoredPaste("DDDDDDDDDD"))?.encryptedData).toBe("YQ==");
    });
});
