import type { NextApiRequest, NextApiResponse } from "next";
import { DEFAULT_PASTE_TTL_SECONDS } from "@/lib/redis";
import {
    ACCESS_TOKEN_ALPHABET,
    ACCESS_TOKEN_LENGTH,
    MAX_CIPHERTEXT_LENGTH,
    MAX_METADATA_FIELD_LENGTH,
    MAX_TTL_SECONDS,
    MIN_TTL_SECONDS,
    isValidKdfParams,
} from "@/lib/pasteLimits";
import { storePasteIfAbsent } from "@/lib/pasteStore";
import { customAlphabet } from "nanoid";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
    },
};

const generateAccessToken = customAlphabet(
    ACCESS_TOKEN_ALPHABET,
    ACCESS_TOKEN_LENGTH,
);
const MAX_TOKEN_RETRIES = 3;

function isValidStringField(value: unknown, maxLength: number): value is string {
    return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

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

    const body = (
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? req.body
            : undefined
    ) as CreatePasteRequest | undefined;
    if (
        !body ||
        typeof body.encryptedData !== "string" ||
        body.encryptedData.length === 0 ||
        !isValidStringField(body.decryptionHeader, MAX_METADATA_FIELD_LENGTH) ||
        !isValidStringField(body.encryptedPasteKey, MAX_METADATA_FIELD_LENGTH) ||
        !isValidStringField(body.encryptedPasteKeyNonce, MAX_METADATA_FIELD_LENGTH) ||
        !isValidStringField(body.kdfNonce, MAX_METADATA_FIELD_LENGTH) ||
        !isValidKdfParams(body.kdfOpsLimit, body.kdfMemLimit)
    ) {
        res.status(400).json({ message: "Invalid paste payload" });
        return;
    }

    if (body.encryptedData.length > MAX_CIPHERTEXT_LENGTH) {
        res.status(400).json({ message: "Ciphertext exceeds max allowed length" });
        return;
    }

    let ttlSeconds = DEFAULT_PASTE_TTL_SECONDS;
    if (typeof body.ttlSeconds === "number" && Number.isFinite(body.ttlSeconds)) {
        const flooredTtl = Math.floor(body.ttlSeconds);
        ttlSeconds = Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, flooredTtl));
    }

    const burnOnRead = body.burnOnRead !== false; // Default true (Burn-on-Read)

    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const paste = {
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

    try {
        for (let attempt = 0; attempt < MAX_TOKEN_RETRIES; attempt++) {
            const accessToken = generateAccessToken();
            // Never overwrite an existing paste on a token collision; retry instead.
            if (await storePasteIfAbsent(accessToken, paste, ttlSeconds)) {
                res.status(200).json({ accessToken, expiresAt });
                return;
            }
        }
        throw new Error("Failed to allocate unique paste access token");
    } catch (err) {
        console.error("Failed to store paste in Redis:", err);
        res.status(500).json({ message: "Failed to store paste in database" });
    }
}
