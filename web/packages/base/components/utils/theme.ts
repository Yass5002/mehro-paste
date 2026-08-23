import type { Theme, TypographyVariantsOptions } from "@mui/material";
import { createTheme } from "@mui/material";
import type { Components } from "@mui/material/styles";

const getTheme = (): Theme => {
    const colors = getColors();
    const colorSchemes = getColorSchemes(colors);
    return createTheme({
        defaultColorScheme: "dark",
        colorSchemes,
        typography: getTypography(),
        components: getComponents(),
        shape: { borderRadius: 8 },
        transitions: { duration: { leavingScreen: 300 } },
    });
};

const getColors = () => ({
    ..._colors,
    fixed: {
        ..._colors.fixed,
        dark: {
            background: _colors.dark.background,
            text: _colors.dark.text,
            divider: _colors.dark.stroke.faint,
        },
    },
    accent: _colors.accent,
    accentDark: _colors.accent,
    accentContrastText: _colors.fixed.white,
    dark: _colors.dark,
});

const _colors = {
    accent: { dark: "#0056CC", main: "#1071FF", light: "#1071FF" },
    fixed: {
        white: "#fff",
        black: "#000",
        success: "#1db954",
        golden: "#ffc107",
        danger: { dark: "#f53434", main: "#ea3f3f", light: "#ff6565" },
        switchOn: "#2eca45",
    },
    dark: {
        background: {
            default: "#161616",
            paper: "#212121",
            paper2: "#252525",
            searchInput: "#212121",
        },
        backdrop: {
            base: "rgba(0 0 0 / 0.90)",
            muted: "rgba(0 0 0 / 0.65)",
            faint: "rgba(0 0 0 / 0.20)",
        },
        text: {
            base: "#fff",
            muted: "rgba(255 255 255 / 0.70)",
            faint: "rgba(255 255 255 / 0.50)",
        },
        fill: {
            base: "#fff",
            muted: "rgba(255 255 255 / 0.16)",
            faint: "rgba(255 255 255 / 0.12)",
            faintHover: "rgba(255 255 255 / 0.16)",
            fainter: "rgba(255 255 255 / 0.05)",
        },
        secondary: { main: "#2b2b2b", hover: "#373737" },
        stroke: {
            base: "#fff",
            muted: "rgba(255 255 255 / 0.24)",
            faint: "rgba(255 255 255 / 0.16)",
            fainter: "rgba(255 255 255 / 0.12)",
        },
        boxShadow: {
            paper: "0px 2px 12px rgba(0 0 0 / 0.75)",
            menu: "0px 0px 6px rgba(0 0 0 / 0.50), 0px 3px 6px rgba(0 0 0 / 0.25)",
        },
    },
};

const getColorSchemes = (colors: ReturnType<typeof getColors>) => ({
    dark: {
        palette: {
            background: {
                ...colors.dark.background,
                elevatedPaper: colors.dark.background.paper,
            },
            backdrop: colors.dark.backdrop,
            primary: {
                main: colors.fixed.white,
                contrastText: colors.fixed.black,
            },
            secondary: {
                main: colors.dark.secondary.main,
                dark: colors.dark.secondary.hover,
                contrastText: colors.dark.text.base,
            },
            success: { main: colors.fixed.success },
            warning: { main: colors.fixed.golden },
            accent: {
                main: colors.accentDark.main,
                dark: colors.accentDark.dark,
                light: colors.accentDark.light,
                contrastText: colors.accentContrastText,
            },
            critical: {
                main: colors.fixed.danger.main,
                dark: colors.fixed.danger.dark,
                light: colors.fixed.danger.light,
                contrastText: colors.fixed.white,
            },
            text: {
                primary: colors.dark.text.base,
                secondary: colors.dark.text.muted,
                disabled: colors.dark.text.faint,
                base: colors.dark.text.base,
                muted: colors.dark.text.muted,
                faint: colors.dark.text.faint,
            },
            fill: colors.dark.fill,
            stroke: colors.dark.stroke,
            divider: colors.dark.stroke.faint,
            fixed: colors.fixed,
            boxShadow: colors.dark.boxShadow,
            action: {
                active: colors.dark.stroke.base,
                hover: colors.dark.fill.faintHover,
                hoverOpacity: 0.16,
                disabled: colors.dark.text.faint,
                disabledBackground: colors.dark.fill.faint,
            },
            FilledInput: {
                bg: colors.dark.fill.faint,
                hoverBg: colors.dark.fill.faintHover,
                disabledBg: colors.dark.fill.fainter,
            },
        },
    },
});

const baseTypography: TypographyVariantsOptions = {
    fontFamily: '"Inter Variable", sans-serif',
    fontWeightLight: 500,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: { fontSize: "48px", lineHeight: "58px", fontWeight: 600 },
    h2: { fontSize: "32px", lineHeight: "39px", fontWeight: 500 },
    h3: { fontSize: "24px", lineHeight: "29px", fontWeight: 600 },
    h4: { fontSize: "22px", lineHeight: "27px", fontWeight: 500 },
    h5: { fontSize: "20px", lineHeight: "25px", fontWeight: 600 },
    h6: { fontSize: "18px", lineHeight: "22px", fontWeight: 600 },
    body: { fontSize: "16px", lineHeight: "20px" },
    small: { fontSize: "14px", lineHeight: "17px" },
    mini: { fontSize: "12px", lineHeight: "15px" },
    tiny: { fontSize: "10px", lineHeight: "12px" },
};

const getTypography = (): TypographyVariantsOptions => baseTypography;

const typography = baseTypography;

// Theme overrides are bundled into every app; keep heavy customization local.
const components: Components = {
    MuiCssBaseline: { styleOverrides: { body: { letterSpacing: "-0.011em" } } },

    MuiTypography: {
        defaultProps: {
            variant: "body",
            variantMapping: { body: "p", small: "p", mini: "p", tiny: "p" },
        },
    },

    MuiModal: {
        styleOverrides: {
            root: {
                // Invisible stale modal roots must not block clicks.
                '&:has(> div[style*="opacity: 0"])': { pointerEvents: "none" },
            },
        },
    },

    MuiDrawer: {
        styleOverrides: {
            root: {
                ".MuiBackdrop-root": {
                    backgroundColor: "var(--mui-palette-backdrop-muted)",
                },
            },
        },
    },

    MuiDialog: {
        defaultProps: {
            // The explicit value suppresses aria-hidden focus warnings on close.
            closeAfterTransition: false,
        },
        styleOverrides: {
            root: {
                ".MuiBackdrop-root": {
                    backgroundColor: "var(--mui-palette-backdrop-muted)",
                },
                "& .MuiDialogTitle-root": { padding: "16px" },
                "& .MuiDialogContent-root": {
                    padding: "16px",
                    overflowY: "auto",
                },
                "& .MuiDialogActions-root": { padding: "16px" },
                ".MuiDialogTitle-root + .MuiDialogContent-root": {
                    paddingTop: "16px",
                },
            },
        },
    },

    MuiPaper: {
        styleOverrides: {
            root: {
                variants: [
                    {
                        props: { variant: "elevation" },
                        style: {
                            backgroundImage: "none",
                            boxShadow: "var(--mui-palette-boxShadow-paper)",
                        },
                    },
                    { props: { elevation: 0 }, style: { boxShadow: "none" } },
                ],
            },
        },
    },

    MuiLink: {
        defaultProps: { underline: "none" },
        styleOverrides: {
            root: { "&:hover": { color: "var(--mui-palette-accent-main)" } },
        },
    },

    MuiButton: {
        defaultProps: { variant: "contained", disableElevation: true },
        styleOverrides: {
            root: {
                padding: "12px 16px",
                borderRadius: "4px",
                textTransform: "none",
                fontSize: typography.body?.fontSize,
                lineHeight: typography.body?.lineHeight,
                fontWeight: 600,
            },
            startIcon: { marginRight: "12px", "&& >svg": { fontSize: "20px" } },
            endIcon: { marginLeft: "12px", "&& >svg": { fontSize: "20px" } },
        },
    },

    MuiInputBase: {
        styleOverrides: {
            formControl: {
                borderRadius: "8px",
                overflow: "hidden",
                "::before": { borderBottom: "none !important" },
            },
        },
    },

    MuiTextField: {
        defaultProps: {
            variant: "filled",
            // Dense margins are too tight with helper text; override them there.
            margin: "dense",
        },
        styleOverrides: {
            root: { "& .MuiInputAdornment-root": { marginRight: "8px" } },
        },
    },

    MuiCheckbox: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
            root: {
                "&.Mui-focusVisible": {
                    backgroundColor: "var(--mui-palette-fill-faint)",
                    outline: "1px solid var(--mui-palette-stroke-faint)",
                },
            },
        },
    },

    MuiSvgIcon: {
        styleOverrides: {
            root: {
                variants: [
                    {
                        props: { color: "primary" },
                        style: { color: "var(--mui-palette-stroke-base)" },
                    },
                    {
                        props: { color: "secondary" },
                        style: { color: "var(--mui-palette-stroke-muted)" },
                    },
                ],
            },
        },
    },

    MuiIconButton: {
        styleOverrides: {
            root: {
                padding: "12px",
                variants: [
                    {
                        props: { color: "primary" },
                        style: { color: "var(--mui-palette-stroke-base)" },
                    },
                    {
                        props: { color: "secondary" },
                        style: { color: "var(--mui-palette-stroke-muted)" },
                    },
                ],
                "&.Mui-disabled": { color: "var(--mui-palette-stroke-faint)" },
            },
        },
    },

    MuiMenu: {
        styleOverrides: {
            root: {
                ".MuiMenu-paper": {
                    boxShadow: "var(--mui-palette-boxShadow-menu)",
                },
            },
        },
    },

    MuiSnackbar: { styleOverrides: { root: { borderRadius: "8px" } } },

    MuiAlert: { defaultProps: { variant: "outlined" } },
};

const getComponents = (): Components => components;

export const shareTheme = getTheme();
export const pasteTheme = shareTheme;

