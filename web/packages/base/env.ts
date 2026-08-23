declare const process: {
    readonly env: {
        readonly NODE_ENV: "development" | "production" | "test";
        readonly appName: string;
        readonly gitSHA?: string;
    };
};

export const isDevBuild = process.env.NODE_ENV == "development";

export const inWorker = () => typeof importScripts == "function";

