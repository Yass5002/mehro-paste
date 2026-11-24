export interface CreatePasteResponse {
    accessToken: string;
    expiresAt: number;
}

export interface PasteKeyEnvelope {
    encryptedPasteKey: string;
    encryptedPasteKeyNonce: string;
    kdfNonce: string;
    kdfMemLimit: number;
    kdfOpsLimit: number;
}

export interface PastePayload extends PasteKeyEnvelope {
    encryptedData: string;
    decryptionHeader: string;
    ttlSeconds?: number;
    burnOnRead?: boolean;
}

/** Must match GUARD_REJECTED_CODE in `@/lib/guard` (server-only module). */
const GUARD_REJECTED_CODE = "guard_rejected";

/**
 * The server refused this browser's guard cookie (missing, expired, already
 * used, or overwritten by another tab). The paste itself was not touched, so
 * fetching a fresh guard and retrying is safe.
 */
export class GuardRejectedError extends Error {
    constructor() {
        super(
            "Couldn't verify this browser session. Make sure cookies are enabled for this site, then reload the page.",
        );
    }
}

const readErrorBody = async (response: Response) => {
    try {
        return (await response.json()) as { message?: unknown; code?: unknown };
    } catch {
        return {};
    }
};

const parseError = async (
    response: Response,
    context: "create" | "guard" | "consume",
) => {
    const data = await readErrorBody(response);
    if (context === "consume" && data.code === GUARD_REJECTED_CODE) {
        return new GuardRejectedError();
    }
    if (
        (context === "consume" || context === "guard") &&
        (response.status === 410 || response.status === 404)
    ) {
        return new Error("This paste has expired or was already opened.");
    }
    if (typeof data.message === "string" && data.message) {
        return new Error(data.message);
    }
    return new Error(`Request failed with status ${response.status}`);
};

export const createPaste = async (payload: PastePayload) => {
    const response = await fetch("/api/paste/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw await parseError(response, "create");
    }
    return (await response.json()) as CreatePasteResponse;
};

export const setGuard = async (
    accessToken: string,
): Promise<PasteKeyEnvelope | undefined> => {
    const response = await fetch("/api/paste/guard", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
    });
    if (!response.ok) {
        throw await parseError(response, "guard");
    }
    const data = (await response.json()) as {
        status?: string;
        envelope?: PasteKeyEnvelope;
    };
    return data.envelope;
};

export const consumePaste = async (accessToken: string) => {
    const response = await fetch("/api/paste/consume", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Paste-Consume": "1" },
        body: JSON.stringify({ accessToken }),
    });
    if (!response.ok) {
        throw await parseError(response, "consume");
    }
    return (await response.json()) as PastePayload;
};
