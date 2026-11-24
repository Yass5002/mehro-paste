import { afterEach, describe, expect, it, vi } from "vitest";
import {
    buildClearGuardCookieHeader,
    buildGuardCookieHeader,
    isLikelyPreviewRequest,
    isSecureRequest,
    signGuardJWT,
    verifyGuardJWT,
} from "@/lib/guard";
import { browserHeaders, mockRequest } from "../helpers/http";

const TOKEN = "ABCDEFGHIJ";

const reqWith = (headers: Record<string, string | string[] | undefined>) =>
    mockRequest({ headers: { ...browserHeaders(), ...headers } });

afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

describe("isLikelyPreviewRequest", () => {
    it("allows a normal same-origin browser fetch", () => {
        expect(isLikelyPreviewRequest(reqWith({}))).toBe(false);
    });

    it("allows real Cubot phones even though the brand contains 'bot'", () => {
        const ua =
            "Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        expect(isLikelyPreviewRequest(reqWith({ "user-agent": ua }))).toBe(false);
    });

    it.each([
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
        "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
        "Twitterbot/1.0",
        "TelegramBot (like TwitterBot)",
        "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
        "facebookexternalhit/1.1 Facebot Twitterbot/1.0",
        "Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5",
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        "Mozilla/5.0 (compatible; YandexSpider/3.0)",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1)",
    ])("blocks link-preview / crawler UA: %s", (ua) => {
        expect(isLikelyPreviewRequest(reqWith({ "user-agent": ua }))).toBe(true);
    });

    it("blocks an empty or whitespace user agent", () => {
        expect(isLikelyPreviewRequest(reqWith({ "user-agent": undefined }))).toBe(true);
        expect(isLikelyPreviewRequest(reqWith({ "user-agent": "   " }))).toBe(true);
    });

    it.each([
        { purpose: "prefetch" },
        { "sec-purpose": "prefetch;prerender" },
        { "sec-purpose": "prefetch" },
        { "sec-fetch-site": "cross-site" },
        { "sec-fetch-mode": "navigate" },
    ])("blocks speculative / cross-site requests: %o", (headers) => {
        expect(isLikelyPreviewRequest(reqWith(headers))).toBe(true);
    });
});

describe("isSecureRequest and cookie headers", () => {
    it("detects https from X-Forwarded-Proto, including proxy lists", () => {
        expect(isSecureRequest(reqWith({ "x-forwarded-proto": "https" }))).toBe(true);
        expect(isSecureRequest(reqWith({ "x-forwarded-proto": "https, http" }))).toBe(true);
        expect(isSecureRequest(reqWith({ "x-forwarded-proto": "HTTPS" }))).toBe(true);
        expect(isSecureRequest(reqWith({ "x-forwarded-proto": ["https", "http"] }))).toBe(true);
        expect(isSecureRequest(reqWith({ "x-forwarded-proto": "http" }))).toBe(false);
    });

    it("detects https from Origin", () => {
        expect(isSecureRequest(reqWith({ origin: "https://paste.mehro.me" }))).toBe(true);
        expect(isSecureRequest(reqWith({ origin: "http://localhost:3008" }))).toBe(false);
    });

    it("sets and clears the cookie with identical attributes", () => {
        const req = reqWith({ "x-forwarded-proto": "https" });
        expect(buildGuardCookieHeader(req, "tok")).toBe(
            "paste_guard=tok; Path=/; Max-Age=120; HttpOnly; SameSite=Strict; Secure",
        );
        expect(buildClearGuardCookieHeader(req)).toBe(
            "paste_guard=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure",
        );
        expect(buildClearGuardCookieHeader(reqWith({}))).not.toContain("Secure");
    });
});

describe("guard JWT", () => {
    it("round-trips and carries a unique jti", async () => {
        const req = reqWith({});
        const a = await signGuardJWT(TOKEN, req);
        const b = await signGuardJWT(TOKEN, req);
        const va = await verifyGuardJWT(a, TOKEN, req);
        const vb = await verifyGuardJWT(b, TOKEN, req);
        expect(va.valid).toBe(true);
        expect(vb.valid).toBe(true);
        expect(va.jti).toBeTruthy();
        expect(va.jti).not.toBe(vb.jti);
    });

    it("rejects a guard issued for a different paste", async () => {
        const req = reqWith({});
        const jwt = await signGuardJWT(TOKEN, req);
        expect((await verifyGuardJWT(jwt, "ZZZZZZZZZZ", req)).valid).toBe(false);
    });

    it.each([
        { "user-agent": "Mozilla/5.0 (Other Browser)" },
        { "accept-language": "fr-FR" },
        { "sec-ch-ua": '"Firefox";v="1"' },
    ])("rejects a guard replayed from a different client context: %o", async (changed) => {
        const jwt = await signGuardJWT(TOKEN, reqWith({}));
        expect((await verifyGuardJWT(jwt, TOKEN, reqWith(changed))).valid).toBe(false);
    });

    it("rejects tampered and expired tokens", async () => {
        const req = reqWith({});
        const jwt = await signGuardJWT(TOKEN, req);
        const tampered = jwt.slice(0, -2) + (jwt.endsWith("AA") ? "BB" : "AA");
        expect((await verifyGuardJWT(tampered, TOKEN, req)).valid).toBe(false);

        vi.useFakeTimers();
        vi.setSystemTime(Date.now() + 121_000);
        expect((await verifyGuardJWT(jwt, TOKEN, req)).valid).toBe(false);
    });

    it("refuses to run in production without a strong secret", async () => {
        const req = reqWith({});
        vi.stubEnv("NODE_ENV", "production");

        vi.stubEnv("PASTE_JWT_SECRET", "");
        await expect(signGuardJWT(TOKEN, req)).rejects.toThrow(/must be set/);
        await expect(verifyGuardJWT("x", TOKEN, req)).rejects.toThrow(/must be set/);

        vi.stubEnv("PASTE_JWT_SECRET", "too-short");
        await expect(signGuardJWT(TOKEN, req)).rejects.toThrow(/at least 32/);

        vi.stubEnv("PASTE_JWT_SECRET", "x".repeat(32));
        const jwt = await signGuardJWT(TOKEN, req);
        expect((await verifyGuardJWT(jwt, TOKEN, req)).valid).toBe(true);
    });

    it("does not accept tokens signed with the dev fallback secret in production", async () => {
        const req = reqWith({});
        const devJwt = await signGuardJWT(TOKEN, req);
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("PASTE_JWT_SECRET", "p".repeat(40));
        expect((await verifyGuardJWT(devJwt, TOKEN, req)).valid).toBe(false);
    });
});
