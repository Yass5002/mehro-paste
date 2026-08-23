import { usePasteColorMode } from "@/features/paste/hooks/usePasteColorMode";
import { getPasteThemeTokens } from "@/features/paste/theme/pasteThemeTokens";
import { Navigation06Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { ShowHidePasswordInputAdornment } from "mehro-base/components/mui/PasswordInputAdornment";
import type { SyntheticEvent } from "react";
import { useState } from "react";
import { MAX_PASTE_CHARS } from "../constants";
import { PasteLinkCard } from "./PasteLinkCard";
import { PeekingMascot } from "./PeekingMascot";
import { downloadPasteQrCode } from "./qrCode";
import { pasteTextFieldSx } from "./textFieldSx";

const TTL_OPTIONS = [
    { label: "5 minutes", value: 300 },
    { label: "1 hour", value: 3600 },
    { label: "1 day", value: 86400 },
    { label: "3 days", value: 259200 },
    { label: "1 week", value: 604800 },
];

interface PasteCreatePanelProps {
    inputText: string;
    creating: boolean;
    createError: string | null;
    createdLink: string | null;
    createdLinkPasswordProtected: boolean;
    createdLinkMeta?: { burnOnRead: boolean; ttlSeconds: number } | null;
    onInputChange: (value: string) => void;
    onCreate: (
        password?: string,
        customTtl?: number,
        customBurnOnRead?: boolean,
    ) => Promise<void>;
    onReset?: () => void;
    onCopyLink: (value: string) => Promise<void>;
    onShareLink: (url: string) => Promise<void>;
}

export const PasteCreatePanel = ({
    inputText,
    creating,
    createError,
    createdLink,
    createdLinkPasswordProtected,
    createdLinkMeta,
    onInputChange,
    onCreate,
    onReset,
    onCopyLink,
    onShareLink,
}: PasteCreatePanelProps) => {
    const { resolvedMode } = usePasteColorMode();
    const tokens = getPasteThemeTokens(resolvedMode);
    const [burnOnRead, setBurnOnRead] = useState(true);
    const [ttlSeconds, setTtlSeconds] = useState(86400);
    const [ttlMenuAnchorEl, setTtlMenuAnchorEl] =
        useState<null | HTMLElement>(null);
    const [passwordProtected, setPasswordProtected] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const isInputEmpty = inputText.trim().length === 0;
    const nearLimitThreshold = Math.floor(MAX_PASTE_CHARS * 0.9);
    const isNearCharLimit = inputText.length >= nearLimitThreshold;
    const isCreateDisabled = isInputEmpty;
    const passwordTooltip = passwordProtected
        ? "Password protection enabled"
        : "Password protect";
    const errorColor = "rgba(255, 139, 160, 0.9)";
    const passwordDialogBg = "#0d1016";
    const passwordDialogShadow = "0 22px 56px rgba(0, 0, 0, 0.48)";

    const passwordFieldSx = {
        ...pasteTextFieldSx(tokens, "14px"),
        "& .MuiFilledInput-root": {
            borderRadius: "12px",
            bgcolor: "transparent",
            border: "1px solid",
            borderColor: tokens.surface.inputBorder,
            boxSizing: "border-box",
            minHeight: 48,
            alignItems: "center",
            px: 1.45,
            py: 0,
            background: "transparent",
            boxShadow: "none",
            transition:
                "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
            "&:before, &:after": {
                display: "none",
                borderBottom: "0 !important",
            },
            "&:hover:not(.Mui-disabled, .Mui-error):before": {
                display: "none",
                borderBottom: "0 !important",
            },
            "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.03)",
                borderColor: tokens.surface.inputBorder,
                background: "rgba(255, 255, 255, 0.03)",
                boxShadow: "none",
            },
            "&.Mui-focused": {
                bgcolor: "rgba(255, 255, 255, 0.035)",
                borderColor: tokens.button.primaryBg,
                background: "rgba(255, 255, 255, 0.035)",
                boxShadow: `0 0 0 2px ${tokens.accent.soft}`,
            },
            "&.Mui-error": { borderColor: errorColor },
        },
        "& .MuiInputBase-input": {
            color: tokens.text.primary,
            fontSize: { xs: "0.92rem", sm: "0.95rem" },
            lineHeight: 1.35,
            padding: "0 !important",
            borderBottom: "0 !important",
            boxShadow: "none",
        },
        "& .MuiFilledInput-underline:before, & .MuiFilledInput-underline:after":
            { display: "none", borderBottom: "0 !important" },
        "& .MuiInputAdornment-root": { ml: 0.75, mr: 0.5 },
        "& .MuiIconButton-root": {
            p: 0.75,
            color: tokens.text.placeholder,
            "&:hover": {
                color: tokens.text.primary,
                bgcolor: "rgba(255, 255, 255, 0.06)",
            },
        },
        "& .MuiIconButton-edgeEnd": { mr: 0 },
        "& .MuiSvgIcon-root": { fontSize: 19 },
        "& input::placeholder": { color: tokens.text.placeholder, opacity: 1 },
        "& .MuiFormHelperText-root": {
            mx: 0,
            mt: 0.65,
            color: tokens.text.subtle,
            fontSize: "0.78rem",
            lineHeight: 1.25,
        },
        "& .MuiFormHelperText-root.Mui-error": { color: errorColor },
    };

    const resetPasswordDialog = () => {
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setPasswordError(null);
    };

    const togglePasswordVisibility = () => {
        setShowPassword((visible) => !visible);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword((visible) => !visible);
    };

    const handlePasswordSubmit = (event: SyntheticEvent) => {
        event.preventDefault();
        if (!password) {
            setPasswordError("Enter a password");
            return;
        }
        if (password !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }

        const submittedPassword = password;
        setPasswordDialogOpen(false);
        resetPasswordDialog();
        void onCreate(submittedPassword, ttlSeconds, burnOnRead);
    };

    const handleDownloadQrClick = () => {
        if (!createdLink) return;

        void downloadPasteQrCode({
            value: createdLink,
            tokens,
            paperBg: tokens.qr.paperBg,
            showCenterLock: createdLinkPasswordProtected,
        }).catch(() => undefined);
    };

    return (
        <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            {createdLink ? (
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        animation:
                            "pasteFadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                        "@keyframes pasteFadeIn": {
                            "0%": {
                                opacity: 0,
                                transform: "scale(0.97) translateY(6px)",
                            },
                            "100%": {
                                opacity: 1,
                                transform: "scale(1) translateY(0)",
                            },
                        },
                    }}
                >
                    <PasteLinkCard
                        link={createdLink}
                        onCopy={onCopyLink}
                        onShare={onShareLink}
                        onDownloadQr={handleDownloadQrClick}
                        onCreateNew={onReset}
                        passwordProtected={createdLinkPasswordProtected}
                        burnOnRead={
                            createdLinkMeta
                                ? createdLinkMeta.burnOnRead
                                : burnOnRead
                        }
                        ttlSeconds={
                            createdLinkMeta
                                ? createdLinkMeta.ttlSeconds
                                : ttlSeconds
                        }
                    />
                </Box>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        animation:
                            "pasteFadeIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
                        "@keyframes pasteFadeIn": {
                            "0%": {
                                opacity: 0,
                                transform: "scale(0.98) translateY(-4px)",
                            },
                            "100%": {
                                opacity: 1,
                                transform: "scale(1) translateY(0)",
                            },
                        },
                    }}
                >
                    <Box
                        sx={{
                            position: "relative",
                            width: "100%",
                            maxWidth: "100%",
                            minWidth: 0,
                            mt: "clamp(145px, 35vw, 250px)",
                        }}
                    >
                        <PeekingMascot
                            passwordProtected={
                                passwordProtected || passwordDialogOpen
                            }
                        />
                        <TextField
                            variant="filled"
                            hiddenLabel
                            fullWidth
                            slotProps={{
                                input: { disableUnderline: true },
                                htmlInput: {
                                    maxLength: MAX_PASTE_CHARS,
                                    "aria-label": "Paste text",
                                },
                            }}
                            multiline
                            rows={8}
                            placeholder="Paste text (keys, snippets, notes, instructions...)"
                            value={inputText}
                            onChange={(event) => {
                                onInputChange(event.target.value);
                            }}
                            sx={[
                                pasteTextFieldSx(tokens, "20px"),
                                {
                                    "& .MuiFilledInput-root": {
                                        paddingTop: { xs: "36px", sm: "40px" },
                                        paddingRight: { xs: "14px", sm: "16px" },
                                        paddingLeft: { xs: "14px", sm: "16px" },
                                        paddingBottom: { xs: "50px", sm: "56px" },
                                        backdropFilter: "blur(9px) saturate(112%)",
                                        WebkitBackdropFilter:
                                            "blur(9px) saturate(112%)",
                                        background: tokens.surface.inputGradient,
                                        boxShadow: tokens.surface.inputShadow,
                                        "&:hover": {
                                            bgcolor: tokens.surface.inputBg,
                                            borderColor: tokens.surface.inputBorder,
                                            background: tokens.surface.inputGradient,
                                            boxShadow: tokens.surface.inputShadow,
                                        },
                                        "&.Mui-focused": {
                                            bgcolor: tokens.surface.inputBg,
                                            borderColor: tokens.surface.inputBorder,
                                            background: tokens.surface.inputGradient,
                                            boxShadow: tokens.surface.inputShadow,
                                        },
                                    },
                                    "& .MuiInputBase-input": {
                                        fontSize: { xs: "0.9rem", sm: "0.96rem" },
                                        lineHeight: 1.6,
                                    },
                                },
                            ]}
                        />
                        <Box
                            sx={{
                                position: "absolute",
                                top: { xs: 10, sm: 12 },
                                right: { xs: 14, sm: 18 },
                                pointerEvents: "none",
                                zIndex: 2,
                            }}
                        >
                            <Typography
                                component="span"
                                variant="mini"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    color: tokens.text.counter,
                                    fontVariantNumeric: "tabular-nums",
                                    fontFeatureSettings: '"tnum"',
                                    fontWeight: 600,
                                    lineHeight: 1,
                                    letterSpacing: "0.01em",
                                    fontSize: { xs: "0.75rem", sm: "0.8rem" },
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        color: isNearCharLimit
                                            ? tokens.text.counterHighlight
                                            : tokens.text.counter,
                                    }}
                                >
                                    {(inputText.length / 1000000).toFixed(6)}
                                </Box>
                                <Box
                                    component="span"
                                    sx={{
                                        color: tokens.text.counter,
                                        opacity: 0.6,
                                        ml: 0.35,
                                        fontWeight: 500,
                                    }}
                                >
                                    / π MB
                                </Box>
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                position: "absolute",
                                left: { xs: 12, sm: 18 },
                                right: { xs: 12, sm: 18 },
                                bottom: { xs: 8, sm: 10 },
                                height: { xs: 36, sm: 40 },
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: { xs: 1, sm: 2 },
                                pointerEvents: "none",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: { xs: 0.6, sm: 0.8 },
                                    height: { xs: 32, sm: 36 },
                                    pointerEvents: "auto",
                                    flexWrap: "nowrap",
                                }}
                            >
                                <Tooltip title={passwordTooltip} arrow>
                                    <IconButton
                                        aria-label={
                                            passwordProtected
                                                ? "Disable password protection"
                                                : "Enable password protection"
                                        }
                                        aria-pressed={passwordProtected}
                                        onClick={() => {
                                            if (creating) return;
                                            setPasswordProtected(
                                                (enabled) => !enabled,
                                            );
                                        }}
                                        sx={{
                                            width: { xs: 30, sm: 32 },
                                            height: { xs: 30, sm: 32 },
                                            color: passwordProtected
                                                ? tokens.button.primaryBg
                                                : tokens.text.counter,
                                            bgcolor: passwordProtected
                                                ? tokens.surface.chipBg
                                                : "transparent",
                                            "&:hover": {
                                                bgcolor: tokens.surface.chipBg,
                                            },
                                        }}
                                    >
                                        {passwordProtected ? (
                                            <LockRoundedIcon
                                                sx={{ fontSize: 17 }}
                                            />
                                        ) : (
                                            <LockOpenRoundedIcon
                                                sx={{ fontSize: 17 }}
                                            />
                                        )}
                                    </IconButton>
                                </Tooltip>

                                {/* Burn-on-Read Pill */}
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={() => {
                                        if (creating) return;
                                        setBurnOnRead((prev) => !prev);
                                    }}
                                    sx={{
                                        appearance: "none",
                                        border: "1px solid",
                                        borderColor: burnOnRead
                                            ? "rgba(255, 95, 80, 0.85)"
                                            : tokens.surface.chipBorder,
                                        bgcolor: burnOnRead
                                            ? "rgba(255, 70, 50, 0.08)"
                                            : tokens.surface.chipBg,
                                        color: tokens.surface.chipText,
                                        borderRadius: "999px",
                                        px: { xs: 1.2, sm: 1.4 },
                                        height: { xs: 28, sm: 30 },
                                        fontSize: {
                                            xs: "0.72rem",
                                            sm: "0.76rem",
                                        },
                                        fontWeight: 600,
                                        letterSpacing: "0.01em",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        transition: "all 150ms ease",
                                        whiteSpace: "nowrap",
                                        boxShadow: burnOnRead
                                            ? "0 0 8px rgba(255, 70, 50, 0.15)"
                                            : tokens.surface.chipInsetShadow,
                                        opacity: 0.95,
                                        "&:hover": {
                                            opacity: 1,
                                            borderColor: burnOnRead
                                                ? "rgba(255, 110, 95, 0.95)"
                                                : tokens.surface.inputBorder,
                                        },
                                    }}
                                >
                                    {burnOnRead ? "Burn on read" : "Multi-view"}
                                </Box>

                                {/* Delete Duration Dropdown Pill */}
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={(e) => {
                                        if (creating) return;
                                        setTtlMenuAnchorEl(e.currentTarget);
                                    }}
                                    sx={{
                                        appearance: "none",
                                        border: "1px solid",
                                        borderColor: tokens.surface.chipBorder,
                                        bgcolor: tokens.surface.chipBg,
                                        color: tokens.surface.chipText,
                                        borderRadius: "999px",
                                        px: { xs: 1.1, sm: 1.3 },
                                        height: { xs: 28, sm: 30 },
                                        fontSize: {
                                            xs: "0.72rem",
                                            sm: "0.76rem",
                                        },
                                        fontWeight: 600,
                                        letterSpacing: "0.01em",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.35,
                                        cursor: "pointer",
                                        transition: "all 150ms ease",
                                        whiteSpace: "nowrap",
                                        boxShadow: tokens.surface.chipInsetShadow,
                                        opacity: 0.95,
                                        "&:hover": {
                                            borderColor:
                                                tokens.surface.inputBorder,
                                            bgcolor: "rgba(255, 255, 255, 0.08)",
                                        },
                                    }}
                                >
                                    <span>
                                        {TTL_OPTIONS.find(
                                            (opt) => opt.value === ttlSeconds,
                                        )?.label ?? "1 day"}
                                    </span>
                                    <KeyboardArrowDownRoundedIcon
                                        sx={{
                                            fontSize: 15,
                                            color: tokens.text.muted,
                                            transform: ttlMenuAnchorEl
                                                ? "rotate(180deg)"
                                                : "none",
                                            transition: "transform 150ms ease",
                                        }}
                                    />
                                </Box>

                                {/* Aesthetic Dropdown Menu */}
                                <Menu
                                    anchorEl={ttlMenuAnchorEl}
                                    open={Boolean(ttlMenuAnchorEl)}
                                    onClose={() => setTtlMenuAnchorEl(null)}
                                    anchorOrigin={{
                                        vertical: "top",
                                        horizontal: "left",
                                    }}
                                    transformOrigin={{
                                        vertical: "bottom",
                                        horizontal: "left",
                                    }}
                                    slotProps={{
                                        paper: {
                                            sx: {
                                                mb: 1,
                                                borderRadius: "16px",
                                                bgcolor: "rgba(18, 22, 30, 0.88)",
                                                backdropFilter:
                                                    "blur(18px) saturate(120%)",
                                                WebkitBackdropFilter:
                                                    "blur(18px) saturate(120%)",
                                                border: "1px solid",
                                                borderColor:
                                                    tokens.surface.dialogBorder,
                                                boxShadow: "0 18px 42px rgba(0, 0, 0, 0.55)",
                                                p: 0.6,
                                                minWidth: 145,
                                            },
                                        },
                                    }}
                                >
                                    {TTL_OPTIONS.map((opt) => (
                                        <MenuItem
                                            key={opt.value}
                                            selected={ttlSeconds === opt.value}
                                            onClick={() => {
                                                setTtlSeconds(opt.value);
                                                setTtlMenuAnchorEl(null);
                                            }}
                                            sx={{
                                                borderRadius: "10px",
                                                fontSize: "0.82rem",
                                                fontWeight:
                                                    ttlSeconds === opt.value
                                                        ? 700
                                                        : 500,
                                                py: 0.85,
                                                px: 1.4,
                                                color:
                                                    ttlSeconds === opt.value
                                                        ? tokens.button.primaryBg
                                                        : tokens.text.primary,
                                                display: "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems: "center",
                                                "&:hover": {
                                                    bgcolor: "rgba(255, 255, 255, 0.07)",
                                                },
                                                "&.Mui-selected": {
                                                    bgcolor: "rgba(47, 109, 247, 0.12)",
                                                    "&:hover": {
                                                        bgcolor: "rgba(47, 109, 247, 0.18)",
                                                    },
                                                },
                                            }}
                                        >
                                            {opt.label}
                                            {ttlSeconds === opt.value && (
                                                <CheckRoundedIcon
                                                    sx={{
                                                        fontSize: 16,
                                                        ml: 1,
                                                        color: tokens.button
                                                            .primaryBg,
                                                    }}
                                                />
                                            )}
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </Box>
                            <IconButton
                                aria-label="Create secure link"
                                aria-busy={creating}
                                onClick={() => {
                                    if (creating || isCreateDisabled) return;
                                    if (passwordProtected) {
                                        setPasswordDialogOpen(true);
                                    } else {
                                        void onCreate(
                                            undefined,
                                            ttlSeconds,
                                            burnOnRead,
                                        );
                                    }
                                }}
                                disabled={isCreateDisabled}
                                sx={{
                                    pointerEvents: "auto",
                                    boxSizing: "border-box",
                                    width: { xs: 34, sm: 38 },
                                    height: { xs: 34, sm: 38 },
                                    minWidth: { xs: 34, sm: 38 },
                                    minHeight: { xs: 34, sm: 38 },
                                    padding: 0,
                                    marginBottom: { xs: "3px", sm: "4px" },
                                    marginRight: { xs: "-1px", sm: "-2px" },
                                    borderRadius: { xs: "12px", sm: "14px" },
                                    bgcolor: tokens.button.primaryBg,
                                    color: tokens.button.primaryText,
                                    boxShadow: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
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
                                {creating ? (
                                    <Box
                                        sx={{
                                            width: 18,
                                            height: 18,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            lineHeight: 0,
                                        }}
                                    >
                                        <CircularProgress
                                            size={17}
                                            thickness={5.2}
                                            sx={{
                                                color: tokens.button.primaryText,
                                                display: "block",
                                                "& .MuiCircularProgress-svg": {
                                                    display: "block",
                                                    transformOrigin: "50% 50%",
                                                },
                                            }}
                                        />
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            transform: "rotate(90deg)",
                                            display: "flex",
                                        }}
                                    >
                                        <HugeiconsIcon
                                            icon={Navigation06Icon}
                                            size={18}
                                            strokeWidth={2}
                                        />
                                    </Box>
                                )}
                            </IconButton>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            mt: { xs: 1.5, sm: 2 },
                            mb: { xs: "1.5rem", sm: "2.2rem" },
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            pointerEvents: "none",
                            userSelect: "none",
                        }}
                    >
                        <Typography
                            variant="mini"
                            sx={{
                                color: tokens.text.muted,
                                fontSize: { xs: "0.78rem", sm: "0.84rem" },
                                fontWeight: 500,
                                letterSpacing: "0.01em",
                                opacity: 0.75,
                            }}
                        >
                            End-to-end encrypted
                        </Typography>
                    </Box>

                    {createError && (
                        <Typography sx={{ color: "error.main", mt: 1 }}>
                            {createError}
                        </Typography>
                    )}
                </Box>
            )}

            <Dialog
                open={passwordDialogOpen}
                onClose={() => {
                    setPasswordDialogOpen(false);
                    resetPasswordDialog();
                }}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    backdrop: {
                        sx: { bgcolor: tokens.surface.dialogBackdrop },
                    },
                    paper: {
                        sx: {
                            mx: { xs: 2.5, sm: 3 },
                            p: { xs: "24px 20px 26px", sm: "28px 26px 30px" },
                            borderRadius: "24px",
                            border: "1px solid",
                            borderColor: tokens.surface.dialogBorder,
                            boxSizing: "border-box",
                            bgcolor: passwordDialogBg,
                            background: "rgba(13, 16, 22, 0.78)",
                            backdropFilter: "blur(16px) saturate(118%)",
                            WebkitBackdropFilter: "blur(16px) saturate(118%)",
                            color: tokens.text.primary,
                            boxShadow: passwordDialogShadow,
                            overflow: "hidden",
                        },
                    },
                }}
            >
                <Box component="form" onSubmit={handlePasswordSubmit}>
                    <DialogTitle
                        component="div"
                        sx={{
                            p: 0,
                            ml: { xs: -1.4, sm: -1.6 },
                            color: tokens.text.primary,
                        }}
                    >
                        <Typography
                            component="h2"
                            sx={{
                                m: 0,
                                color: tokens.text.primary,
                                fontSize: { xs: "1.24rem", sm: "1.38rem" },
                                fontWeight: 750,
                                lineHeight: 1.18,
                            }}
                        >
                            Paste password
                        </Typography>
                        <Typography
                            sx={{
                                mt: 0.5,
                                color: tokens.text.muted,
                                fontSize: { xs: "0.86rem", sm: "0.9rem" },
                                fontWeight: 500,
                                lineHeight: 1.45,
                            }}
                        >
                            This password will be required to unlock this paste.
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ p: "0 !important", mt: 2.25 }}>
                        <Stack spacing={1.5}>
                            <TextField
                                autoFocus
                                variant="filled"
                                hiddenLabel
                                fullWidth
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                autoComplete="off"
                                slotProps={{
                                    htmlInput: { "aria-label": "Password" },
                                    input: {
                                        disableUnderline: true,
                                        endAdornment: (
                                            <ShowHidePasswordInputAdornment
                                                showPassword={showPassword}
                                                onToggle={togglePasswordVisibility}
                                            />
                                        ),
                                    },
                                }}
                                sx={passwordFieldSx}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setPasswordError(null);
                                }}
                            />
                            <TextField
                                variant="filled"
                                hiddenLabel
                                fullWidth
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm password"
                                value={confirmPassword}
                                autoComplete="off"
                                error={!!passwordError}
                                helperText={passwordError}
                                slotProps={{
                                    htmlInput: { "aria-label": "Confirm password" },
                                    input: {
                                        disableUnderline: true,
                                        endAdornment: (
                                            <ShowHidePasswordInputAdornment
                                                showPassword={showConfirmPassword}
                                                onToggle={
                                                    toggleConfirmPasswordVisibility
                                                }
                                            />
                                        ),
                                    },
                                }}
                                sx={passwordFieldSx}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    setPasswordError(null);
                                }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions
                        sx={{
                            gap: 1.1,
                            p: "0 !important",
                            mt: { xs: 3, sm: 3.75 },
                        }}
                    >
                        <Button
                            variant="outlined"
                            sx={{
                                minHeight: 40,
                                minWidth: 96,
                                px: 1.8,
                                borderRadius: "999px",
                                textTransform: "none",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                letterSpacing: "0.01em",
                                borderColor: tokens.button.ghostBorder,
                                color: tokens.button.ghostText,
                                "&:hover": {
                                    borderColor: tokens.button.ghostHoverBorder,
                                    bgcolor: tokens.button.ghostHoverBg,
                                },
                            }}
                            onClick={() => {
                                setPasswordDialogOpen(false);
                                resetPasswordDialog();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disableElevation
                            sx={{
                                minHeight: 40,
                                minWidth: 96,
                                px: 1.8,
                                borderRadius: "999px",
                                textTransform: "none",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                letterSpacing: "0.01em",
                                bgcolor: tokens.button.primaryBg,
                                color: tokens.button.primaryText,
                                boxShadow: "0 2px 8px rgba(47, 109, 247, 0.2)",
                                "&:hover": {
                                    bgcolor: tokens.button.primaryHoverBg,
                                    boxShadow:
                                        "0 3px 10px rgba(47, 109, 247, 0.24)",
                                },
                            }}
                        >
                            Create
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Box>
    );
};
