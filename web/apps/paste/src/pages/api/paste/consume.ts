import type { NextApiRequest, NextApiResponse } from "next";
import { redis, PASTE_KEY_PREFIX } from "@/lib/redis";
import {
    isLikelyPreviewRequest,
    verifyGuardJWT,
    GUARD_COOKIE_NAME,
} from "@/lib/guard";

interface StoredPasteRecord {
    encryptedData: string;
    decryptionHeader: string;
    encryptedPasteKey: string;
    encryptedPasteKeyNonce: string;
    kdfNonce: string;
    kdfMemLimit: number;
    kdfOpsLimit: number;
    burnOnRead?: boolean;
}

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
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : undefined;
    if (!accessToken) {
        res.status(400).json({ message: "Invalid paste token" });
        return;
    }

    const tokenStr = accessToken.trim();
    const guardCookie = req.cookies[GUARD_COOKIE_NAME];

    if (!guardCookie) {
        res.status(410).json({ message: "Paste unavailable (missing guard cookie)" });
        return;
    }

    const isValidGuard = await verifyGuardJWT(
        guardCookie,
        tokenStr,
        req.headers["user-agent"],
    );

    if (!isValidGuard) {
        res.status(410).json({ message: "Paste unavailable (invalid guard cookie)" });
        return;
    }

    const redisKey = `${PASTE_KEY_PREFIX}${tokenStr}`;

    // Peek at payload or getdel depending on burnOnRead status
    const rawPayload: string | null = await redis.get(redisKey);

    if (!rawPayload) {
        // Clear guard cookie if expired or unavailable
        const clearCookieHeader = `${GUARD_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`;
        res.setHeader("Set-Cookie", clearCookieHeader);
        res.status(410).json({ message: "This paste has expired or was already opened." });
        return;
    }

    let record: StoredPasteRecord;
    try {
        record = JSON.parse(rawPayload) as StoredPasteRecord;
    } catch {
        res.status(500).json({ message: "Failed to parse paste payload" });
        return;
    }

    const burnOnRead = record.burnOnRead !== false; // Default true (Burn-on-Read)

    if (burnOnRead) {
        // Perform atomic delete via GETDEL (or fallback DEL)
        try {
            await redis.del(redisKey);
        } catch (err) {
            console.error("Failed to delete burn-on-read paste:", err);
        }

        // Clear guard cookie for burn-on-read pastes
        const clearCookieHeader = `${GUARD_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`;
        res.setHeader("Set-Cookie", clearCookieHeader);
    }

    res.status(200).json({
        encryptedData: record.encryptedData,
        decryptionHeader: record.decryptionHeader,
        encryptedPasteKey: record.encryptedPasteKey,
        encryptedPasteKeyNonce: record.encryptedPasteKeyNonce,
        kdfNonce: record.kdfNonce,
        kdfMemLimit: record.kdfMemLimit,
        kdfOpsLimit: record.kdfOpsLimit,
    });
}

