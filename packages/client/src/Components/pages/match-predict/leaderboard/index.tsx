"use client";

import { Box, Button, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useMatchLeaderboard } from "@scspace-client/Hooks/match";
import { useEffect, useState } from "react";
import { Card, colors, MatchShell, TeamLogo, useEventMatch } from "../shared";

export default function MatchLeaderboard() {
    const { userInfo } = useAuth();
    const { match, open, allMatches } = useEventMatch();
    const leaderboard = useMatchLeaderboard(match?.id);
    const [limit, setLimit] = useState(10);
    useEffect(() => { setLimit(10); }, [match?.id]);
    // Refresh both the actual score and its grading results together.
    useEffect(() => { if (!match?.id) return; const timer = window.setInterval(() => { allMatches.refetch(); leaderboard.refetch(); }, 10000); return () => window.clearInterval(timer); }, [match?.id]);
    const groups = leaderboard.data?.data.groups ?? [];
    const count = leaderboard.data?.data.participantCount ?? 0;
    // Tied players still share a group, but each row shows its own sequential position.
    const ranked = groups.flatMap(group => group.predictions.map((row, index) => ({ row, rank: group.positions[index] })));
    const myRank = ranked.find(({ row }) => row.userId === userInfo?.id)?.rank;
    const visible = ranked.filter(({ row, rank }) => rank <= limit || row.userId === userInfo?.id);
    const topRows = ranked.filter(({ rank }) => rank <= 3);
    const hasScore = match && [match.firstScoreA, match.firstScoreB, match.secondScoreA, match.secondScoreB].some(value => value != null);
    const hasFinalScore = match?.secondScoreA != null || match?.secondScoreB != null;
    const currentA = hasFinalScore ? match?.secondScoreA : match?.firstScoreA;
    const currentB = hasFinalScore ? match?.secondScoreB : match?.firstScoreB;
    const updated = leaderboard.dataUpdatedAt ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(leaderboard.dataUpdatedAt) : "—";
    return <MatchShell active="leaderboard" announcement={hasScore ? "Match in progress · Rankings reflect the latest graded score." : "Rankings will appear after scoring begins."}>
        <Stack maxW="1440px" mx="auto" px={{ base: 4, md: 12 }} py={{ base: 6, md: 8 }} gap={6}>
            <Card compact><Flex justify="space-between" align="center"><Text bg={colors.lime} color={colors.background} rounded="4px" px={2} py={1} fontSize="14px" fontWeight="bold">{hasScore ? "● LIVE" : open ? "● OPEN" : "● WAITING"}</Text><Text color={colors.muted} fontSize="12px">Updated {updated} KST</Text></Flex>
                <Flex gap={{ base: 2, md: 6 }} justify="center" align="center"><TeamLogo name={match?.teamA ?? "Team A"} size={{ base: "32px", md: "52px" }} /><Text fontSize={{ base: "12px", md: "22px" }} fontWeight="bold">{match?.teamA ?? "Team A"}</Text><Text color={colors.lime} fontSize={{ base: "28px", md: "40px" }} whiteSpace="nowrap" fontWeight="bold">{currentA ?? "—"} : {currentB ?? "—"}</Text><TeamLogo name={match?.teamB ?? "Team B"} size={{ base: "32px", md: "52px" }} /><Text fontSize={{ base: "12px", md: "22px" }} fontWeight="bold">{match?.teamB ?? "Team B"}</Text></Flex>
            </Card>
            <Stack gap={2}><Text color={colors.lime} fontSize="12px" fontWeight="bold">LIVE LEADERBOARD</Text><Text as="h1" fontSize={{ base: "28px", md: "40px" }} lineHeight={{ base: "40px", md: "56px" }} fontWeight="black">Live Leaderboard</Text><Text color={colors.muted} fontSize="14px">What if the match ended now? These provisional rankings reflect the latest graded score.</Text></Stack>
            <Card highlight compact><Text color={colors.lime} fontSize="14px" fontWeight="bold">My Current Rank</Text><Flex gap={6} align="center"><Text fontSize="48px" lineHeight="56px" fontWeight="black" fontStyle="italic" fontFamily="var(--match-number-font), sans-serif">{myRank ?? "—"}</Text><Text color={colors.muted} fontSize="14px">/ {count} players</Text><Text display={{ base: "none", md: "block" }} ml="auto" fontWeight="bold">{userInfo?.nameKr || userInfo?.nameEn}</Text></Flex></Card>
            {!!topRows.length && <Grid display={{ base: "none", md: "grid" }} templateColumns="repeat(3, minmax(0, 1fr))" gap={5}>{topRows.map(({ row, rank }) => <Card key={row.id} highlight={rank === 1}><Flex gap={3} align="center"><Text fontSize="48px" lineHeight="56px" fontWeight="black" fontStyle="italic" fontFamily="var(--match-number-font), sans-serif" color={colors.lime}>{rank}</Text><Text color={colors.muted} fontSize="14px">Current rank</Text></Flex><Text fontSize="22px" fontWeight="bold">{row.userName}</Text><Text color={colors.muted} fontSize="14px">Prediction {row.secondScoreA} : {row.secondScoreB}</Text></Card>)}</Grid>}
            <Flex justify="space-between" gap={2} fontSize="12px"><Text fontSize="16px" fontWeight="bold">All Rankings <Box as="span" color={colors.muted} fontSize="12px">{count} players</Box></Text><Text color={colors.muted}>Prediction: first · final</Text></Flex>
            {(allMatches.isError || leaderboard.isError) && <Text role="alert">Unable to load rankings. <Button color={colors.lime} variant="plain" onClick={() => { allMatches.refetch(); leaderboard.refetch(); }}>Retry</Button></Text>}
            {!allMatches.isError && !leaderboard.isError && !groups.length && <Text role="status" color={colors.muted}>{allMatches.isPending || (match && leaderboard.isPending) ? "Loading rankings…" : !match ? "No match available." : "Rankings will appear after the administrator grades predictions."}</Text>}
            <Stack gap={2}>{visible.map(({ row, rank }) => {
                const me = row.userId === userInfo?.id;
                return <Flex key={row.id} bg={colors.surface} border={me || rank <= 3 ? "1px solid" : "1px solid transparent"} borderColor={me || rank <= 3 ? colors.lime : "transparent"} rounded="8px" p={4} gap={{ base: 2, md: 3 }} align="center" minH="64px">
                    <Text w={{ base: "40px", md: "72px" }} flexShrink={0} fontWeight="bold" color={me || rank <= 3 ? colors.lime : colors.muted} fontSize={{ base: "14px", md: "16px" }} textAlign="center">{rank}</Text>
                    <Flex flex={1} minW={0} align="center" gap={2}><Text truncate fontWeight="bold">{row.userName}</Text>{me && <Text bg={colors.lime} color={colors.background} px={2} py={1} rounded="4px" fontSize="12px" fontWeight="bold">ME</Text>}</Flex>
                    <Grid templateColumns="1fr 1fr" gap={{ base: 2, md: 6 }} w={{ base: "112px", md: "408px" }} flexShrink={0} fontSize={{ base: "20px", md: "24px" }} fontWeight="bold" textAlign="center"><Text>{row.firstScoreA} : {row.firstScoreB}</Text><Text>{row.secondScoreA} : {row.secondScoreB}</Text></Grid>
                </Flex>;
            })}</Stack>
            {ranked.some(({ rank }) => rank > limit) && <Button w={{ base: "full", md: "340px" }} bg={colors.surface} border="1px solid" borderColor={colors.border} color={colors.text} h="48px" onClick={() => setLimit(value => value + 10)}>See More Rankings ↓</Button>}
            <Stack color={colors.muted} fontSize="12px" gap={1}><Text>Rankings may change as actual scores are entered and predictions are graded.</Text><Text>Ranked by exact final score, exact first-half score, match outcome, goal-difference error, then total score error. Tied players are listed by name.</Text></Stack>
        </Stack>
    </MatchShell>;
}
