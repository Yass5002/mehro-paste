import type { PasteThemeTokens } from "../theme/pasteThemeTokens";

type PasteTextFieldTokens = Pick<
    PasteThemeTokens,
    "accent" | "surface" | "text"
>;

export const pasteTextFieldSx = (
    tokens: PasteTextFieldTokens,
    radius = "16px",
) => ({
    margin: 0,
    "& .MuiFilledInput-root": {
        borderRadius: radius,
        bgcolor: tokens.surface.inputBg,
        border: "1px solid",
        borderColor: tokens.surface.inputBorder,
        alignItems: "flex-start",
        boxSizing: "border-box",
        color: tokens.text.primary,
        padding: "14px",
        transition: "border-color 180ms ease, box-shadow 180ms ease",
        "&:before": { display: "none" },
        "&:after": { display: "none" },
        "&:hover:not(.Mui-disabled, .Mui-error):before": { display: "none" },
        "&:hover": { bgcolor: tokens.surface.inputBg },
        "&.Mui-focused": {
            bgcolor: tokens.surface.inputBg,
            borderColor: tokens.accent.main,
            boxShadow: `0 0 0 2px ${tokens.accent.soft}`,
        },
    },
    "& .MuiInputBase-input": {
        padding: "0 !important",
        color: tokens.text.primary,
        fontSize: "1.02rem",
        lineHeight: 1.55,
        "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active": {
            WebkitBoxShadow: `0 0 0 1000px ${tokens.surface.inputBg} inset !important`,
            WebkitTextFillColor: `${tokens.text.primary} !important`,
            caretColor: tokens.text.primary,
            borderRadius: "inherit",
            transition: "background-color 5000s ease-in-out 0s",
        },
    },
    "& .MuiInputBase-multiline > .MuiInputBase-input": {
        padding: "0 !important",
        margin: "0 !important",
    },
    "& .MuiFilledInput-multiline > .MuiFilledInput-input": {
        padding: "0 !important",
        margin: "0 !important",
    },
    "& textarea": {
        padding: "0 !important",
        margin: "0 !important",
        overflowY: "auto",
        msOverflowStyle: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: `${tokens.surface.inputBorder} transparent`,
        "&::-webkit-scrollbar": {
            width: "8px",
        },
        "&::-webkit-scrollbar-track": {
            background: "transparent",
            margin: "12px 0",
        },
        "&::-webkit-scrollbar-thumb": {
            background: tokens.surface.inputBorder,
            borderRadius: "10px",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
        },
        "&::-webkit-scrollbar-thumb:hover": {
            background: tokens.accent.soft,
            border: "2px solid transparent",
            backgroundClip: "padding-box",
        },
    },
    "& textarea::placeholder": { color: tokens.text.placeholder, opacity: 1 },
});
