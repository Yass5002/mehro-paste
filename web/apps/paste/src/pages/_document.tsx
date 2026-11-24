import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="preconnect" href="https://analytics.mehro.me" />
                <script
                    defer
                    src="https://analytics.mehro.me/mehro.js"
                    data-website-id="95e6445b-fd5b-43b9-ba48-56c867adde05"
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
