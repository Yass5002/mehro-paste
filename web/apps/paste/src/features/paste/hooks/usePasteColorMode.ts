import { useColorScheme } from "@mui/material/styles";
import { useEffect } from "react";
import type { PasteResolvedMode } from "../theme/pasteThemeTokens";

interface UsePasteColorModeResult {
    resolvedMode: PasteResolvedMode;
}

export const usePasteColorMode = (): UsePasteColorModeResult => {
    const { setMode } = useColorScheme();

    useEffect(() => {
        setMode("dark");
    }, [setMode]);

    const resolvedMode: PasteResolvedMode = "dark";

    return { resolvedMode };
};

