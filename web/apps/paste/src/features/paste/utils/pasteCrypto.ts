import { isValidKdfParams } from "@/lib/pasteLimits";
import type { PasteKeyEnvelope, PastePayload } from "@/services/paste";
import {
    decryptBox,
    decryptMetadataJSON,
    deriveInteractiveKey,
    deriveKey,
    deriveModerateKey,
    encryptBox,
    encryptMetadataJSON,
    generateKey,
} from "mehro-base/crypto";
import { newID } from "mehro-base/id";
import {
    FRAGMENT_SECRET_LENGTH,
    FRAGMENT_SECRET_PATTERN,
    PASSWORD_FRAGMENT_PREFIX,
    PASSWORD_KDF_CONTEXT,
} from "../constants";

export interface PasteKey {
    fragmentSecret: string;
    passwordRequired: boolean;
}

export class IncorrectPastePasswordError extends Error {
    constructor() {
        super("Incorrect paste password");
    }
}

export class InvalidLinkKeyError extends Error {
    constructor() {
        super(
            "The key in this link is wrong. Make sure you copied the whole link.",
        );
    }
}

export const createFragmentSecret = () =>
    newID("").slice(0, FRAGMENT_SECRET_LENGTH);

const pasteKeyLinkFragment = (pasteKey: PasteKey) =>
    pasteKey.passwordRequired
        ? `${PASSWORD_FRAGMENT_PREFIX}${pasteKey.fragmentSecret}`
        : pasteKey.fragmentSecret;

export const encryptPasteForCreate = async (
    text: string,
    password?: string,
) => {
    const key = await generateKey();
    const fragmentSecret = createFragmentSecret();
    const pasteKey = { fragmentSecret, passwordRequired: !!password };

    const encrypted = await encryptMetadataJSON({ text }, key);
    const keyEncryptionKey = password
        ? await deriveModerateKey(pasteKeyKdfSecret(pasteKey, password))
        : await deriveInteractiveKey(fragmentSecret);
    const encryptedPasteKey = await encryptBox(key, keyEncryptionKey.key);

    return {
        linkFragment: pasteKeyLinkFragment(pasteKey),
        payload: {
            encryptedData: encrypted.encryptedData,
            decryptionHeader: encrypted.decryptionHeader,
            encryptedPasteKey: encryptedPasteKey.encryptedData,
            encryptedPasteKeyNonce: encryptedPasteKey.nonce,
            kdfNonce: keyEncryptionKey.salt,
            kdfMemLimit: keyEncryptionKey.memLimit,
            kdfOpsLimit: keyEncryptionKey.opsLimit,
        } satisfies PastePayload,
    };
};

export const parsePasteKey = (fragment: string): PasteKey => {
    const passwordRequired = fragment.startsWith(PASSWORD_FRAGMENT_PREFIX);
    const fragmentSecret = passwordRequired
        ? fragment.slice(PASSWORD_FRAGMENT_PREFIX.length)
        : fragment;

    if (!FRAGMENT_SECRET_PATTERN.test(fragmentSecret)) {
        throw new Error("Invalid key in URL");
    }

    return { fragmentSecret, passwordRequired };
};

const pasteKeyKdfSecret = (pasteKey: PasteKey, password?: string) => {
    if (!pasteKey.passwordRequired) {
        return pasteKey.fragmentSecret;
    }
    if (!password) {
        throw new Error("Password required");
    }
    return `${PASSWORD_KDF_CONTEXT}\n${pasteKey.fragmentSecret}\n${password}`;
};

export const resolvePasteKey = async (
    pasteKey: PasteKey,
    payload: PasteKeyEnvelope,
    password?: string,
) => {
    // Never hand server-supplied Argon2 limits to WASM unchecked: a huge
    // memLimit would freeze or crash the tab.
    if (!isValidKdfParams(payload.kdfOpsLimit, payload.kdfMemLimit)) {
        throw new Error("Invalid KDF parameters");
    }

    const keyEncryptionKey = await deriveKey(
        pasteKeyKdfSecret(pasteKey, password),
        payload.kdfNonce,
        payload.kdfOpsLimit,
        payload.kdfMemLimit,
    );

    try {
        return await decryptBox(
            {
                encryptedData: payload.encryptedPasteKey,
                nonce: payload.encryptedPasteKeyNonce,
            },
            keyEncryptionKey,
        );
    } catch {
        if (pasteKey.passwordRequired) {
            throw new IncorrectPastePasswordError();
        }
        throw new InvalidLinkKeyError();
    }
};

export const decryptConsumedPaste = async (
    pasteKey: PasteKey,
    payload: PastePayload,
    password?: string,
    preResolvedKey?: string,
) => {
    const key =
        preResolvedKey ?? (await resolvePasteKey(pasteKey, payload, password));
    const decrypted = (await decryptMetadataJSON(
        {
            encryptedData: payload.encryptedData,
            decryptionHeader: payload.decryptionHeader,
        },
        key,
    )) as { text?: string };

    if (typeof decrypted.text !== "string") {
        throw new Error("Unable to decrypt paste");
    }

    return decrypted.text;
};
