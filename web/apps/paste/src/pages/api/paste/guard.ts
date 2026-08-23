import type { NextApiRequest, NextApiResponse } from "next";
import { redis, PASTE_KEY_PREFIX } from "@/lib/redis";
import {
    isLikelyPreviewRequest,
    signGuardJWT,
    GUARD_COOKIE_NAME,
    GUARD_TTL_SECONDS,
} from "@/lib/guard";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.status(405).json({ message: "Method Not Allowed" });
        return;
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as { accessToken?: unknown };
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : undefined;
    if (!accessToken) {
        res.status(400).json({ message: "Invalid paste token" });
        return;
    }

    // Rule: js-early-exit & Link preview bot defense
    if (isLikelyPreviewRequest(req)) {
        res.status(410).json({ message: "Preview request blocked" });
        return;
    }

    const tokenStr = accessToken.trim();
    const redisKey = `${PASTE_KEY_PREFIX}${tokenStr}`;

    const exists = await redis.exists(redisKey);
    if (!exists) {
        res.status(410).json({ message: "Paste unavailable" });
        return;
    }

    const guardToken = await signGuardJWT(tokenStr, req.headers["user-agent"]);

    const isSecure =
        req.headers["x-forwarded-proto"] === "https" ||
        req.headers.origin?.startsWith("https://");

    const cookieHeader = `${GUARD_COOKIE_NAME}=${guardToken}; Path=/; Max-Age=${GUARD_TTL_SECONDS}; HttpOnly; SameSite=Strict${isSecure ? "; Secure" : ""}`;

    res.setHeader("Set-Cookie", cookieHeader);
    res.status(200).json({ status: "ok" });
}
