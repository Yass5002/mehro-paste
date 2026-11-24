import type { NextApiRequest, NextApiResponse } from "next";
import {
    buildGuardCookieHeader,
    isLikelyPreviewRequest,
    signGuardJWT,
} from "@/lib/guard";
import { ACCESS_TOKEN_PATTERN } from "@/lib/pasteLimits";
import { CorruptPasteError, peekPasteEnvelope, type PasteEnvelope } from "@/lib/pasteStore";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.status(405).json({ message: "Method Not Allowed" });
        return;
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as { accessToken?: unknown };
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    if (!ACCESS_TOKEN_PATTERN.test(accessToken)) {
        res.status(400).json({ message: "Invalid paste token" });
        return;
    }

    // Link preview bot defense
    if (isLikelyPreviewRequest(req)) {
        res.status(410).json({ message: "Preview request blocked" });
        return;
    }

    let envelope: PasteEnvelope | null;
    try {
        envelope = await peekPasteEnvelope(accessToken);
    } catch (err) {
        if (err instanceof CorruptPasteError) {
            res.status(500).json({ message: "Failed to parse paste envelope" });
            return;
        }
        console.error("Failed to check paste existence in Redis:", err);
        res.status(500).json({ message: "Failed to verify paste availability" });
        return;
    }

    if (!envelope) {
        res.status(410).json({ message: "Paste unavailable" });
        return;
    }

    const guardToken = await signGuardJWT(accessToken, req);
    res.setHeader("Set-Cookie", buildGuardCookieHeader(req, guardToken));
    res.status(200).json({ status: "ok", envelope });
}
