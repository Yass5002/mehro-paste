import "@fontsource-variable/inter";
import "@fontsource/gochi-hand";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CustomHead } from "mehro-base/components/Head";
import { useSetupLogs } from "mehro-base/components/utils/hooks-app";
import { shareTheme } from "mehro-base/components/utils/theme";
import type { AppProps } from "next/app";
import Head from "next/head";
import React from "react";

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
    useSetupLogs({ disableDiskLogs: true });

    return (
        <ThemeProvider theme={shareTheme} defaultMode="dark">
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Bitcount+Ink:wght@400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <CustomHead title="mehro paste" />
            <CssBaseline enableColorScheme />
            <GlobalStyles styles={{
                "html, body, #__next": {
                    height: "100%",
                    width: "100%",
                    overflow: "hidden",
                    margin: 0,
                    padding: 0,
                    overscrollBehavior: "none",
                }
            }} />
            <Component {...pageProps} />
        </ThemeProvider>
    );
};

export default App;
