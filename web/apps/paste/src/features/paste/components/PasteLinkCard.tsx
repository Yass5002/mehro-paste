import { usePasteColorMode } from "@/features/paste/hooks/usePasteColorMode";
import { getPasteThemeTokens } from "@/features/paste/theme/pasteThemeTokens";
import { Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
    Box,
    Button,
    Dialog,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
    parseArrowLottie,
    type ParsedArrow,
    type ParsedArrowPath,
} from "../utils/lottie";
import { PasteQrCode } from "./PasteQrCode";

const formatTtlDuration = (seconds?: number) => {
    if (!seconds) return "24 hours";
    if (seconds <= 300) return "5 mins";
    if (seconds <= 3600) return "1 hr";
    if (seconds <= 86400) return "24 hrs";
    if (seconds <= 259200) return "3 days";
    if (seconds <= 604800) return "1 week";
    return `${Math.round(seconds / 86400)} days`;
};

interface PasteLinkCardProps {
    link: string;
    onCopy: (value: string) => Promise<void>;
    onShare: (url: string) => Promise<void>;
    onDownloadQr?: () => void;
    onCreateNew?: () => void;
    passwordProtected?: boolean;
    burnOnRead?: boolean;
    ttlSeconds?: number;
}

interface MeasuredPath {
    len: number;
    parsed: ParsedArrowPath;
    path: SVGPathElement;
}

export const PasteLinkCard = ({
    link,
    onCopy,
    onShare,
    onDownloadQr,
    onCreateNew,
    passwordProtected = false,
    burnOnRead = true,
    ttlSeconds = 86400,
}: PasteLinkCardProps) => {
    const { resolvedMode } = usePasteColorMode();
    const tokens = getPasteThemeTokens(resolvedMode);
    const inputGlassBg = tokens.surface.dialogBg;
    const inputGlassBorder = tokens.surface.dialogBorder;
    const inputGlassSurface = tokens.surface.inputGradient;
    const inputGlassShadow = tokens.surface.inputShadow;
    const linkCardRef = useRef<HTMLDivElement | null>(null);
    const arrowSvgRef = useRef<SVGSVGElement | null>(null);
    const [arrow, setArrow] = useState<ParsedArrow | null>(null);
    const [showCopied, setShowCopied] = useState(false);
    const [showViewConfirm, setShowViewConfirm] = useState(false);
    const isStackedLayout = useMediaQuery("(max-width:599.95px)", {
        noSsr: true,
    });
    const previewQrSize = isStackedLayout ? 136 : 150;

    useEffect(() => {
        const linkCard = linkCardRef.current;
        if (!linkCard) return;

        const rect = linkCard.getBoundingClientRect();
        const viewportHeight =
            window.innerHeight || document.documentElement.clientHeight;
        const isOutOfViewport = rect.top < 0 || rect.bottom > viewportHeight;
        if (!isOutOfViewport) return;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        linkCard.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });
    }, [link]);

    useEffect(() => {
        let cancelled = false;

        const loadArrow = async () => {
            try {
                const response = await fetch("/arrow.json");
                if (!response.ok) return;

                const json: unknown = await response.json();
                if (cancelled) return;

                const parsed = parseArrowLottie(json);
                setArrow(parsed);
            } catch {
                // No-op: The link row works without the hint animation.
            }
        };

        void loadArrow();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const svg = arrowSvgRef.current;
        if (!arrow || !svg) return;

        const paths = Array.from(
            svg.querySelectorAll<SVGPathElement>(
                'path[data-arrow-path="true"]',
            ),
        );
        if (!paths.length) return;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const measured = paths
            .map((path) => {
                const idx = Number(path.dataset.arrowIndex ?? -1);
                const parsed = arrow.paths[idx];
                return {
                    len: Math.max(path.getTotalLength(), 1),
                    parsed,
                    path,
                };
            })
            .filter((item): item is MeasuredPath => item.parsed !== undefined);

        for (const { path, len, parsed } of measured) {
            const isSecondaryStroke = /shape\s*2/i.test(parsed.name);
            path.style.strokeDasharray = `${len} ${len}`;
            path.style.strokeDashoffset = prefersReducedMotion
                ? "0"
                : `${isSecondaryStroke ? -len : len}`;
        }

        if (prefersReducedMotion) return;

        const animations: Animation[] = [];
        measured.forEach(({ path, len, parsed }) => {
            const isSecondaryStroke = /shape\s*2/i.test(parsed.name);
            const startOffset = isSecondaryStroke ? -len : len;
            const keyframes: Keyframe[] = isSecondaryStroke
                ? [
                    { strokeDashoffset: startOffset, offset: 0 },
                    { strokeDashoffset: startOffset, offset: 0.72 },
                    { strokeDashoffset: 0, offset: 0.93 },
                    { strokeDashoffset: 0, offset: 1 },
                ]
                : [
                    { strokeDashoffset: startOffset, offset: 0 },
                    { strokeDashoffset: startOffset, offset: 0.02 },
                    { strokeDashoffset: 0, offset: 0.78 },
                    { strokeDashoffset: 0, offset: 1 },
                ];

            animations.push(
                path.animate(keyframes, {
                    duration: 1400,
                    iterations: 1,
                    fill: "forwards",
                    easing: "linear",
                }),
            );
        });

        return () => {
            animations.forEach((anim) => {
                anim.cancel();
            });
        };
    }, [arrow]);

    useEffect(() => {
        if (!showCopied) return;
        const timeoutId = window.setTimeout(() => {
            setShowCopied(false);
        }, 1400);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [showCopied]);

    const handleCopyClick = () => {
        setShowCopied(false);
        void onCopy(link)
            .then(() => {
                setShowCopied(true);
            })
            .catch(() => {
                setShowCopied(false);
            });
    };

    const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!burnOnRead) {
            return;
        }
        event.preventDefault();
        setShowViewConfirm(true);
    };

    const handleShareClick = () => {
        void onShare(link);
    };

    const handleCloseViewConfirm = () => {
        setShowViewConfirm(false);
    };

    const handleCopyFromConfirm = () => {
        handleCloseViewConfirm();
        handleCopyClick();
    };

    const handleConfirmOpenLink = () => {
        handleCloseViewConfirm();
        window.open(link, "_blank", "noopener");
    };

    const arrowStrokeColor = "#ffffff";
    return (
        <Stack
            ref={linkCardRef}
            sx={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                scrollMarginTop: { xs: "16px", md: "24px" },
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                    display: "grid",
                    gridTemplateColumns: {
                        xs: `${previewQrSize}px minmax(0, 1fr)`,
                        sm: "150px minmax(0, 1fr)",
                    },
                    gridTemplateAreas: {
                        xs: '"header header" "qr actions" "link link"',
                        sm: '"qr header" "qr link" "qr actions"',
                    },
                    alignItems: "center",
                    rowGap: { xs: 1.3, sm: 1.1 },
                    columnGap: { xs: 1.4, sm: 1.8 },
                    px: { xs: 1.6, sm: 2.2 },
                    py: { xs: 2, sm: 2.5 },
                    mx: "auto",
                    mt: "clamp(135px, 35vw, 240px)",
                    position: "relative",
                    zIndex: 1,
                    borderRadius: "20px",
                    border: `1px solid ${tokens.surface.dialogBorder}`,
                    bgcolor: inputGlassBg,
                    background: inputGlassSurface,
                    boxShadow: inputGlassShadow,
                    backdropFilter: "blur(9px) saturate(112%)",
                    WebkitBackdropFilter: "blur(9px) saturate(112%)",
                    overflow: "visible",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "clamp(135px, 35vw, 240px)",
                        height: "auto",
                        zIndex: 3,
                        pointerEvents: "none",
                        userSelect: "none",
                        lineHeight: 0,
                        "& img": {
                            display: "block",
                            width: "100%",
                            height: "auto",
                        },
                    }}
                >
                    <img
                        src="/mascot/peace.avif"
                        alt="Bocchi peace sign"
                        draggable={false}
                    />
                </Box>

                <Box
                    sx={{
                        gridArea: "header",
                        width: "100%",
                        minWidth: 0,
                        mb: { xs: 0.3, sm: 0 },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: { xs: "0.84rem", sm: "0.88rem" },
                            fontWeight: 700,
                            letterSpacing: "0.01em",
                            color: tokens.text.secondary,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                            maxWidth: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        <span>
                            {burnOnRead ? "One-Time Link" : "Multi-View Link"}
                        </span>
                        <Typography
                            component="span"
                            sx={{
                                fontSize: { xs: "0.74rem", sm: "0.78rem" },
                                fontWeight: 500,
                                color: tokens.text.muted,
                                opacity: 0.85,
                            }}
                        >
                            • Expires in {formatTtlDuration(ttlSeconds)}
                        </Typography>
                    </Typography>
                </Box>

                <Box
                    sx={{
                        gridArea: "qr",
                        justifySelf: "start",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: { xs: previewQrSize, sm: 150 },
                    }}
                >
                    <Box
                        sx={{
                            position: "relative",
                            width: { xs: previewQrSize, sm: 150 },
                            height: { xs: previewQrSize, sm: 150 },
                            borderRadius: "10px",
                            overflow: "hidden",
                            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)",
                        }}
                    >
                        <PasteQrCode
                            value={link}
                            tokens={tokens}
                            size={previewQrSize}
                            paperBg={tokens.qr.paperBg}
                            borderRadius="10px"
                            showCenterLock={passwordProtected}
                        />
                    </Box>
                    {onDownloadQr && (
                        <Typography
                            component="button"
                            type="button"
                            onClick={onDownloadQr}
                            sx={{
                                appearance: "none",
                                border: 0,
                                p: 0,
                                mt: 1.1,
                                bgcolor: "transparent",
                                color: tokens.text.muted,
                                cursor: "pointer",
                                fontSize: { xs: "0.68rem", sm: "0.72rem" },
                                fontWeight: 600,
                                lineHeight: 1.3,
                                letterSpacing: 0,
                                opacity: 0.7,
                                textDecoration: "underline",
                                textUnderlineOffset: "3px",
                                textAlign: "center",
                                transition: "all 150ms ease",
                                "&:hover": {
                                    color: tokens.text.primary,
                                    opacity: 1,
                                },
                                "&:focus-visible": {
                                    outline: `2px solid ${tokens.button.primaryBg}`,
                                    outlineOffset: 3,
                                    borderRadius: "4px",
                                },
                            }}
                        >
                            Download QR
                        </Typography>
                    )}
                </Box>

                <Box
                    sx={{
                        gridArea: "link",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        boxSizing: "border-box",
                        px: { xs: 1.65, sm: 1.75 },
                        py: { xs: 0.95, sm: 1 },
                        borderRadius: "12px",
                        border: `1px solid ${tokens.surface.linkRowBorder}`,
                        bgcolor: tokens.surface.linkRowBg,
                        backdropFilter: "blur(8px) saturate(108%)",
                        WebkitBackdropFilter: "blur(8px) saturate(108%)",
                        boxShadow: tokens.surface.linkRowInsetShadow,
                        overflow: "hidden",
                    }}
                >
                    <Typography
                        component="a"
                        href={link}
                        target="_blank"
                        rel="noopener"
                        title={link}
                        onClick={handleLinkClick}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            width: "100%",
                            maxWidth: "100%",
                            gap: 0.9,
                            color: tokens.text.primary,
                            textDecoration: "none",
                            fontSize: { xs: "0.86rem", sm: "0.9rem" },
                            lineHeight: 1.35,
                            textAlign: "left",
                            overflow: "hidden",
                            "&:hover": {
                                textDecoration: "underline",
                                color: tokens.text.primary,
                            },
                            "&:focus-visible": {
                                outline: `2px solid ${tokens.button.primaryBg}`,
                                outlineOffset: 4,
                                borderRadius: "8px",
                            },
                        }}
                    >
                        <Box
                            sx={{
                                width: 20,
                                height: 20,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                alignSelf: "center",
                            }}
                        >
                            <HugeiconsIcon
                                icon={Link01Icon}
                                size={16}
                                strokeWidth={1.9}
                            />
                        </Box>
                        <Box
                            component="span"
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                                opacity: 0.78,
                            }}
                        >
                            {link}
                        </Box>
                    </Typography>
                </Box>

                <Box
                    sx={{
                        gridArea: "actions",
                        position: "relative",
                        minHeight: { xs: previewQrSize, sm: 64 },
                        mt: { xs: 0, sm: 0.65 },
                        width: "100%",
                        maxWidth: "100%",
                        display: { xs: "flex", sm: "block" },
                        alignItems: { xs: "center", sm: "stretch" },
                        justifyContent: { xs: "center", sm: "flex-start" },
                        overflow: "visible",
                        transform: { xs: "none", sm: "translateY(8px)" },
                    }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={{ xs: 1.45, sm: 3.6 }}
                        sx={{
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            zIndex: 2,
                            width: "fit-content",
                            maxWidth: "100%",
                            mx: 0,
                            transform: { xs: "none", sm: "translateY(16px)" },
                        }}
                    >
                        <Typography
                            component="button"
                            onClick={handleShareClick}
                            sx={{
                                fontFamily:
                                    '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                fontSize: { xs: "2.22rem", sm: "2rem" },
                                "@media (max-width:424.95px)": {
                                    fontSize: "2rem",
                                },
                                color: tokens.button.scriptLink,
                                background: "none",
                                border: "none",
                                p: 0,
                                m: 0,
                                lineHeight: 1,
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: "3px",
                                transform: {
                                    xs: "translateX(-28px) rotate(-3deg)",
                                    sm: "rotate(-3deg)",
                                },
                                "&:hover": {
                                    color: tokens.button.scriptLinkHover,
                                    textDecoration: "underline",
                                    textUnderlineOffset: "3px",
                                },
                                "&:focus-visible": {
                                    outline: `2px solid ${tokens.button.primaryBg}`,
                                    outlineOffset: 3,
                                    borderRadius: "6px",
                                },
                            }}
                        >
                            Share
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                minWidth: 0,
                                position: "relative",
                                transform: {
                                    xs: "translateX(34px) rotate(3deg)",
                                    sm: "rotate(3deg)",
                                },
                            }}
                        >
                            <Typography
                                component="button"
                                onClick={handleCopyClick}
                                sx={{
                                    fontFamily:
                                        '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                    fontSize: { xs: "2.22rem", sm: "2rem" },
                                    "@media (max-width:424.95px)": {
                                        fontSize: "2rem",
                                    },
                                    color: tokens.button.scriptLink,
                                    background: "none",
                                    border: "none",
                                    p: 0,
                                    m: 0,
                                    lineHeight: 1,
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    textUnderlineOffset: "3px",
                                    "&:hover": {
                                        color: tokens.button.scriptLinkHover,
                                        textDecoration: "underline",
                                        textUnderlineOffset: "3px",
                                    },
                                    "&:focus-visible": {
                                        outline: `2px solid ${tokens.button.primaryBg}`,
                                        outlineOffset: 3,
                                        borderRadius: "6px",
                                    },
                                }}
                            >
                                Copy
                            </Typography>
                            <Typography
                                variant="mini"
                                sx={{
                                    fontFamily:
                                        '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                    position: "absolute",
                                    top: "100%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    mt: 0.5,
                                    whiteSpace: "nowrap",
                                    color: tokens.text.copied,
                                    fontSize: "0.94rem",
                                    fontWeight: 600,
                                    lineHeight: 1,
                                    letterSpacing: "0.06em",
                                    opacity: showCopied ? 1 : 0,
                                    transition: "opacity 150ms ease",
                                    pointerEvents: "none",
                                }}
                            >
                                Copied to clipboard.
                            </Typography>
                        </Box>
                    </Stack>

                    {arrow && (
                        <Box
                            sx={{
                                display: "block",
                                position: "absolute",
                                left: { xs: -14, sm: 184, md: 208 },
                                top: { xs: 75, sm: -5, md: -7 },
                                width: { xs: 104, sm: 114, md: 133 },
                                height: "auto",
                                zIndex: 1,
                                opacity: 0.9,
                                pointerEvents: "none",
                                transform: {
                                    xs: "scaleY(-1) rotate(-57deg)",
                                    sm: "translateY(-2px) scaleX(-1) rotate(0deg)",
                                },
                                transformOrigin: "50% 50%",
                            }}
                        >
                            <svg
                                ref={arrowSvgRef}
                                viewBox={`0 0 ${arrow.width} ${arrow.height}`}
                                width="100%"
                                height="100%"
                                fill="none"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <g transform={arrow.transform}>
                                    {arrow.paths.map((path, idx) => (
                                        <path
                                            key={`${path.d}-${idx}`}
                                            data-arrow-path="true"
                                            data-arrow-index={idx}
                                            d={path.d}
                                            fill="none"
                                            stroke={arrowStrokeColor}
                                            strokeWidth={
                                                path.width * path.strokeScale
                                            }
                                            strokeLinecap={path.lineCap}
                                            strokeLinejoin={path.lineJoin}
                                        />
                                    ))}
                                </g>
                            </svg>
                        </Box>
                    )}
                </Box>

                {onCreateNew && (
                    <Box
                        sx={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            justifyContent: "flex-end",
                            width: "100%",
                            pt: { xs: 1.5, sm: 2 },
                        }}
                    >
                        <Button
                            variant="contained"
                            disableElevation
                            onClick={onCreateNew}
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
                            New paste
                        </Button>
                    </Box>
                )}
            </Box>

            <Dialog
                open={showViewConfirm}
                onClose={handleCloseViewConfirm}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    backdrop: {
                        sx: {
                            bgcolor: tokens.surface.dialogBackdrop,
                            backdropFilter: "blur(2px)",
                        },
                    },
                    paper: {
                        sx: {
                            mx: 2,
                            borderRadius: "20px",
                            border: "1px solid",
                            borderColor: inputGlassBorder,
                            bgcolor: inputGlassBg,
                            background: inputGlassSurface,
                            boxShadow: inputGlassShadow,
                            backdropFilter: "blur(9px) saturate(112%)",
                            WebkitBackdropFilter: "blur(9px) saturate(112%)",
                        },
                    },
                }}
            >
                <Box sx={{ p: { xs: 2.1, sm: 2.35 }, position: "relative" }}>
                    <IconButton
                        aria-label="Close confirmation dialog"
                        onClick={handleCloseViewConfirm}
                        size="small"
                        sx={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            color: tokens.text.secondary,
                        }}
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                    <Typography
                        aria-hidden="true"
                        sx={{
                            fontSize: "1.85rem",
                            lineHeight: 1,
                            textAlign: "center",
                            mb: 0.6,
                        }}
                    >
                        👀
                    </Typography>
                    <Typography
                        sx={{
                            color: tokens.text.primary,
                            fontWeight: 700,
                            fontSize: { xs: "1rem", sm: "1.06rem" },
                            lineHeight: 1.3,
                            textAlign: "center",
                        }}
                    >
                        {burnOnRead ? "Open One-Time Link?" : "Open Link?"}
                    </Typography>
                    <Typography
                        sx={{
                            mt: 1,
                            color: tokens.text.dialogBody,
                            fontSize: { xs: "0.88rem", sm: "0.91rem" },
                            lineHeight: 1.5,
                            textAlign: "center",
                        }}
                    >
                        {burnOnRead
                            ? "This link can be opened only once. Are you sure you want to open it? You could copy it instead."
                            : "This link can be accessed multiple times until it expires. Are you sure you want to open it?"}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1.1}
                        sx={{
                            justifyContent: "center",
                            mt: 2.2,
                            width: "100%",
                        }}
                    >
                        <Button
                            onClick={handleCopyFromConfirm}
                            sx={{
                                textTransform: "none",
                                fontSize: { xs: "0.88rem", sm: "0.9rem" },
                                fontWeight: 600,
                                letterSpacing: "0.01em",
                                minWidth: { xs: 122, sm: 132 },
                                py: 0.58,
                                px: 1.5,
                                borderRadius: "10px",
                                borderColor: tokens.button.ghostBorder,
                                color: tokens.button.ghostText,
                                "&:hover": {
                                    borderColor: tokens.button.ghostHoverBorder,
                                    bgcolor: tokens.button.ghostHoverBg,
                                },
                            }}
                            variant="outlined"
                        >
                            Copy link
                        </Button>
                        <Button
                            onClick={handleConfirmOpenLink}
                            sx={{
                                textTransform: "none",
                                fontSize: { xs: "0.88rem", sm: "0.9rem" },
                                fontWeight: 600,
                                letterSpacing: "0.01em",
                                minWidth: { xs: 122, sm: 132 },
                                py: 0.58,
                                px: 1.5,
                                borderRadius: "10px",
                                bgcolor: tokens.button.primaryBg,
                                color: tokens.button.primaryText,
                                boxShadow: "0 2px 8px rgba(47, 109, 247, 0.2)",
                                "&:hover": {
                                    bgcolor: tokens.button.primaryHoverBg,
                                    boxShadow:
                                        "0 3px 10px rgba(47, 109, 247, 0.24)",
                                },
                            }}
                            variant="contained"
                        >
                            Open Link
                        </Button>
                    </Stack>
                </Box>
            </Dialog>
        </Stack>
    );
};
