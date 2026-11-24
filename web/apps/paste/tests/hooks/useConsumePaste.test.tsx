// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/paste", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/services/paste")>()),
    setGuard: vi.fn(),
    consumePaste: vi.fn(),
}));
vi.mock("@/features/paste/utils/pasteCrypto", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/features/paste/utils/pasteCrypto")>()),
    resolvePasteKey: vi.fn(),
    decryptConsumedPaste: vi.fn(),
}));
vi.mock("@/features/paste/utils/browser", () => ({
    waitUntilVisible: () => Promise.resolve(),
}));

import { useConsumePaste } from "@/features/paste/hooks/useConsumePaste";
import {
    decryptConsumedPaste,
    IncorrectPastePasswordError,
    InvalidLinkKeyError,
    resolvePasteKey,
} from "@/features/paste/utils/pasteCrypto";
import { consumePaste, GuardRejectedError, setGuard } from "@/services/paste";

const TOKEN = "ABCDEFGHIJ";
const ENVELOPE = {
    encryptedPasteKey: "k",
    encryptedPasteKeyNonce: "n",
    kdfNonce: "s",
    kdfMemLimit: 8192,
    kdfOpsLimit: 1,
};
const PAYLOAD = { ...ENVELOPE, encryptedData: "d", decryptionHeader: "h", burnOnRead: true };

const setGuardMock = vi.mocked(setGuard);
const consumeMock = vi.mocked(consumePaste);
const resolveMock = vi.mocked(resolvePasteKey);
const decryptMock = vi.mocked(decryptConsumedPaste);

const openLink = (fragment: string) => {
    window.history.replaceState(null, "", `/${TOKEN}#${fragment}`);
    return renderHook(() => useConsumePaste("view", TOKEN));
};

beforeEach(() => {
    setGuardMock.mockResolvedValue(ENVELOPE);
    consumeMock.mockResolvedValue(PAYLOAD);
    resolveMock.mockResolvedValue("pre-resolved-key");
    decryptMock.mockResolvedValue("plaintext");
});

afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe("useConsumePaste", () => {
    it("opens a plain link immediately: one guard, one consume", async () => {
        const { result } = openLink("AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.resolvedText).toBe("plaintext"));
        expect(setGuardMock).toHaveBeenCalledTimes(1);
        expect(consumeMock).toHaveBeenCalledTimes(1);
        expect(result.current.isBurnOnRead).toBe(true);
        expect(result.current.consumeError).toBeNull();
    });

    it("never burns a paste when the link's key is wrong", async () => {
        resolveMock.mockRejectedValueOnce(new InvalidLinkKeyError());
        const { result } = openLink("AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.consumeError).toMatch(/key in this link is wrong/));
        expect(setGuardMock).toHaveBeenCalledTimes(1);
        expect(consumeMock).not.toHaveBeenCalled();
    });

    it("decrypts with the key unwrapped from the guard envelope", async () => {
        const { result } = openLink("AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.resolvedText).toBe("plaintext"));
        expect(resolveMock).toHaveBeenCalledWith(
            expect.objectContaining({ passwordRequired: false }),
            ENVELOPE,
            undefined,
        );
        expect(decryptMock).toHaveBeenCalledWith(
            expect.anything(),
            PAYLOAD,
            undefined,
            "pre-resolved-key",
        );
    });

    it("shows an error for a malformed key without contacting the server", async () => {
        const { result } = openLink("bad");
        await waitFor(() => expect(result.current.consumeError).toBe("Invalid key in URL"));
        expect(setGuardMock).not.toHaveBeenCalled();
    });

    it("never burns a password paste on a wrong password", async () => {
        const { result } = openLink("p-AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.passwordRequired).toBe(true));
        expect(consumeMock).not.toHaveBeenCalled();

        resolveMock.mockRejectedValueOnce(new IncorrectPastePasswordError());
        await act(() => result.current.submitPassword("wrong"));
        expect(result.current.passwordError).toBe("Incorrect paste password");
        expect(consumeMock).not.toHaveBeenCalled();

        await act(() => result.current.submitPassword("right"));
        expect(resolveMock).toHaveBeenLastCalledWith(
            expect.objectContaining({ passwordRequired: true }),
            ENVELOPE,
            "right",
        );
        expect(consumeMock).toHaveBeenCalledTimes(1);
        expect(decryptMock).toHaveBeenCalledWith(
            expect.anything(),
            PAYLOAD,
            "right",
            "pre-resolved-key",
        );
        expect(result.current.resolvedText).toBe("plaintext");
        // The guard from the password prompt was still fresh, so it was reused.
        expect(setGuardMock).toHaveBeenCalledTimes(1);
    });

    it("fetches a new guard if the password prompt sat open too long", async () => {
        const { result } = openLink("p-AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.passwordRequired).toBe(true));

        const realNow = Date.now;
        vi.spyOn(Date, "now").mockImplementation(() => realNow() + 110_000);
        await act(() => result.current.submitPassword("right"));
        vi.mocked(Date.now).mockRestore();

        expect(setGuardMock).toHaveBeenCalledTimes(2);
        expect(consumeMock).toHaveBeenCalledTimes(1);
    });

    it("retries once with a fresh guard when only the cookie was rejected", async () => {
        consumeMock.mockRejectedValueOnce(new GuardRejectedError());
        const { result } = openLink("AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.resolvedText).toBe("plaintext"));
        expect(setGuardMock).toHaveBeenCalledTimes(2);
        expect(consumeMock).toHaveBeenCalledTimes(2);
    });

    it("explains the cookie problem if the retry is rejected too", async () => {
        consumeMock.mockRejectedValue(new GuardRejectedError());
        const { result } = openLink("AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.consumeError).toMatch(/cookies are enabled/));
        expect(consumeMock).toHaveBeenCalledTimes(2);
    });

    it("does not retry when the paste itself is gone", async () => {
        consumeMock.mockRejectedValue(new Error("This paste has expired or was already opened."));
        const { result } = openLink("AAAAAAAAAAAA");
        await waitFor(() =>
            expect(result.current.consumeError).toBe("This paste has expired or was already opened."),
        );
        expect(consumeMock).toHaveBeenCalledTimes(1);
    });

    it("reports an unavailable password paste before asking for the password", async () => {
        setGuardMock.mockRejectedValueOnce(new Error("This paste has expired or was already opened."));
        const { result } = openLink("p-AAAAAAAAAAAA");
        await waitFor(() => expect(result.current.consumeError).toMatch(/expired/));
        expect(result.current.passwordRequired).toBe(false);
    });
});
