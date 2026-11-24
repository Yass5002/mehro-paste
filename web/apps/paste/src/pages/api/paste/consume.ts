import type { NextApiRequest, NextApiResponse } from "next";
import { redis } from "@/lib/redis";
import {
    buildClearGuardCookieHeader,
    isLikelyPreviewRequest,
    verifyGuardJWT,
    GUARD_COOKIE_NAME,
    GUARD_JTI_PREFIX,
    GUARD_REJECTED_CODE,
    GUARD_TTL_SECONDS,
} from "@/lib/guard";
import { ACCESS_TOKEN_PATTERN } from "@/lib/pasteLimits";
import { CorruptPasteError, consumeStoredPaste, type StoredPaste } from "@/lib/pasteStore";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.status(405).json({ message: "Method Not Allowed" });
        return;
    }

    if (req.headers["x-paste-consume"] !== "1") {
        res.status(400).json({ message: "Missing consume confirmation" });
        return;
    }

    if (isLikelyPreviewRequest(req)) {
        res.status(410).json({ message: "Preview request blocked" });
        return;
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as { accessToken?: unknown };
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    if (!ACCESS_TOKEN_PATTERN.test(accessToken)) {
        res.status(400).json({ message: "Invalid paste token" });
        return;
    }

    // A guard problem never touches the paste, so tell the client it may fetch
    // a fresh guard cookie and retry (e.g. another tab overwrote the cookie).
    const rejectGuard = (message: string) => {
        res.setHeader("Set-Cookie", buildClearGuardCookieHeader(req));
        res.status(410).json({ message, code: GUARD_REJECTED_CODE });
    };

    const guardCookie = req.cookies[GUARD_COOKIE_NAME];
    if (!guardCookie) {
        rejectGuard("Paste unavailable (missing guard cookie)");
        return;
    }

    const { valid: isValidGuard, jti } = await verifyGuardJWT(
        guardCookie,
        accessToken,
        req,
    );
    if (!isValidGuard || !jti) {
        rejectGuard("Paste unavailable (invalid guard cookie)");
        return;
    }

    let paste: StoredPaste | null;
    try {
        // Each guard cookie may authorize exactly one consume.
        const jtiAcquired = await redis.set(
            `${GUARD_JTI_PREFIX}${jti}`,
            "1",
            "EX",
            GUARD_TTL_SECONDS,
            "NX",
        );
        if (jtiAcquired !== "OK") {
            rejectGuard("Paste unavailable (guard cookie already used)");
            return;
        }

        paste = await consumeStoredPaste(accessToken);
    } catch (err) {
        if (err instanceof CorruptPasteError) {
            res.setHeader("Set-Cookie", buildClearGuardCookieHeader(req));
            res.status(500).json({ message: "Failed to parse paste payload" });
            return;
        }
        console.error("Failed to consume paste from Redis:", err);
        res.status(500).json({ message: "Failed to retrieve paste" });
        return;
    }

    // Always clear the single-use guard cookie after a consume attempt.
    res.setHeader("Set-Cookie", buildClearGuardCookieHeader(req));

    if (!paste) {
        res.status(410).json({ message: "This paste has expired or was already opened." });
        return;
    }

    res.status(200).json({
        encryptedData: paste.encryptedData,
        decryptionHeader: paste.decryptionHeader,
        encryptedPasteKey: paste.encryptedPasteKey,
        encryptedPasteKeyNonce: paste.encryptedPasteKeyNonce,
        kdfNonce: paste.kdfNonce,
        kdfMemLimit: paste.kdfMemLimit,
        kdfOpsLimit: paste.kdfOpsLimit,
        burnOnRead: paste.burnOnRead,
    });
}
