import { Box } from "@mui/material";
import React from "react";

interface PeekingMascotProps {
    passwordProtected?: boolean;
}

export const PeekingMascot: React.FC<PeekingMascotProps> = ({
    passwordProtected = false,
}) => {
    return (
        <Box
            sx={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                transform: "translate(-50%, calc(18.5% + 6px))",
                width: { xs: 200, sm: 260 },
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
                src={
                    passwordProtected
                        ? "/mascot/closed.avif"
                        : "/mascot/opened.avif"
                }
                alt="Peeking Bocchi"
                draggable={false}
            />
        </Box>
    );
};
