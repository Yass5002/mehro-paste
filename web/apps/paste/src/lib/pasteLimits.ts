// Limits shared by the API routes and the browser. Keep this module free of
// Node-only imports: it is bundled into the client.

export const ACCESS_TOKEN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ACCESS_TOKEN_LENGTH = 10;
export const ACCESS_TOKEN_PATTERN = /^[0-9A-Z]{10}$/;

/** Max length of the base64 `encryptedData` field accepted by the server. */
export const MAX_CIPHERTEXT_LENGTH = 4_500_000;
/** Max length of each small base64 metadata field (nonces, wrapped key). */
export const MAX_METADATA_FIELD_LENGTH = 512;

export const MIN_TTL_SECONDS = 60; // 1 minute
export const MAX_TTL_SECONDS = 604_800; // 1 week

export const MIN_KDF_OPS_LIMIT = 1;
export const MAX_KDF_OPS_LIMIT = 10;
export const MIN_KDF_MEM_LIMIT = 8_192;
export const MAX_KDF_MEM_LIMIT = 536_870_912; // 512 MiB

const isIntInRange = (value: unknown, min: number, max: number) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max;

/**
 * Argon2id parameters are attacker-controlled on the way back from the server,
 * so both sides bound them before running (or storing) anything.
 */
export const isValidKdfParams = (opsLimit: unknown, memLimit: unknown) =>
    isIntInRange(opsLimit, MIN_KDF_OPS_LIMIT, MAX_KDF_OPS_LIMIT) &&
    isIntInRange(memLimit, MIN_KDF_MEM_LIMIT, MAX_KDF_MEM_LIMIT);

// libsodium secretstream adds a 17-byte authentication tag (ABYTES).
const SECRETSTREAM_ABYTES = 17;

const base64Length = (byteLength: number) => 4 * Math.ceil(byteLength / 3);

/**
 * Exact length of the base64 `encryptedData` the client will upload for
 * `text`. Non-ASCII characters take 2–4 bytes in UTF-8, so a paste that fits
 * the character limit can still exceed {@link MAX_CIPHERTEXT_LENGTH}.
 */
export const encryptedPasteLength = (text: string) =>
    base64Length(
        new TextEncoder().encode(JSON.stringify({ text })).byteLength +
            SECRETSTREAM_ABYTES,
    );
