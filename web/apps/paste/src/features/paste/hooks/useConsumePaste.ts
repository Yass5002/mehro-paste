import {
    consumePaste,
    GuardRejectedError,
    setGuard,
    type PasteKeyEnvelope,
    type PastePayload,
} from "@/services/paste";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PageMode } from "../types";
import { waitUntilVisible } from "../utils/browser";
import {
    decryptConsumedPaste,
    IncorrectPastePasswordError,
    parsePasteKey,
    resolvePasteKey,
    type PasteKey,
} from "../utils/pasteCrypto";

const GUARD_FRESH_WINDOW_MS = 105_000; // Reuse guard cookie if issued within 105s (TTL is 120s)

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Paste is unavailable";

export const useConsumePaste = (mode: PageMode, accessToken: string | null) => {
    const [consuming, setConsuming] = useState(false);
    const [consumeError, setConsumeError] = useState<string | null>(null);
    const [resolvedText, setResolvedText] = useState<string | null>(null);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const consumeInFlightRef = useRef(false);
    const consumedPayloadRef = useRef<PastePayload | null>(null);
    const envelopeRef = useRef<PasteKeyEnvelope | null>(null);
    const guardIssuedAtRef = useRef<number>(0);
    const pasteKeyRef = useRef<PasteKey | null>(null);

    const fetchGuard = useCallback(async (token: string) => {
        await waitUntilVisible();
        const envelope = await setGuard(token);
        if (envelope) {
            envelopeRef.current = envelope;
        }
        guardIssuedAtRef.current = Date.now();
    }, []);

    // Guard cookies are single-use. Reuse the one from the password prompt if
    // it is still fresh; otherwise fetch a new one.
    const ensureFreshGuard = useCallback(
        async (token: string) => {
            const hasFreshGuard =
                guardIssuedAtRef.current > 0 &&
                Date.now() - guardIssuedAtRef.current < GUARD_FRESH_WINDOW_MS;
            if (!hasFreshGuard) {
                await fetchGuard(token);
            }
        },
        [fetchGuard],
    );

    const consumeWithGuard = useCallback(
        async (token: string) => {
            await ensureFreshGuard(token);
            guardIssuedAtRef.current = 0;
            try {
                return await consumePaste(token);
            } catch (error) {
                if (!(error instanceof GuardRejectedError)) {
                    throw error;
                }
                // The server rejected only the cookie (e.g. another tab
                // replaced it) and did not touch the paste: retry once.
                await fetchGuard(token);
                guardIssuedAtRef.current = 0;
                return await consumePaste(token);
            }
        },
        [ensureFreshGuard, fetchGuard],
    );

    const confirmPasteAvailable = useCallback(async () => {
        if (!accessToken) return;

        try {
            setConsuming(true);
            setConsumeError(null);
            await fetchGuard(accessToken);
            setPasswordRequired(true);
        } catch (error) {
            setConsumeError(errorMessage(error));
        } finally {
            setConsuming(false);
        }
    }, [accessToken, fetchGuard]);

    const consume = useCallback(
        async (pasteKey: PasteKey, password?: string) => {
            if (!accessToken || consumeInFlightRef.current) {
                return;
            }
            consumeInFlightRef.current = true;
            try {
                setConsuming(true);
                setConsumeError(null);
                setPasswordError(null);

                let payload = consumedPayloadRef.current;
                let preResolvedKey: string | undefined;
                if (!payload) {
                    // The guard response carries the key envelope. Unwrap the
                    // paste key with it *before* consuming, so a wrong
                    // password or a mangled link never burns the paste.
                    await ensureFreshGuard(accessToken);
                    if (envelopeRef.current) {
                        preResolvedKey = await resolvePasteKey(
                            pasteKey,
                            envelopeRef.current,
                            password,
                        );
                    }

                    payload = await consumeWithGuard(accessToken);
                    consumedPayloadRef.current = payload;
                }

                setResolvedText(
                    await decryptConsumedPaste(
                        pasteKey,
                        payload,
                        password,
                        preResolvedKey,
                    ),
                );
                setPasswordRequired(false);
            } catch (error) {
                if (error instanceof IncorrectPastePasswordError) {
                    setPasswordError(error.message);
                } else {
                    setConsumeError(errorMessage(error));
                }
            } finally {
                consumeInFlightRef.current = false;
                setConsuming(false);
            }
        },
        [accessToken, consumeWithGuard, ensureFreshGuard],
    );

    useEffect(() => {
        if (mode !== "view" || !accessToken || pasteKeyRef.current) return;

        try {
            const fragment = window.location.hash.slice(1).trim();
            if (!fragment) {
                throw new Error("Missing key in URL");
            }

            const pasteKey = parsePasteKey(fragment);
            pasteKeyRef.current = pasteKey;
            if (pasteKey.passwordRequired) {
                void confirmPasteAvailable();
            } else {
                void consume(pasteKey);
            }
        } catch (error) {
            setConsumeError(errorMessage(error));
        }
    }, [mode, accessToken, confirmPasteAvailable, consume]);

    const submitPassword = async (password: string) => {
        if (!password) {
            setPasswordError("Enter the paste password");
            return;
        }
        if (!pasteKeyRef.current) {
            setConsumeError("Missing key in URL");
            return;
        }
        await consume(pasteKeyRef.current, password);
    };

    return {
        consuming,
        consumeError,
        resolvedText,
        passwordRequired,
        passwordError,
        submitPassword,
        isBurnOnRead: consumedPayloadRef.current?.burnOnRead ?? false,
    };
};
