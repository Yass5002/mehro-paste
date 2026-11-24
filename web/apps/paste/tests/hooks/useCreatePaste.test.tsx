// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/paste", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/services/paste")>()),
    createPaste: vi.fn(() => Promise.resolve({ accessToken: "ABCDEFGHIJ", expiresAt: 0 })),
}));
vi.mock("@/features/paste/utils/pasteCrypto", () => ({
    encryptPasteForCreate: vi.fn((_text: string, password?: string) =>
        Promise.resolve({
            linkFragment: password ? "p-AAAAAAAAAAAA" : "AAAAAAAAAAAA",
            payload: {},
        }),
    ),
}));

import { MAX_PASTE_CHARS } from "@/features/paste/constants";
import { useCreatePaste } from "@/features/paste/hooks/useCreatePaste";
import { encryptPasteForCreate } from "@/features/paste/utils/pasteCrypto";
import { createPaste } from "@/services/paste";

afterEach(() => {
    vi.clearAllMocks();
});

const typeAndCreate = async (text: string, ...args: Parameters<ReturnType<typeof useCreatePaste>["createSecureLink"]>) => {
    const { result } = renderHook(() => useCreatePaste());
    act(() => result.current.setInputText(text));
    await act(() => result.current.createSecureLink(...args));
    return result;
};

describe("useCreatePaste", () => {
    it("builds the link from the token and fragment and forwards TTL / burn settings", async () => {
        const result = await typeAndCreate("hello", undefined, 60, false);
        expect(result.current.createdLink).toBe(`${window.location.origin}/ABCDEFGHIJ#AAAAAAAAAAAA`);
        expect(result.current.createdLinkMeta).toEqual({ burnOnRead: false, ttlSeconds: 60 });
        expect(vi.mocked(createPaste)).toHaveBeenCalledWith(
            expect.objectContaining({ ttlSeconds: 60, burnOnRead: false }),
        );
    });

    it("rejects empty input", async () => {
        const result = await typeAndCreate("   ");
        expect(result.current.createError).toBe("Enter some text first");
        expect(vi.mocked(encryptPasteForCreate)).not.toHaveBeenCalled();
    });

    it("rejects text over the character limit", async () => {
        const result = await typeAndCreate("a".repeat(MAX_PASTE_CHARS + 1));
        expect(result.current.createError).toMatch(/limited to/);
        expect(vi.mocked(encryptPasteForCreate)).not.toHaveBeenCalled();
    });

    it("rejects non-Latin text that fits the character limit but not the server's byte limit", async () => {
        const result = await typeAndCreate("م".repeat(2_000_000));
        expect(result.current.createError).toMatch(/too large once encrypted/);
        expect(vi.mocked(encryptPasteForCreate)).not.toHaveBeenCalled();
        expect(vi.mocked(createPaste)).not.toHaveBeenCalled();
    });
});
