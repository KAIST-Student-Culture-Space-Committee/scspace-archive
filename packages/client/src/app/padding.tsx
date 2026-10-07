"use client";

import { Box } from "@chakra-ui/react";
import { usePathname } from "next/navigation";

export default function LayoutBox({ children }: {
    children?: React.ReactNode
}) {
    const pathname = usePathname();

    return (
        <Box
            flexGrow={1}
            scrollbar="hidden"
            overflowY="hidden"
            scrollBehavior="smooth"
            bg={pathname.startsWith("/match-predict") ? "black" : "bg.subtle"}
            px={pathname === "/" || pathname.startsWith("/match-predict") ? 0 : 4}
            py={pathname === "/" || pathname.startsWith("/match-predict") ? 0 : 6}
        >
            {children}
        </Box>
    );
}