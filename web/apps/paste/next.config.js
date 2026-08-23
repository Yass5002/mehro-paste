const baseConfig = require("mehro-base/next.config.base.js");

module.exports = {
    ...baseConfig,
    output: undefined, // Enable full-stack Node.js server with API routes
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return {
            fallback: [
                {
                    source: "/:path((?!_next|images|favicon.ico|api).*)",
                    destination: "/",
                },
            ],
        };
    },
};
