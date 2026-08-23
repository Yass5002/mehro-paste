import { PasteCreatePanel } from "@/features/paste/components/PasteCreatePanel";
import { PasteFrame } from "@/features/paste/components/PasteFrame";
import { PasteViewPanel } from "@/features/paste/components/PasteViewPanel";
import { useConsumePaste } from "@/features/paste/hooks/useConsumePaste";
import { useCreatePaste } from "@/features/paste/hooks/useCreatePaste";
import { usePasteRoute } from "@/features/paste/hooks/usePasteRoute";
import {
    copyTextToClipboard,
    shareUrlOrCopy,
} from "@/features/paste/utils/browser";
import { Stack } from "@mui/material";
import Head from "next/head";

const Page = () => {
    const { mode, accessToken } = usePasteRoute();

    const {
        inputText,
        setInputText,
        creating,
        createError,
        createdLink,
        createdLinkPasswordProtected,
        createdLinkMeta,
        createSecureLink,
        reset,
    } = useCreatePaste();

    const {
        consuming,
        consumeError,
        resolvedText,
        passwordRequired,
        passwordError,
        submitPassword,
        isBurnOnRead,
    } = useConsumePaste(mode, accessToken);

    return (
        <>
            <Head>
                <link rel="canonical" href="https://paste.mehro.me/" />
                <meta
                    name="google-site-verification"
                    content="cyuwN2FJBOxKxmrZYUwpFkyKE_iRiZ7KdU7O8-UO9BU"
                />
                <meta
                    name="description"
                    content="send encrypted, self-destructing text notes. client-side encryption, custom expiration timers, and optional password protection."
                />
                <meta
                    name="keywords"
                    content="encrypted paste, burn on read, secure text sharing, zero knowledge paste, ephemeral notes, password protected paste, encrypted link"
                />
                <meta name="theme-color" content="#0d1016" />

                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://paste.mehro.me/" />
                <meta property="og:site_name" content="mehro paste" />
                <meta property="og:locale" content="en_US" />
                <meta property="og:title" content="mehro paste — fast & encrypted paste sharing" />
                <meta
                    property="og:description"
                    content="send encrypted, self-destructing text notes. client-side encryption, custom expiration timers, and optional password protection."
                />
                <meta
                    property="og:image"
                    content="https://paste.mehro.me/og.png"
                />
                <meta
                    property="og:image:secure_url"
                    content="https://paste.mehro.me/og.png"
                />
                <meta
                    property="og:image:alt"
                    content="mehro paste - zero-knowledge encrypted paste sharing preview"
                />
                <meta property="og:image:width" content="1376" />
                <meta property="og:image:height" content="768" />
                <meta property="og:image:type" content="image/png" />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="https://paste.mehro.me/" />
                <meta name="twitter:title" content="mehro paste — fast & encrypted paste sharing" />
                <meta
                    name="twitter:description"
                    content="send encrypted, self-destructing text notes. client-side encryption, custom expiration timers, and optional password protection."
                />
                <meta
                    name="twitter:image"
                    content="https://paste.mehro.me/og.png"
                />
                <meta
                    name="twitter:image:alt"
                    content="mehro paste - zero-knowledge encrypted paste sharing preview"
                />

                {/* Structured Data (Schema.org) */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebApplication",
                            name: "mehro paste",
                            alternateName: "Mehro Paste",
                            url: "https://paste.mehro.me/",
                            description:
                                "send encrypted, self-destructing text notes. client-side encryption, custom expiration timers, and optional password protection.",
                            applicationCategory: "SecurityApplication",
                            operatingSystem: "All",
                            inLanguage: "en",
                            image: "https://paste.mehro.me/og.png",
                            codeRepository: "https://github.com/Yass5002/mehro-paste",
                            license: "https://www.gnu.org/licenses/agpl-3.0.html",
                            isAccessibleForFree: true,
                            featureList: [
                                "End-to-end client-side encryption",
                                "Burn-on-read self-destructing links",
                                "Configurable expiration timers",
                                "Optional password protection with Argon2id"
                            ],
                            offers: {
                                "@type": "Offer",
                                price: "0",
                                priceCurrency: "USD",
                            },
                        }),
                    }}
                />
            </Head>

            <PasteFrame>
                <Stack
                    spacing={2.5}
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "100%", md: 620 },
                        minWidth: 0,
                        mx: "auto",
                    }}
                >
                    {mode === "create" && (
                        <PasteCreatePanel
                            inputText={inputText}
                            creating={creating}
                            createError={createError}
                            createdLink={createdLink}
                            createdLinkPasswordProtected={
                                createdLinkPasswordProtected
                            }
                            createdLinkMeta={createdLinkMeta}
                            onInputChange={setInputText}
                            onCreate={createSecureLink}
                            onReset={reset}
                            onCopyLink={copyTextToClipboard}
                            onShareLink={shareUrlOrCopy}
                        />
                    )}

                    {mode === "view" && (
                        <PasteViewPanel
                            consuming={consuming}
                            consumeError={consumeError}
                            resolvedText={resolvedText}
                            passwordRequired={passwordRequired}
                            passwordError={passwordError}
                            onSubmitPassword={submitPassword}
                            onCopyText={copyTextToClipboard}
                            isBurnOnRead={isBurnOnRead}
                        />
                    )}
                </Stack>
            </PasteFrame>
        </>
    );
};

export default Page;
