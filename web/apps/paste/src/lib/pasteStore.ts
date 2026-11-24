import { PASTE_KEY_PREFIX, redis } from "@/lib/redis";

export interface PasteEnvelope {
    encryptedPasteKey: string;
    encryptedPasteKeyNonce: string;
    kdfNonce: string;
    kdfMemLimit: number;
    kdfOpsLimit: number;
}

export interface StoredPaste extends PasteEnvelope {
    encryptedData: string;
    decryptionHeader: string;
    burnOnRead: boolean;
    createdAt: number;
    expiresAt: number;
}

export class CorruptPasteError extends Error {
    constructor() {
        super("Stored paste record is corrupt");
    }
}

const redisKey = (accessToken: string) => `${PASTE_KEY_PREFIX}${accessToken}`;

/*
 * Layout: each paste is a hash with three fields so that Lua scripts never
 * have to JSON-decode the (up to 4.5 MB) ciphertext. Decoding that inside
 * Redis takes ~25 ms and blocks every other client for the duration.
 *
 *   meta   – small JSON: key envelope, burnOnRead, createdAt, expiresAt
 *   data   – base64 ciphertext
 *   header – base64 secretstream header
 *
 * Pastes written before this layout are plain JSON strings. The `string`
 * branches below keep those readable; they can be deleted once the last of
 * them has expired (MAX_TTL_SECONDS after this ships).
 */

const STORE_LUA = `
if redis.call("EXISTS", KEYS[1]) == 1 then
    return 0
end
redis.call("HSET", KEYS[1], "meta", ARGV[1], "data", ARGV[2], "header", ARGV[3])
redis.call("EXPIRE", KEYS[1], ARGV[4])
return 1
`;

const PEEK_META_LUA = `
local kind = redis.call("TYPE", KEYS[1])["ok"]
if kind == "hash" then
    return redis.call("HGET", KEYS[1], "meta")
end
if kind == "string" then
    local ok, d = pcall(cjson.decode, redis.call("GET", KEYS[1]))
    if not ok or type(d) ~= "table" then
        return false
    end
    return cjson.encode({
        encryptedPasteKey = d.encryptedPasteKey,
        encryptedPasteKeyNonce = d.encryptedPasteKeyNonce,
        kdfNonce = d.kdfNonce,
        kdfMemLimit = d.kdfMemLimit,
        kdfOpsLimit = d.kdfOpsLimit,
        burnOnRead = d.burnOnRead ~= false
    })
end
return false
`;

// Reads the paste and, unless it was explicitly created with burnOnRead=false,
// deletes it in the same atomic step. Corrupt records are deleted too.
const CONSUME_LUA = `
local kind = redis.call("TYPE", KEYS[1])["ok"]
if kind == "hash" then
    local v = redis.call("HMGET", KEYS[1], "meta", "data", "header")
    local ok, m = pcall(cjson.decode, v[1])
    if not ok or type(m) ~= "table" or m.burnOnRead ~= false then
        redis.call("DEL", KEYS[1])
    end
    return {"hash", v[1] or "", v[2] or "", v[3] or ""}
end
if kind == "string" then
    local val = redis.call("GET", KEYS[1])
    local ok, d = pcall(cjson.decode, val)
    if not ok or type(d) ~= "table" or d.burnOnRead ~= false then
        redis.call("DEL", KEYS[1])
    end
    return {"string", val}
end
return false
`;

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.length > 0;

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const parseJSONObject = (raw: unknown): Record<string, unknown> => {
    if (typeof raw !== "string") throw new CorruptPasteError();
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new CorruptPasteError();
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new CorruptPasteError();
    }
    return parsed as Record<string, unknown>;
};

const toEnvelope = (m: Record<string, unknown>): PasteEnvelope => {
    if (
        !isNonEmptyString(m.encryptedPasteKey) ||
        !isNonEmptyString(m.encryptedPasteKeyNonce) ||
        !isNonEmptyString(m.kdfNonce) ||
        !isFiniteNumber(m.kdfMemLimit) ||
        !isFiniteNumber(m.kdfOpsLimit)
    ) {
        throw new CorruptPasteError();
    }
    return {
        encryptedPasteKey: m.encryptedPasteKey,
        encryptedPasteKeyNonce: m.encryptedPasteKeyNonce,
        kdfNonce: m.kdfNonce,
        kdfMemLimit: m.kdfMemLimit,
        kdfOpsLimit: m.kdfOpsLimit,
    };
};

const toStoredPaste = (
    m: Record<string, unknown>,
    encryptedData: unknown,
    decryptionHeader: unknown,
): StoredPaste => {
    if (!isNonEmptyString(encryptedData) || !isNonEmptyString(decryptionHeader)) {
        throw new CorruptPasteError();
    }
    return {
        ...toEnvelope(m),
        encryptedData,
        decryptionHeader,
        burnOnRead: m.burnOnRead !== false,
        createdAt: isFiniteNumber(m.createdAt) ? m.createdAt : 0,
        expiresAt: isFiniteNumber(m.expiresAt) ? m.expiresAt : 0,
    };
};

/**
 * Stores the paste under `accessToken` unless that token is already taken.
 * Returns false on collision so the caller can retry with a fresh token.
 */
export const storePasteIfAbsent = async (
    accessToken: string,
    paste: StoredPaste,
    ttlSeconds: number,
) => {
    const { encryptedData, decryptionHeader, ...meta } = paste;
    const stored = await redis.eval(
        STORE_LUA,
        1,
        redisKey(accessToken),
        JSON.stringify(meta),
        encryptedData,
        decryptionHeader,
        String(ttlSeconds),
    );
    return stored === 1;
};

/** Returns the key envelope without touching the paste, or null if missing. */
export const peekPasteEnvelope = async (
    accessToken: string,
): Promise<PasteEnvelope | null> => {
    const raw = await redis.eval(PEEK_META_LUA, 1, redisKey(accessToken));
    if (raw === null || raw === undefined) return null;
    return toEnvelope(parseJSONObject(raw));
};

/**
 * Atomically reads the paste and deletes it if it is burn-on-read.
 * Returns null if there is no such paste. Throws {@link CorruptPasteError}
 * (after deleting the record) if it cannot be parsed.
 */
export const consumeStoredPaste = async (
    accessToken: string,
): Promise<StoredPaste | null> => {
    const reply = await redis.eval(CONSUME_LUA, 1, redisKey(accessToken));
    if (!Array.isArray(reply)) return null;

    const [kind, ...fields] = reply as unknown[];
    if (kind === "hash") {
        const [meta, data, header] = fields;
        return toStoredPaste(parseJSONObject(meta), data, header);
    }
    if (kind === "string") {
        const legacy = parseJSONObject(fields[0]);
        return toStoredPaste(
            legacy,
            legacy.encryptedData,
            legacy.decryptionHeader,
        );
    }
    throw new CorruptPasteError();
};
