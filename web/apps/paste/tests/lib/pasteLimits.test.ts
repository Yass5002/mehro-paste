import { describe, expect, it } from "vitest";
import { encryptMetadataJSON, generateKey } from "mehro-base/crypto/libsodium";
import { MAX_PASTE_CHARS } from "@/features/paste/constants";
import {
    encryptedPasteLength,
    isValidKdfParams,
    MAX_CIPHERTEXT_LENGTH,
} from "@/lib/pasteLimits";

describe("isValidKdfParams", () => {
    it("accepts the libsodium INTERACTIVE and MODERATE presets used by the app", () => {
        expect(isValidKdfParams(2, 67_108_864)).toBe(true);
        expect(isValidKdfParams(3, 268_435_456)).toBe(true);
    });

    it.each([
        [0, 67_108_864],
        [11, 67_108_864],
        [2.5, 67_108_864],
        [2, 1024],
        [2, 1_073_741_824],
        [Number.NaN, 67_108_864],
        [2, Number.POSITIVE_INFINITY],
        ["2", 67_108_864],
        [2, null],
    ])("rejects ops=%s mem=%s", (ops, mem) => {
        expect(isValidKdfParams(ops, mem)).toBe(false);
    });
});

describe("encryptedPasteLength", () => {
    it.each([
        "",
        "hello",
        "line one\nline two\ttabbed \"quoted\" \\ backslash",
        "مرحبا بالعالم",
        "日本語のテキスト",
        "emoji 🔥🚀 and \u0001 control chars",
    ])("matches the real ciphertext length for %j", async (text) => {
        const key = await generateKey();
        const encrypted = await encryptMetadataJSON({ text }, key);
        expect(encryptedPasteLength(text)).toBe(encrypted.encryptedData.length);
    });

    it("lets a maximum-length ASCII paste through the server limit", () => {
        expect(encryptedPasteLength("a".repeat(MAX_PASTE_CHARS))).toBeLessThanOrEqual(
            MAX_CIPHERTEXT_LENGTH,
        );
    });

    it("flags non-Latin pastes that fit the character limit but not the byte limit", () => {
        const arabic = "م".repeat(2_000_000);
        expect(arabic.length).toBeLessThan(MAX_PASTE_CHARS);
        expect(encryptedPasteLength(arabic)).toBeGreaterThan(MAX_CIPHERTEXT_LENGTH);
    });
});
