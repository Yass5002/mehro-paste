import type { NextApiRequest, NextApiResponse } from "next";

export const BROWSER_UA =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

/** Headers a same-origin `fetch()` from a real browser tab would send. */
export const browserHeaders = (): Record<string, string> => ({
    "user-agent": BROWSER_UA,
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Chromium";v="142", "Not_A Brand";v="99"',
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "content-type": "application/json",
});

interface MockRequestInit {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
    cookies?: Record<string, string>;
}

export const mockRequest = ({
    method = "POST",
    headers = browserHeaders(),
    body,
    cookies = {},
}: MockRequestInit = {}) =>
    ({
        method,
        headers,
        body,
        cookies,
        query: {},
    }) as unknown as NextApiRequest;

export interface MockResponse {
    statusCode: number;
    body: unknown;
    headers: Record<string, string | string[]>;
}

export const mockResponse = () => {
    const state: MockResponse = { statusCode: 200, body: undefined, headers: {} };
    const res = {
        status(code: number) {
            state.statusCode = code;
            return res;
        },
        json(body: unknown) {
            state.body = body;
            return res;
        },
        setHeader(name: string, value: string | string[]) {
            state.headers[name.toLowerCase()] = value;
            return res;
        },
    };
    return { res: res as unknown as NextApiResponse, state };
};

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export const call = async (handler: Handler, init: MockRequestInit = {}) => {
    const { res, state } = mockResponse();
    await handler(mockRequest(init), res);
    return state;
};

/** Extracts the cookie value a `Set-Cookie` header assigns, as a browser would. */
export const cookieFromSetCookie = (
    header: string | string[] | undefined,
    name: string,
) => {
    const values = Array.isArray(header) ? header : header ? [header] : [];
    for (const value of values) {
        const [pair] = value.split(";");
        const [key, ...rest] = (pair ?? "").split("=");
        if (key?.trim() === name) return rest.join("=");
    }
    return undefined;
};
