// @ts-check

const cp = require("child_process");
const os = require("os");
const path = require("path");

const gitSHA = (() => {
    try {
        const command =
            os.platform() === "win32"
                ? "git rev-parse --short HEAD 2> NUL || cd ."
                : "git rev-parse --short HEAD 2>/dev/null || true";
        const result = cp
            .execSync(command, { cwd: __dirname, encoding: "utf-8" })
            .toString()
            .trim();
        return result || undefined;
    } catch {
        return undefined;
    }
})();

const appName = path.basename(process.cwd());

/** @type {import("next").NextConfig} */
const nextConfig = {
    output: "export",
    devIndicators: false,
    compiler: { emotion: true },
    transpilePackages: ["mehro-base"],
    typescript: {
        ignoreBuildErrors: true,
    },

    env: { gitSHA, appName },

    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback.fs = false;
        }

        config.experiments = { ...config.experiments, asyncWebAssembly: true };

        config.output = config.output || {};
        config.output.environment = {
            ...(config.output.environment || {}),
            asyncFunction: true,
        };

        return config;
    },
};

module.exports = nextConfig;
