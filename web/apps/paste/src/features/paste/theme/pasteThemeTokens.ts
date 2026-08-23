export type PasteResolvedMode = "dark";

export interface PasteThemeTokens {
    accent: { main: string; hover: string; soft: string; contrastText: string };
    frame: {
        outerBg: string;
        innerBg: string;
        innerBorder: string;
        selectionBg: string;
        selectionText: string;
        headerIcon: string;
        headerIconHoverBg: string;
        modeIconBorder: string;
        modeIconBg: string;
        modeMenuBg: string;
        modeMenuBorder: string;
        logoTint: string;
    };
    text: {
        primary: string;
        secondary: string;
        muted: string;
        subtle: string;
        placeholder: string;
        counter: string;
        counterHighlight: string;
        footer: string;
        footerDot: string;
        copied: string;
        dialogBody: string;
    };
    surface: {
        inputBg: string;
        inputBorder: string;
        inputGradient: string;
        inputShadow: string;
        chipBg: string;
        chipBorder: string;
        chipText: string;
        chipInsetShadow: string;
        linkRowBg: string;
        linkRowBorder: string;
        linkRowInsetShadow: string;
        floatingCardBg: string;
        floatingCardBorder: string;
        floatingCardShadow: string;
        qrBackdropDesktop: string;
        qrBackdropMobile: string;
        dialogBackdrop: string;
        dialogBg: string;
        dialogBorder: string;
    };
    button: {
        primaryBg: string;
        primaryHoverBg: string;
        primaryText: string;
        primaryDisabledBg: string;
        primaryDisabledText: string;
        ghostBorder: string;
        ghostText: string;
        ghostHoverBorder: string;
        ghostHoverBg: string;
        qrToggleBorder: string;
        qrToggleBg: string;
        qrToggleActiveBg: string;
        qrToggleHoverBg: string;
        qrToggleActiveHoverBg: string;
        qrToggleText: string;
        scriptLink: string;
        scriptLinkHover: string;
    };
    status: {
        spinner: string;
        loadingTitle: string;
        loadingBody: string;
        errorIcon: string;
        errorBody: string;
        deletedNote: string;
    };
    qr: {
        paperBg: string;
        module: string;
        finder: string;
        mobilePaperBg: string;
    };
}

const darkTokens: PasteThemeTokens = {
    accent: {
        main: "#2f6df7",
        hover: "#4c86ff",
        soft: "rgba(47, 109, 247, 0.14)",
        contrastText: "#f4f7ff",
    },
    frame: {
        outerBg: "#0d1016",
        innerBg: "#0d1016",
        innerBorder: "rgba(255, 255, 255, 0.04)",
        selectionBg: "#2f6df7",
        selectionText: "#ffffff",
        headerIcon: "#f4f7ff",
        headerIconHoverBg: "rgba(255, 255, 255, 0.12)",
        modeIconBorder: "rgba(227, 236, 255, 0.25)",
        modeIconBg: "rgba(255, 255, 255, 0.03)",
        modeMenuBg: "rgba(20, 26, 40, 0.98)",
        modeMenuBorder: "rgba(214, 226, 255, 0.16)",
        logoTint: "#ffffff",
    },
    text: {
        primary: "rgba(244, 247, 255, 0.95)",
        secondary: "rgba(220, 229, 255, 0.82)",
        muted: "rgba(186, 201, 232, 0.56)",
        subtle: "rgba(182, 197, 229, 0.44)",
        placeholder: "rgba(230, 236, 255, 0.42)",
        counter: "rgba(234, 238, 255, 0.6)",
        counterHighlight: "rgba(204, 224, 255, 0.96)",
        footer: "rgba(220, 229, 255, 0.84)",
        footerDot: "rgba(220, 229, 255, 0.58)",
        copied: "rgba(182, 190, 208, 0.9)",
        dialogBody: "rgba(220, 229, 255, 0.82)",
    },
    surface: {
        inputBg: "rgba(39, 42, 52, 0.76)",
        inputBorder: "rgba(213, 225, 255, 0.14)",
        inputGradient:
            "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 58%, rgba(255, 255, 255, 0.015) 100%)",
        inputShadow:
            "0 12px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        chipBg: "rgba(255, 255, 255, 0.045)",
        chipBorder: "rgba(147, 155, 177, 0.24)",
        chipText: "rgba(220, 229, 255, 0.55)",
        chipInsetShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        linkRowBg: "rgba(255, 255, 255, 0.05)",
        linkRowBorder: "rgba(214, 226, 255, 0.16)",
        linkRowInsetShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        floatingCardBg: "rgba(9, 18, 48, 0.9)",
        floatingCardBorder: "rgba(47, 109, 247, 0.44)",
        floatingCardShadow: "0 16px 40px rgba(0, 0, 0, 0.42)",
        qrBackdropDesktop: "rgba(5, 10, 24, 0.72)",
        qrBackdropMobile: "rgba(5, 10, 24, 0.72)",
        dialogBackdrop: "rgba(5, 10, 24, 0.74)",
        dialogBg: "rgba(39, 42, 52, 0.76)",
        dialogBorder: "rgba(213, 225, 255, 0.14)",
    },
    button: {
        primaryBg: "#2f6df7",
        primaryHoverBg: "#2f6df7",
        primaryText: "rgba(231, 238, 252, 0.9)",
        primaryDisabledBg: "rgba(255, 255, 255, 0.18)",
        primaryDisabledText: "rgba(230, 236, 255, 0.44)",
        ghostBorder: "rgba(214, 226, 255, 0.28)",
        ghostText: "rgba(236, 242, 255, 0.95)",
        ghostHoverBorder: "rgba(214, 226, 255, 0.44)",
        ghostHoverBg: "rgba(255, 255, 255, 0.06)",
        qrToggleBorder: "rgba(244, 247, 255, 0.35)",
        qrToggleBg: "rgba(244, 247, 255, 0.12)",
        qrToggleActiveBg: "rgba(244, 247, 255, 0.22)",
        qrToggleHoverBg: "rgba(244, 247, 255, 0.18)",
        qrToggleActiveHoverBg: "rgba(244, 247, 255, 0.28)",
        qrToggleText: "#f4f7ff",
        scriptLink: "#2f6df7",
        scriptLinkHover: "#5d92ff",
    },
    status: {
        spinner: "rgba(176, 198, 234, 0.76)",
        loadingTitle: "rgba(201, 212, 236, 0.66)",
        loadingBody: "rgba(188, 201, 230, 0.44)",
        errorIcon: "rgba(180, 198, 232, 0.76)",
        errorBody: "rgba(186, 201, 232, 0.46)",
        deletedNote: "rgba(182, 197, 229, 0.44)",
    },
    qr: {
        paperBg: "#fff",
        module: "#2f6df7",
        finder: "#1d3d9f",
        mobilePaperBg: "#fff",
    },
};

export const getPasteThemeTokens = (
    mode?: PasteResolvedMode,
): PasteThemeTokens => {
    void mode;
    return darkTokens;
};

