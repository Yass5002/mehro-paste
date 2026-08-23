import { usePasteColorMode } from "@/features/paste/hooks/usePasteColorMode";
import { getPasteThemeTokens } from "@/features/paste/theme/pasteThemeTokens";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {
    Box,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { ShowHidePasswordInputAdornment } from "mehro-base/components/mui/PasswordInputAdornment";
import type { SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { pasteTextFieldSx } from "./textFieldSx";

interface PasteViewPanelProps {
    consuming: boolean;
    consumeError: string | null;
    resolvedText: string | null;
    passwordRequired: boolean;
    passwordError: string | null;
    onSubmitPassword: (password: string) => Promise<void>;
    onCopyText: (value: string) => Promise<void>;
    isBurnOnRead: boolean;
}

export const PasteViewPanel = ({
    consuming,
    consumeError,
    resolvedText,
    passwordRequired,
    passwordError,
    onSubmitPassword,
    onCopyText,
    isBurnOnRead,
}: PasteViewPanelProps) => {
    const { resolvedMode } = usePasteColorMode();
    const tokens = getPasteThemeTokens(resolvedMode);
    const [copied, setCopied] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const copiedTimerRef = useRef<number | null>(null);
    const passwordInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        return () => {
            if (copiedTimerRef.current !== null) {
                window.clearTimeout(copiedTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!passwordError) return;

        setPassword("");
        passwordInputRef.current?.focus();
    }, [passwordError]);

    const handlePasswordSubmit = (event: SyntheticEvent) => {
        event.preventDefault();
        if (!password) {
            return;
        }
        void onSubmitPassword(password);
    };

    return (
        <>
            {passwordRequired &&
                !consuming &&
                !consumeError &&
                !resolvedText && (
                    <Stack
                        component="form"
                        onSubmit={handlePasswordSubmit}
                        spacing={1.4}
                        sx={{
                            alignItems: "center",
                            width: "100%",
                            pt: { xs: 1.5, md: 2 },
                            pb: { xs: 0.5, md: 1 },
                        }}
                    >
                        <Typography
                            sx={{
                                color: tokens.status.loadingTitle,
                                fontWeight: 600,
                                fontSize: { xs: "1rem", md: "1.1rem" },
                                lineHeight: 1.2,
                                textAlign: "center",
                            }}
                        >
                            Enter paste password
                        </Typography>
                        <TextField
                            variant="filled"
                            hiddenLabel
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            value={password}
                            error={!!passwordError}
                            helperText={passwordError}
                            inputRef={passwordInputRef}
                            autoFocus
                            placeholder="Password"
                            slotProps={{
                                htmlInput: {
                                    "aria-label": "Paste password",
                                    autoComplete: "new-password",
                                    name: "paste-pwd",
                                },
                                input: {
                                    disableUnderline: true,
                                    endAdornment: (
                                        <ShowHidePasswordInputAdornment
                                            showPassword={showPassword}
                                            onToggle={() =>
                                                setShowPassword(
                                                    (prev) => !prev
                                                )
                                            }
                                        />
                                    ),
                                },
                            }}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            sx={[
                                pasteTextFieldSx(tokens, "12px"),
                                {
                                    maxWidth: 400,
                                    width: "100%",
                                    "& .MuiFilledInput-root": {
                                        px: 1.5,
                                        py: 0,
                                        minHeight: 48,
                                        alignItems: "center",
                                        display: "flex",
                                        borderRadius: "12px",
                                        backdropFilter:
                                            "blur(9px) saturate(112%)",
                                        WebkitBackdropFilter:
                                            "blur(9px) saturate(112%)",
                                        background:
                                            tokens.surface.inputGradient,
                                        boxShadow: tokens.surface.inputShadow,
                                    },
                                    "& .MuiFilledInput-root.Mui-error": {
                                        borderColor: tokens.status.errorIcon,
                                    },
                                    "& .MuiFormHelperText-root": {
                                        mx: 0,
                                        mt: 0.75,
                                        color: tokens.status.errorBody,
                                        fontSize: "0.8rem",
                                        lineHeight: 1.25,
                                        textAlign: "center",
                                    },
                                },
                            ]}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disableElevation
                            disabled={!password}
                            sx={{
                                px: "30px",
                                py: "13px",
                                minHeight: 50,
                                borderRadius: "10px",
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.96rem",
                                lineHeight: 1,
                                bgcolor: tokens.button.primaryBg,
                                color: tokens.button.primaryText,
                                "&:hover": {
                                    bgcolor: tokens.button.primaryHoverBg,
                                    boxShadow: "none",
                                },
                                "&.Mui-disabled": {
                                    bgcolor: tokens.button.primaryDisabledBg,
                                    color: tokens.button.primaryDisabledText,
                                },
                            }}
                        >
                            Open paste
                        </Button>
                    </Stack>
                )}

            {consuming && (
                <Stack
                    spacing={1.1}
                    sx={{
                        alignItems: "center",
                        width: "100%",
                        pt: { xs: 1.5, md: 2 },
                        pb: { xs: 0.5, md: 1 },
                    }}
                >
                    <CircularProgress
                        size={58}
                        thickness={4.5}
                        sx={{
                            color: tokens.status.spinner,
                            mb: { xs: 0.7, md: 0.9 },
                        }}
                    />
                    <Typography
                        sx={{
                            color: tokens.status.loadingTitle,
                            fontWeight: 600,
                            fontSize: { xs: "1rem", md: "1.1rem" },
                            lineHeight: 1.2,
                            letterSpacing: "0.01em",
                            textAlign: "center",
                        }}
                    >
                        Opening secure paste...
                    </Typography>
                    <Typography
                        variant="mini"
                        sx={{
                            color: tokens.status.loadingBody,
                            fontWeight: 500,
                            textAlign: "center",
                        }}
                    >
                        Decrypting in your browser.
                    </Typography>
                </Stack>
            )}

            {consumeError && (
                <Stack
                    spacing={1.8}
                    sx={{
                        alignItems: "center",
                        width: "100%",
                        pt: { xs: 1, md: 1.5 },
                        pb: { xs: 0.5, md: 1 },
                    }}
                >
                    <Box
                        sx={{
                            width: "clamp(150px, 32vw, 210px)",
                            maxWidth: "100%",
                            userSelect: "none",
                            lineHeight: 0,
                            mb: 0.5,
                            "& img": {
                                display: "block",
                                width: "100%",
                                height: "auto",
                                filter: "drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45))",
                            },
                        }}
                    >
                        <img
                            src="/mascot/404.avif"
                            alt="Mascot: paste not found"
                            draggable={false}
                        />
                    </Box>
                    <Stack
                        spacing={{ xs: 2.2, md: 2.6 }}
                        sx={{ alignItems: "center" }}
                    >
                        <Typography
                            sx={{
                                maxWidth: 560,
                                color: tokens.status.errorBody,
                                fontWeight: 500,
                                fontSize: { xs: "0.85rem", md: "0.92rem" },
                                lineHeight: 1.3,
                                textAlign: "center",
                            }}
                        >
                            {consumeError}
                        </Typography>
                        <Button
                            variant="contained"
                            component="a"
                            href="/"
                            disableElevation
                            sx={{
                                px: "34px",
                                py: "14px",
                                minHeight: 54,
                                borderRadius: "10px",
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "1rem",
                                lineHeight: 1,
                                bgcolor: tokens.button.primaryBg,
                                color: tokens.button.primaryText,
                                "&:hover": {
                                    bgcolor: tokens.button.primaryHoverBg,
                                    boxShadow: "none",
                                },
                            }}
                        >
                            Create new paste
                        </Button>
                    </Stack>
                </Stack>
            )}

            {resolvedText && (
                <Stack spacing={1.8}>
                    <Box sx={{ position: "relative", width: "100%" }}>
                        <TextField
                            variant="filled"
                            hiddenLabel
                            fullWidth
                            multiline
                            minRows={10}
                            maxRows={14}
                            value={resolvedText}
                            slotProps={{
                                htmlInput: { "aria-label": "Paste contents" },
                                input: {
                                    readOnly: true,
                                    disableUnderline: true,
                                },
                            }}
                            sx={[
                                pasteTextFieldSx(tokens, "20px"),
                                {
                                    "& .MuiFilledInput-root": {
                                        paddingBottom: "72px",
                                        maxHeight: { xs: 320, sm: 360 },
                                        overflow: "hidden",
                                        backdropFilter:
                                            "blur(9px) saturate(112%)",
                                        WebkitBackdropFilter:
                                            "blur(9px) saturate(112%)",
                                        background:
                                            tokens.surface.inputGradient,
                                        boxShadow: tokens.surface.inputShadow,
                                        "&:hover": {
                                            bgcolor: tokens.surface.inputBg,
                                            borderColor:
                                                tokens.surface.inputBorder,
                                            background:
                                                tokens.surface.inputGradient,
                                            boxShadow:
                                                tokens.surface.inputShadow,
                                        },
                                        "&.Mui-focused": {
                                            bgcolor: tokens.surface.inputBg,
                                            borderColor:
                                                tokens.surface.inputBorder,
                                            background:
                                                tokens.surface.inputGradient,
                                            boxShadow:
                                                tokens.surface.inputShadow,
                                        },
                                    },
                                },
                            ]}
                        />
                        <Box
                            sx={{
                                position: "absolute",
                                left: 18,
                                right: 18,
                                bottom: 18,
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                gap: 1.2,
                                pointerEvents: "none",
                            }}
                        >
                            <Button
                                variant="contained"
                                size="small"
                                disableElevation
                                onClick={() => {
                                    void onCopyText(resolvedText)
                                        .then(() => {
                                            setCopied(true);
                                            if (
                                                copiedTimerRef.current !== null
                                            ) {
                                                window.clearTimeout(
                                                    copiedTimerRef.current,
                                                );
                                            }
                                            copiedTimerRef.current =
                                                window.setTimeout(() => {
                                                    setCopied(false);
                                                    copiedTimerRef.current =
                                                        null;
                                                }, 900);
                                        })
                                        .catch(() => {
                                            // Ignore errors to avoid unhandled rejections in click handlers.
                                        });
                                }}
                                startIcon={
                                    <ContentCopyRoundedIcon
                                        sx={{ fontSize: 16 }}
                                    />
                                }
                                sx={{
                                    pointerEvents: "auto",
                                    minHeight: 34,
                                    px: 1.25,
                                    borderRadius: "10px",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.78rem",
                                    bgcolor: tokens.button.primaryBg,
                                    color: tokens.button.primaryText,
                                    boxShadow: "none",
                                    "& .MuiButton-startIcon": { mr: 0.6 },
                                    "&:hover": {
                                        bgcolor: tokens.button.primaryHoverBg,
                                        boxShadow: "none",
                                    },
                                }}
                            >
                                {copied ? "Copied" : "Copy"}
                            </Button>
                        </Box>
                    </Box>
                    <Typography
                        variant="mini"
                        sx={{
                            color: tokens.status.deletedNote,
                            fontWeight: 500,
                            textAlign: "center",
                            alignSelf: "center",
                        }}
                    >
                        {isBurnOnRead
                            ? "This paste has been removed from Mehro servers."
                            : "This paste is securely end-to-end encrypted."}
                    </Typography>
                </Stack>
            )}
        </>
    );
};
