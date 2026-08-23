import { createPaste } from "@/services/paste";
import { useState } from "react";
import { MAX_PASTE_CHARS } from "../constants";
import { encryptPasteForCreate } from "../utils/pasteCrypto";

const buildPasteLink = (accessToken: string, fragmentSecret: string) =>
    `${window.location.origin}/${accessToken}#${fragmentSecret}`;

export const useCreatePaste = () => {
    const [inputText, setInputText] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createdLink, setCreatedLink] = useState<string | null>(null);
    const [createdLinkPasswordProtected, setCreatedLinkPasswordProtected] =
        useState(false);
    const [createdLinkMeta, setCreatedLinkMeta] = useState<{
        burnOnRead: boolean;
        ttlSeconds: number;
    } | null>(null);

    const createSecureLink = async (
        password?: string,
        customTtl?: number,
        customBurnOnRead?: boolean,
    ) => {
        setCreateError(null);

        if (!inputText.trim()) {
            setCreateError("Enter some text first");
            return;
        }

        if (inputText.length > MAX_PASTE_CHARS) {
            setCreateError(`Paste is limited to ${MAX_PASTE_CHARS} characters`);
            return;
        }

        setCreating(true);
        try {
            const { linkFragment, payload } = await encryptPasteForCreate(
                inputText,
                password,
            );
            const activeTtl = customTtl ?? 86400;
            const activeBurn = customBurnOnRead ?? true;
            const response = await createPaste({
                ...payload,
                ttlSeconds: activeTtl,
                burnOnRead: activeBurn,
            });
            setCreatedLink(buildPasteLink(response.accessToken, linkFragment));
            setCreatedLinkPasswordProtected(!!password);
            setCreatedLinkMeta({
                burnOnRead: activeBurn,
                ttlSeconds: activeTtl,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create paste";
            setCreateError(message);
        } finally {
            setCreating(false);
        }
    };

    const reset = () => {
        setInputText("");
        setCreatedLink(null);
        setCreatedLinkPasswordProtected(false);
        setCreatedLinkMeta(null);
        setCreateError(null);
    };

    return {
        inputText,
        setInputText,
        creating,
        createError,
        createdLink,
        createdLinkPasswordProtected,
        createdLinkMeta,
        createSecureLink,
        reset,
    };
};
