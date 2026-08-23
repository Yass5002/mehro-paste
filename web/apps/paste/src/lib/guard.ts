import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import type { NextApiRequest } from "next";

const JWT_SECRET = new TextEncoder().encode(
    process.env.PASTE_JWT_SECRET || "mehro-paste-local-jwt-secret-key-32-chars!!"
);

export const GUARD_COOKIE_NAME = "paste_guard";
export const GUARD_TTL_SECONDS = 120; // 2 minutes

export function hashUserAgent(userAgent?: string): string {
    const ua = (userAgent || "").trim();
    return crypto.createHash("sha256").update(ua).digest("hex");
}

export function isLikelyPreviewRequest(req: NextApiRequest): boolean {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const purpose = String(req.headers.purpose || "").toLowerCase();
    const secPurpose = String(req.headers["sec-purpose"] || "").toLowerCase();

    if (
        purpose.includes("prefetch") ||
        purpose.includes("preview") ||
        secPurpose.includes("prefetch") ||
        secPurpose.includes("preview") ||
        secPurpose.includes("prerender")
    ) {
        return true;
    }

    const previewUATokens = [
        "bot", "crawler", "spider", "preview", "slackbot", "discordbot",
        "twitterbot", "facebookexternalhit", "whatsappbot", "telegrambot",
        "linkedinbot", "skypeuripreview", "googlebot"
    ];

    return previewUATokens.some((token) => ua.includes(token));
}

export async function signGuardJWT(accessToken: string, userAgent?: string): Promise<string> {
    const uaHash = hashUserAgent(userAgent);
    return new SignJWT({ accessToken, uaHash })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("2m")
        .sign(JWT_SECRET);
}

export async function verifyGuardJWT(
    token: string,
    accessToken: string,
    userAgent?: string
): Promise<boolean> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            algorithms: ["HS256"],
        });

        if (payload.accessToken !== accessToken) {
            return false;
        }

        const expectedUaHash = hashUserAgent(userAgent);
        if (payload.uaHash !== expectedUaHash) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}
