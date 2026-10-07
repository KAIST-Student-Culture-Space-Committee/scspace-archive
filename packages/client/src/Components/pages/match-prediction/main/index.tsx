"use client";

import { Box, Button, Flex, Grid, Image, Stack, Text } from "@chakra-ui/react";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { assets, Card, colors, countdown, kickoffTimestamp, MatchShell, TeamLogo, useEventMatch } from "../shared";

export default function MatchPredictionMainPage() {
    const { isLogined } = useAuth();
    const { linkPush } = useLinkPush();
    const { match, closed, open, allMatches, wallNow } = useEventMatch();
    const timeLabel = match?.startTime == null ? "Kickoff time not set" : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", weekday: "short" }).format(kickoffTimestamp(match.startTime));
    const hourLabel = match?.startTime == null ? "" : dateUtils().getString(match.startTime).slice(11);
    function enter() {
        if (!isLogined) { sessionStorage.setItem("loginRedirect", "/match-prediction/input"); linkPush("/login"); }
        else linkPush("/match-prediction/input");
    }
    return <MatchShell active="main" event announcement={closed ? "GOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOD LUCK!" : "Make your prediction before kickoff."}>
        <Stack maxW="1440px" mx="auto" px={{ base: 4, md: 12 }} pt={7} pb={0} gap={6}>
            <Stack align="center" gap={3}>
                <Text color={colors.lime} fontWeight="bold" fontSize={{ base: "10px", md: "14px" }} letterSpacing={{ base: "3px", md: "6px" }}>SCORE PREDICTION</Text>
                <Text as="h1" fontSize={{ base: "32px", md: "60px" }} lineHeight={{ base: "44px", md: "80px" }} fontWeight="black" textAlign="center">Today&apos;s match,<Box as="span" display={{ base: "block", md: "inline" }} color={colors.lime}> what&apos;s your call?</Box></Text>
                <Flex align="center" justify="center" gap={{ base: 3, md: 9 }} w="full" maxW="744px">
                    <Stack flex={1} maxW={{ base: "100px", md: "180px" }} align="center" gap={0}><TeamLogo name={match?.teamA ?? "Team A"} size={{ base: "100px", md: "160px" }} /><Text fontSize={{ base: "14px", md: "22px" }} fontWeight="bold" textAlign="center">{match?.teamA ?? "Team A"}</Text></Stack>
                    <Stack flex={1} maxW="260px" align="center" gap={0}><Text fontSize={{ base: "56px", md: "104px" }} lineHeight={{ base: "72px", md: "124px" }} fontWeight="black" fontStyle="italic" fontFamily="var(--match-number-font), sans-serif">VS</Text><Text fontSize={{ base: "12px", md: "23px" }} textAlign="center" fontWeight="semibold">{timeLabel}<Box as="span" display={{ base: "block", md: "inline" }}> {hourLabel} KST</Box></Text></Stack>
                    <Stack flex={1} maxW={{ base: "100px", md: "180px" }} align="center" gap={0}><TeamLogo name={match?.teamB ?? "Team B"} size={{ base: "100px", md: "160px" }} /><Text fontSize={{ base: "14px", md: "22px" }} fontWeight="bold" textAlign="center">{match?.teamB ?? "Team B"}</Text></Stack>
                </Flex>
            </Stack>
            {allMatches.isError && <Text role="alert">Unable to load the match. <Button variant="plain" color={colors.lime} onClick={() => allMatches.refetch()}>Retry</Button></Text>}
            <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) minmax(340px, 476px)" }} gap={{ base: 4, md: 5 }}>
                <Stack gap={3} order={{ base: 2, lg: 1 }}>
                    <Card><Text as="h2" fontSize="25px" fontWeight="black">Event Info</Text><Text fontSize="18px">Predict the score and get <Box as="span" color={colors.lime}>gift.</Box></Text>
                        <Flex direction={{ base: "column", md: "row" }} bg={colors.background} rounded="8px" p="18px" gap={4}>
                            {[["Predict", "Enter the first-half and final scores for each team."], ["Submit", "Submit your prediction to enter the event."], ["Results", "Check the results after the match."]].map(([title, description], index) => <Flex key={title} flex={1} gap={3} align="start"><Text bg={colors.text} color={colors.background} rounded="full" minW="35px" textAlign="center" fontWeight="bold" fontSize="19px">0{index + 1}</Text><Stack gap={2}><Text fontWeight="bold">{title}</Text><Text color={colors.muted} fontSize="14px">{description}</Text></Stack></Flex>)}
                        </Flex>
                    </Card>
                    <Card><Flex gap={2} align="center"><Image src={`${assets}/warning.svg`} alt="" /><Text as="h2" fontSize="21px" fontWeight="bold">Please Note</Text></Flex><Text color={colors.muted}>• Edit your prediction before kickoff.<br />• Predict the first-half and final scores at the end of regulation time.</Text></Card>
                </Stack>
                <Box order={{ base: 1, lg: 2 }} bg={colors.surface} border="1px solid" borderColor={colors.lime} rounded="8px" p={{ base: 5, md: "26px" }}>
                    <Stack gap={4}><Flex align="center" gap={2} alignSelf="start" bg={colors.lime} color={colors.background} rounded="6px" px={3} py="5px"><Image src={`${assets}/status-dot.svg`} alt="" /><Text fontSize="14px" fontWeight="bold">{open ? "OPEN" : "CLOSED"}</Text></Flex>
                        <Text as="h2" fontSize={{ base: "28px", md: "32px" }} lineHeight="44px" fontWeight="black">{closed ? "Check Your Prediction" : "Make Your Prediction"}</Text>
                        <Flex gap={2} align="center" color="#ff7a1a"><Image src={`${assets}/event-clock.svg`} alt="" /><Text fontSize={{ base: "14px", md: "18px" }} fontWeight="bold">Time {closed ? "" : "Left"}</Text><Text fontSize={{ base: "32px", md: "40px" }} fontWeight="bold" fontFamily="var(--match-number-font), sans-serif" suppressHydrationWarning>{closed ? "OVER" : countdown(match?.startTime, wallNow)}</Text></Flex>
                        <Box h="1px" bg={colors.border} /><Text color={colors.muted}>{closed ? "GOOD LUCK!" : !match ? "No match available." : !open ? "Submissions are not open." : "Predict each team's first half & final score."}</Text>
                        <Button minH="70px" h="auto" px={3} whiteSpace="normal" bg={colors.lime} color={colors.background} fontSize={{ base: "20px", md: "23px" }} fontWeight="black" disabled={!match || allMatches.isError || (!open && !closed)} onClick={enter}>{closed ? "Check my Prediction" : "Make a Prediction"}<Image src={`${assets}/chevron.svg`} alt="" /></Button>
                        <Text fontSize="14px" color={colors.muted} textAlign="center">{closed ? "It is not editable now" : "Editable until the match starts."}</Text>
                    </Stack>
                </Box>
            </Grid>
        </Stack>
    </MatchShell>;
}
