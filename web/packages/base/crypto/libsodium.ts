import { ensureArrayBufferBacked } from "mehro-base/bytes";
import sodium from "libsodium-wrappers-sumo";
import type {
    BytesOrB64,
    DerivedKey,
    EncryptedBlob,
    EncryptedBlobB64,
    EncryptedBlobBytes,
    EncryptedBox,
    EncryptedBoxB64,
} from "./types";

export const toB64 = async (input: Uint8Array) => {
    await sodium.ready;
    return sodium.to_base64(input, sodium.base64_variants.ORIGINAL);
};

export const fromB64 = async (
    input: string,
): Promise<Uint8Array<ArrayBuffer>> => {
    await sodium.ready;
    return ensureArrayBufferBacked(
        sodium.from_base64(input, sodium.base64_variants.ORIGINAL),
    );
};

export const toB64URLSafe = async (input: Uint8Array) => {
    await sodium.ready;
    return sodium.to_base64(input, sodium.base64_variants.URLSAFE);
};

export const toB64URLSafeNoPadding = async (input: Uint8Array) => {
    await sodium.ready;
    return sodium.to_base64(input, sodium.base64_variants.URLSAFE_NO_PADDING);
};

export const fromB64URLSafeNoPadding = async (
    input: string,
): Promise<Uint8Array<ArrayBuffer>> => {
    await sodium.ready;
    return ensureArrayBufferBacked(
        sodium.from_base64(input, sodium.base64_variants.URLSAFE_NO_PADDING),
    );
};

export const toHex = async (input: string) => {
    await sodium.ready;
    return sodium.to_hex(await fromB64(input));
};

export const fromHex = async (input: string): Promise<string> => {
    await sodium.ready;
    return await toB64(sodium.from_hex(input));
};

const bytes = async (bob: BytesOrB64) =>
    typeof bob == "string" ? fromB64(bob) : bob;

export const generateKey = async () => {
    await sodium.ready;
    return toB64(sodium.crypto_secretbox_keygen());
};

export const encryptBox = async (
    data: BytesOrB64,
    key: BytesOrB64,
): Promise<EncryptedBoxB64> => {
    await sodium.ready;
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedData = sodium.crypto_secretbox_easy(
        await bytes(data),
        nonce,
        await bytes(key),
    );
    return {
        encryptedData: await toB64(encryptedData),
        nonce: await toB64(nonce),
    };
};

export const encryptBlobBytes = async (
    data: BytesOrB64,
    key: BytesOrB64,
): Promise<EncryptedBlobBytes> => {
    await sodium.ready;

    const keyBytes = await bytes(key);
    const initPushResult =
        sodium.crypto_secretstream_xchacha20poly1305_init_push(keyBytes);
    const [pushState, header] = [initPushResult.state, initPushResult.header];

    const pushResult = sodium.crypto_secretstream_xchacha20poly1305_push(
        pushState,
        await bytes(data),
        null,
        sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL,
    );
    return {
        encryptedData: ensureArrayBufferBacked(pushResult),
        decryptionHeader: ensureArrayBufferBacked(header),
    };
};

export const encryptBlob = async (
    data: BytesOrB64,
    key: BytesOrB64,
): Promise<EncryptedBlobB64> => {
    const { encryptedData, decryptionHeader } = await encryptBlobBytes(
        data,
        key,
    );
    return {
        encryptedData: await toB64(encryptedData),
        decryptionHeader: await toB64(decryptionHeader),
    };
};

export const encryptMetadataJSON = (
    jsonValue: unknown,
    key: BytesOrB64,
): Promise<EncryptedBlobB64> =>
    encryptBlob(new TextEncoder().encode(JSON.stringify(jsonValue)), key);

export const decryptBoxBytes = async (
    { encryptedData, nonce }: EncryptedBox,
    key: BytesOrB64,
): Promise<Uint8Array<ArrayBuffer>> => {
    await sodium.ready;
    return ensureArrayBufferBacked(
        sodium.crypto_secretbox_open_easy(
            await bytes(encryptedData),
            await bytes(nonce),
            await bytes(key),
        ),
    );
};

export const decryptBox = (
    box: EncryptedBox,
    key: BytesOrB64,
): Promise<string> => decryptBoxBytes(box, key).then(toB64);

export const decryptBlobBytes = async (
    { encryptedData, decryptionHeader }: EncryptedBlob,
    key: BytesOrB64,
): Promise<Uint8Array<ArrayBuffer>> => {
    await sodium.ready;
    const pullState = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
        await bytes(decryptionHeader),
        await bytes(key),
    );
    const pullResult = sodium.crypto_secretstream_xchacha20poly1305_pull(
        pullState,
        await bytes(encryptedData),
        null,
    );
    return ensureArrayBufferBacked(pullResult.message);
};

export const decryptBlob = (
    blob: EncryptedBlob,
    key: BytesOrB64,
): Promise<string> => decryptBlobBytes(blob, key).then(toB64);

export const decryptMetadataJSON = async (
    blob: EncryptedBlob,
    key: BytesOrB64,
): Promise<unknown> =>
    JSON.parse(
        new TextDecoder().decode(await decryptBlobBytes(blob, key)),
    ) as unknown;

export const generateDeriveKeySalt = async () => {
    await sodium.ready;
    return await toB64(sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES));
};

export const deriveKey = async (
    passphrase: string,
    salt: string,
    opsLimit: number,
    memLimit: number,
) => {
    await sodium.ready;
    return await toB64(
        sodium.crypto_pwhash(
            sodium.crypto_secretbox_KEYBYTES,
            sodium.from_string(passphrase),
            await fromB64(salt),
            opsLimit,
            memLimit,
            sodium.crypto_pwhash_ALG_ARGON2ID13,
        ),
    );
};

export const deriveInteractiveKey = async (
    passphrase: string,
): Promise<DerivedKey> => {
    const salt = await generateDeriveKeySalt();
    const opsLimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE;
    const memLimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE;

    const key = await deriveKey(passphrase, salt, opsLimit, memLimit);
    return { key, salt, opsLimit, memLimit };
};

export const deriveModerateKey = async (
    passphrase: string,
): Promise<DerivedKey> => {
    const salt = await generateDeriveKeySalt();
    const opsLimit = sodium.crypto_pwhash_OPSLIMIT_MODERATE;
    const memLimit = sodium.crypto_pwhash_MEMLIMIT_MODERATE;

    const key = await deriveKey(passphrase, salt, opsLimit, memLimit);
    return { key, salt, opsLimit, memLimit };
};
