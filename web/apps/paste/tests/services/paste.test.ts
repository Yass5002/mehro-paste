import { afterEach, describe, expect, it, vi } from "vitest";
import { consumePaste, createPaste, GuardRejectedError, setGuard } from "@/services/paste";

const respond = (status: number, body: unknown) =>
    vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response(JSON.stringify(body), { status })),
    );

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("services/paste", () => {
    it("setGuard returns the key envelope", async () => {
        const envelope = {
            encryptedPasteKey: "k",
            encryptedPasteKeyNonce: "n",
            kdfNonce: "s",
            kdfMemLimit: 8192,
            kdfOpsLimit: 1,
        };
        const fetchMock = respond(200, { status: "ok", envelope });
        vi.stubGlobal("fetch", fetchMock);
        await expect(setGuard("ABCDEFGHIJ")).resolves.toEqual(envelope);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/paste/guard",
            expect.objectContaining({ method: "POST", credentials: "include" }),
        );
    });

    it("consumePaste sends the consume confirmation header", async () => {
        const fetchMock = respond(200, { encryptedData: "x" });
        vi.stubGlobal("fetch", fetchMock);
        await consumePaste("ABCDEFGHIJ");
        const init = fetchMock.mock.calls[0]?.[1];
        expect(init?.headers).toMatchObject({ "X-Paste-Consume": "1" });
    });

    it("distinguishes a rejected guard cookie from an expired paste", async () => {
        vi.stubGlobal("fetch", respond(410, { message: "x", code: "guard_rejected" }));
        await expect(consumePaste("ABCDEFGHIJ")).rejects.toBeInstanceOf(GuardRejectedError);

        vi.stubGlobal("fetch", respond(410, { message: "gone" }));
        const error = await consumePaste("ABCDEFGHIJ").catch((e: unknown) => e);
        expect(error).not.toBeInstanceOf(GuardRejectedError);
        expect((error as Error).message).toBe("This paste has expired or was already opened.");
    });

    it("surfaces server messages and falls back for non-JSON errors", async () => {
        vi.stubGlobal("fetch", respond(400, { message: "Invalid paste payload" }));
        await expect(createPaste({} as never)).rejects.toThrow("Invalid paste payload");

        vi.stubGlobal(
            "fetch",
            vi.fn(() => Promise.resolve(new Response("<html>", { status: 502 }))),
        );
        await expect(createPaste({} as never)).rejects.toThrow("Request failed with status 502");
    });
});
