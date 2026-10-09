"use client";

import { Box, Button, Flex, Grid, Image, Stack, Text } from "@chakra-ui/react";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { useMatchAPI } from "@scspace-client/Hooks/match";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getMatchNow } from "./match-time";

export const assets = "/img/match-prediction/final";
export const colors = { background: "#090c10", surface: "#151b22", text: "#f5f7fa", muted: "#9ca6b2", lime: "#dcff00", border: "#303842" };
const tabs = [ ["Event Info", "main"], ["Leaderboard", "leaderboard"], ["Prizes", "prizes"], ["My Prediction", "input"] ];

export function MatchHeader({ active }: { active: string }) {
    const { userInfo, isLogined } = useAuth();
    const { linkPush } = useLinkPush();
    return <Flex as="header" px={{ base: 4, lg: 7 }} py={{ base: 0, lg: 3 }} columnGap={6} rowGap={0} align="center" justify="space-between" wrap="wrap" bg={colors.background}>
        <Text display="flex" gap="4px" alignItems="center" flex={{ base: 1, lg: "1 1 193px" }} h={{ base: "64px", lg: "52px" }} fontSize={{ base: "22px", lg: "28px" }} fontWeight="black" fontStyle="italic" fontFamily="var(--match-number-font), sans-serif">SCSPACE<Box as="span" color={colors.lime}>PLAY</Box></Text>
        <Grid templateColumns="repeat(4, 1fr)" gap={{ base: 0, lg: 4 }} order={{ base: 3, lg: 0 }} w={{ base: "calc(100% + 32px)", lg: "560px" }} mx={{ base: -4, lg: 0 }} flexShrink={0}>
            {tabs.map(([label, route]) => <Button key={route} variant="plain" rounded={0} h={{ base: "46px", lg: "52px" }} px={0} fontSize={{ base: "12px", lg: "16px" }} fontWeight="bold" color={active === route ? colors.lime : colors.muted} borderBottom={active === route ? `2px solid ${colors.lime}` : "2px solid transparent"} aria-current={active === route ? "page" : undefined} onClick={() => linkPush(`/match-prediction/${route}`)}>{label}</Button>)}
        </Grid>
        <Flex flex={{ base: "0 1 auto", lg: "1 1 193px" }} justify="end" maxW={{ base: "44%", lg: "none" }}>
            {isLogined ? <Text truncate rounded="full" bg={colors.surface} px={3} py={2} fontSize="14px">{userInfo?.nameKr || userInfo?.nameEn}</Text>
                : <Button variant="plain" color={colors.text} onClick={() => { sessionStorage.setItem("loginRedirect", `/match-prediction/${active}`); linkPush("/login"); }}>Log in</Button>}
        </Flex>
    </Flex>;
}

export function Announcement({ children }: { children: ReactNode }) {
    return <Flex bg={colors.lime} color={colors.background} py={2} px={4} gap={3} justify="center" align="center">
        <Image src={`${assets}/megaphone.svg`} alt="" flexShrink={0} /><Text fontSize={{ base: "12px", md: "17px" }} fontWeight="bold" textAlign="center" overflowWrap="anywhere">{children}</Text>
    </Flex>;
}

export function MatchFooter() {
    return <Box maxW="1440px" mx="auto" w="full">
        <Stack bg={colors.background} px={{ base: 4, md: 12 }} pt={6} pb={4} gap={3}><Text color={colors.muted} fontSize="14px" letterSpacing="1.5px">AD ZONE</Text>
            <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={{ base: 3, md: 4 }}>{Array.from({ length: 8 }, (_, index) => <Box key={index} bg="white" aspectRatio={{ base: "173 / 64", md: "324 / 72" }} />)}</Grid>
        </Stack>
        <Flex as="footer" px={{ base: 4, md: 12 }} py={6} gap={5} rowGap={2} wrap="wrap" fontSize="11px" color={colors.muted}>
            <Text display="flex" gap="4px" color={colors.text} fontStyle="italic" fontFamily="var(--match-number-font), sans-serif" fontWeight="black">SCSPACE<Box as="span" color={colors.lime}>PLAY</Box></Text><Text>Student Cultural Space Committee</Text>
            <Text flex={{ base: "1 0 100%", md: 1 }} textAlign={{ base: "left", md: "right" }}>SCSPACE</Text>
        </Flex>
    </Box>;
}

export function MatchShell({ active, announcement, children, event = false }: { active: string; announcement: ReactNode; children: ReactNode; event?: boolean }) {
    return <Scroll><Box bg={colors.background} color={colors.text} minH="100dvh"><MatchHeader active={active} /><Announcement>{announcement}</Announcement>
        <Box backgroundImage={event ? { base: `url('${assets}/event-stadium-mobile.png')`, md: `url('${assets}/event-stadium.png')` } : `linear-gradient(to bottom, rgba(9,12,16,.2), rgba(9,12,16,.76) 65%, #090c10), url('${assets}/stadium.png')`} backgroundSize={event ? "cover" : "100% 1050px, auto 1050px"} backgroundRepeat="no-repeat" backgroundPosition="top center">
            {children}<MatchFooter />
        </Box>
    </Box></Scroll>;
}

export function TeamLogo({ name, size = "52px" }: { name: string; size?: string | { base: string; md: string } }) {
    const normalized = name.toLowerCase().replace(/\s/g, "");
    const file = normalized.includes("barcelona") || normalized.includes("바르셀로나") ? "barcelona.png" : normalized.includes("realmadrid") || normalized.includes("레알마드리드") ? "real-madrid.png" : null;
    return file ? <Image src={`${assets}/${file}`} alt={name} boxSize={size} objectFit="contain" flexShrink={0} /> : null;
}

export function useEventMatch() {
    const { allMatches } = useMatchAPI();
    const [now, setNow] = useState(getMatchNow);
    const [wallNow, setWallNow] = useState<number | null>(null);
    useEffect(() => { const update = () => { setNow(getMatchNow()); setWallNow(Date.now()); }; update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, []);
    const match = allMatches.data?.data.find((item) => item.allowSubmission && item.startTime != null && now < item.startTime) ?? allMatches.data?.data[0];
    const closed = match?.startTime != null && now >= match.startTime;
    const open = !!match?.allowSubmission && match.startTime != null && !closed;
    return { match, closed, open, allMatches, wallNow };
}

// Decode legacy calendar time before computing durations; legacy values are not elapsed minutes.
export function kickoffTimestamp(time: number) {
    const { year, month, date, hour, minute } = dateUtils().getDateUnit(time);
    return Date.UTC(year, month, date, hour - 9, minute);
}

export function countdown(time: number | null | undefined, now: number | null) {
    if (time == null || now == null) return "—";
    const seconds = Math.max(0, Math.floor((kickoffTimestamp(time) - now) / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, "0")).join(":");
}

export function Card({ children, highlight = false, compact = false }: { children: ReactNode; highlight?: boolean; compact?: boolean }) {
    return <Stack bg={colors.surface} border="1px solid" borderColor={highlight ? colors.lime : colors.border} rounded="8px" p={{ base: 5, md: compact ? 5 : 6 }} gap={4}>{children}</Stack>;
}
