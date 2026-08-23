import { usePasteColorMode } from "@/features/paste/hooks/usePasteColorMode";
import { getPasteThemeTokens } from "@/features/paste/theme/pasteThemeTokens";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface PasteFrameProps {
    children: ReactNode;
    footer?: ReactNode;
}

export const PasteFrame = ({ children, footer }: PasteFrameProps) => {
    const { resolvedMode } = usePasteColorMode();
    const tokens = getPasteThemeTokens(resolvedMode);

    return (
        <Box
            sx={{
                height: "100dvh",
                width: "100%",
                maxWidth: "100%",
                bgcolor: tokens.frame.innerBg,
                fontFamily: '"Inter Variable", sans-serif',
                display: "grid",
                gridTemplateRows: footer ? "auto 1fr auto" : "auto 1fr",
                alignItems: "stretch",
                boxSizing: "border-box",
                overflowX: "hidden",
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                    width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                    background: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                    background: tokens.surface.inputBorder,
                    borderRadius: "10px",
                    border: `2px solid ${tokens.frame.innerBg}`,
                    backgroundClip: "padding-box",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                    background: tokens.accent.soft,
                    border: `2px solid ${tokens.frame.innerBg}`,
                    backgroundClip: "padding-box",
                },
                "& ::selection": {
                    backgroundColor: tokens.frame.selectionBg,
                    color: tokens.frame.selectionText,
                },
                "& ::-moz-selection": {
                    backgroundColor: tokens.frame.selectionBg,
                    color: tokens.frame.selectionText,
                },
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    px: { xs: 2, sm: 3, md: 5 },
                    pt: { xs: 1.5, sm: 2.5, md: 3.5 },
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "100%", md: 620 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: { xs: 2.5, sm: 3.2 },
                        py: { xs: 1.1, sm: 1.3 },
                        borderRadius: "20px",
                        border: `1px solid ${tokens.surface.inputBorder}`,
                        bgcolor: tokens.surface.inputBg,
                        background: tokens.surface.inputGradient,
                        boxShadow: tokens.surface.inputShadow,
                        backdropFilter: "blur(9px) saturate(112%)",
                        WebkitBackdropFilter: "blur(9px) saturate(112%)",
                        boxSizing: "border-box",
                    }}
                >
                    <Typography
                        component="h1"
                        sx={{
                            m: 0,
                            p: 0,
                            fontSize: "inherit",
                            fontWeight: "inherit",
                            lineHeight: 1,
                            display: "inline-flex",
                        }}
                    >
                        <Stack
                            component="a"
                            href="/"
                            direction="row"
                            spacing={0.5}
                            aria-label="mehro paste"
                            sx={{
                                alignItems: "center",
                                color: tokens.frame.logoTint,
                                lineHeight: 1,
                                textDecoration: "none",
                                userSelect: "none",
                            }}
                        >
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily:
                                        '"Bitcount Ink", cursive, sans-serif',
                                    fontWeight: 800,
                                    fontSize: { xs: "2.1rem", md: "2.4rem" },
                                    letterSpacing: "-0.01em",
                                    color: tokens.frame.logoTint,
                                    lineHeight: 1,
                                    display: "inline-flex",
                                    alignItems: "center",
                                }}
                            >
                                mehro
                            </Typography>
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily:
                                        '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                    fontSize: { xs: "1.5rem", md: "1.7rem" },
                                    lineHeight: 1,
                                    letterSpacing: "0.01em",
                                    color: tokens.frame.logoTint,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    mt: { xs: "2px", md: "3px" },
                                }}
                            >
                                paste
                            </Typography>
                        </Stack>
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={0.85}
                        sx={{ alignItems: "center" }}
                    >
                        <IconButton
                            component="a"
                            href="https://github.com/Yass5002/mehro-paste"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View on GitHub"
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: "transparent",
                                color: tokens.frame.headerIcon,
                                "&:hover": {
                                    bgcolor: tokens.frame.headerIconHoverBg,
                                },
                            }}
                        >
                            <GitHubIcon sx={{ fontSize: 26 }} />
                        </IconButton>
                    </Stack>
                </Box>
            </Box>
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 2, sm: 3, md: 5 },
                    pt: { xs: 3, sm: 4, md: 4 },
                    pb: { xs: 2, sm: 3, md: 3 },
                    minHeight: 0,
                }}
            >
                <Box sx={{ 
                    width: "100%", 
                    maxWidth: { xs: "100%", md: 620 },
                    mb: { xs: 4, sm: 6, md: 8 }
                }}>
                    {children}
                </Box>
            </Box>
            {footer && (
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: 700,
                        mx: "auto",
                        px: { xs: 3, md: 5 },
                        pt: { xs: 2, md: 2.5 },
                        pb: { xs: 3, md: 3.25 },
                    }}
                >
                    {footer}
                </Box>
            )}
        </Box>
    );
};
