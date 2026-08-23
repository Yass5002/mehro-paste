import type { NextApiRequest, NextApiResponse } from "next";
import { redis, PASTE_KEY_PREFIX, DEFAULT_PASTE_TTL_SECONDS } from "@/lib/redis";
import { customAlphabet } from "nanoid";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
    },
};

const generateAccessToken = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);
const MAX_CIPHERTEXT_BYTES = 4_500_000; // ~4.5 MB to cover Pi limit (3.14M chars encrypted)
const MIN_TTL_SECONDS = 60; // 1 min
const MAX_TTL_SECONDS = 604_800; // 1 week

export interface CreatePasteRequest {
    encryptedData: string;
    decryptionHeader: string;
    encryptedPasteKey: string;
    encryptedPasteKeyNonce: string;
    kdfNonce: string;
    kdfMemLimit: number;
    kdfOpsLimit: number;
    ttlSeconds?: number;
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

    const body = req.body as CreatePasteRequest | undefined;
    if (
        !body?.encryptedData ||
        !body.decryptionHeader ||
        !body.encryptedPasteKey ||
        !body.encryptedPasteKeyNonce ||
        !body.kdfNonce ||
        typeof body.kdfMemLimit !== "number" ||
        typeof body.kdfOpsLimit !== "number"
    ) {
        res.status(400).json({ message: "Invalid paste payload" });
        return;
    }

    if (body.encryptedData.length > MAX_CIPHERTEXT_BYTES) {
        res.status(400).json({ message: "Ciphertext exceeds max allowed length" });
        return;
    }

    let ttlSeconds = DEFAULT_PASTE_TTL_SECONDS;
    if (typeof body.ttlSeconds === "number" && !Number.isNaN(body.ttlSeconds)) {
        ttlSeconds = Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, body.ttlSeconds));
    }

    const burnOnRead = body.burnOnRead !== false; // Default true (Burn-on-Read)

    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const accessToken = generateAccessToken();
    const redisKey = `${PASTE_KEY_PREFIX}${accessToken}`;

    try {
        const payloadToStore = {
            encryptedData: body.encryptedData,
            decryptionHeader: body.decryptionHeader,
            encryptedPasteKey: body.encryptedPasteKey,
            encryptedPasteKeyNonce: body.encryptedPasteKeyNonce,
            kdfNonce: body.kdfNonce,
            kdfMemLimit: body.kdfMemLimit,
            kdfOpsLimit: body.kdfOpsLimit,
            burnOnRead,
            createdAt: now,
            expiresAt,
        };

        // Redis SET with EX (TTL in seconds). Auto-expires natively!
        await redis.set(
            redisKey,
            JSON.stringify(payloadToStore),
            "EX",
            ttlSeconds,
        );

        res.status(200).json({
            accessToken,
            expiresAt: expiresAt * 1000, // Microseconds format for frontend
        });
    } catch (err) {
        console.error("Failed to store paste in Redis:", err);
        res.status(500).json({ message: "Failed to store paste in database" });
    }
}

