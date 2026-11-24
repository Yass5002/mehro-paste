import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import type { NextApiRequest } from "next";

const DEV_FALLBACK_JWT_SECRET = "mehro-paste-local-jwt-secret-key-32-chars!!";

function getJwtSecret(): Uint8Array {
    const secret = process.env.PASTE_JWT_SECRET?.trim();
    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "PASTE_JWT_SECRET environment variable must be set in production",
            );
        }
        return new TextEncoder().encode(DEV_FALLBACK_JWT_SECRET);
    }
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
        throw new Error(
            "PASTE_JWT_SECRET must be at least 32 characters in production",
        );
    }
    return new TextEncoder().encode(secret);
}

export const GUARD_COOKIE_NAME = "paste_guard";
export const GUARD_TTL_SECONDS = 120; // 2 minutes
export const GUARD_JTI_PREFIX = "paste:guard_jti:";

/** Response `code` telling the client its guard cookie (not the paste) was rejected. */
export const GUARD_REJECTED_CODE = "guard_rejected";

export function isSecureRequest(req: NextApiRequest): boolean {
    // Proxies may send a list ("https, http") or repeat the header; the first
    // hop is the one the browser talked to.
    const rawProto = req.headers["x-forwarded-proto"];
    const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto)
        ?.split(",")[0]
        ?.trim()
        .toLowerCase();
    return proto === "https" || Boolean(req.headers.origin?.startsWith("https://"));
}

const cookieAttributes = (req: NextApiRequest, maxAge: number) =>
    `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${isSecureRequest(req) ? "; Secure" : ""}`;

export function buildGuardCookieHeader(req: NextApiRequest, token: string): string {
    return `${GUARD_COOKIE_NAME}=${token}; ${cookieAttributes(req, GUARD_TTL_SECONDS)}`;
}

export function buildClearGuardCookieHeader(req: NextApiRequest): string {
    return `${GUARD_COOKIE_NAME}=; ${cookieAttributes(req, 0)}`;
}

export function hashClientContext(req: NextApiRequest): string {
    const ua = (req.headers["user-agent"] || "").trim();
    const acceptLang = (req.headers["accept-language"] || "").trim();
    const rawSecChUa = req.headers["sec-ch-ua"];
    const secChUa = (
        Array.isArray(rawSecChUa) ? rawSecChUa.join(",") : rawSecChUa || ""
    ).trim();
    return crypto
        .createHash("sha256")
        .update(`${ua}\n${acceptLang}\n${secChUa}`)
        .digest("hex");
}

export function isLikelyPreviewRequest(req: NextApiRequest): boolean {
    const ua = (req.headers["user-agent"] || "").trim().toLowerCase();
    if (!ua) {
        return true;
    }
    const purpose = String(req.headers.purpose || "").toLowerCase();
    const secPurpose = String(req.headers["sec-purpose"] || "").toLowerCase();
    const secFetchSite = (req.headers["sec-fetch-site"] || "").toLowerCase();
    const secFetchMode = (req.headers["sec-fetch-mode"] || "").toLowerCase();

    if (
        purpose.includes("prefetch") ||
        purpose.includes("preview") ||
        secPurpose.includes("prefetch") ||
        secPurpose.includes("preview") ||
        secPurpose.includes("prerender") ||
        secFetchSite === "cross-site" ||
        secFetchMode === "navigate"
    ) {
        return true;
    }

    return PREVIEW_UA_PATTERN.test(ua);
}

// Covers Googlebot, Slackbot, Discordbot, Twitterbot, TelegramBot, LinkedInBot,
// facebookexternalhit (also used by iMessage), SkypeUriPreview, etc.
// The lookbehind keeps real phones of the "Cubot" brand from matching "bot".
const PREVIEW_UA_PATTERN =
    /(?<!cu)bot|crawler|spider|preview|facebookexternalhit/;

export async function signGuardJWT(
    accessToken: string,
    req: NextApiRequest,
): Promise<string> {
    const uaHash = hashClientContext(req);
    return new SignJWT({ accessToken, uaHash })
        .setProtectedHeader({ alg: "HS256" })
        .setJti(crypto.randomUUID())
        .setExpirationTime(`${GUARD_TTL_SECONDS}s`)
        .sign(getJwtSecret());
}

export async function verifyGuardJWT(
    token: string,
    accessToken: string,
    req: NextApiRequest,
): Promise<{ valid: boolean; jti?: string }> {
    const secret = getJwtSecret();
    try {
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ["HS256"],
        });

        if (payload.accessToken !== accessToken) {
            return { valid: false };
        }

        const expectedUaHash = hashClientContext(req);
        if (payload.uaHash !== expectedUaHash) {
            return { valid: false };
        }

        if (typeof payload.jti !== "string" || !payload.jti) {
            return { valid: false };
        }

        return { valid: true, jti: payload.jti };
    } catch {
        return { valid: false };
    }
}
