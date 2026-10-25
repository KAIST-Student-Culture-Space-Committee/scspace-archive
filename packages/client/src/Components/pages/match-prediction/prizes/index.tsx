"use client";

import { Box, Button, Flex, Grid, Image, Stack, Text } from "@chakra-ui/react";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { matchImageUrl } from "@scspace-client/Hooks/match";
import { useMatchPrizes } from "@scspace-client/Hooks/match-event";
import { assets, Card, colors, MatchShell } from "../shared";

const placeSuffix = ["", "st", "nd", "rd"];
const winnerCounts: Record<number, number> = { 1: 1, 2: 2, 3: 4 };
const winners = (place: number) => { const count = winnerCounts[place] ?? 1; return `${count} winner${count > 1 ? "s" : ""}`; };
export default function MatchPrizes() {
    const { linkPush } = useLinkPush();
    const prizes = useMatchPrizes().data?.data ?? [];
    return <MatchShell active="prizes">
        <Stack maxW="1440px" mx="auto" px={{ base: 4, md: 12 }} py={{ base: 6, md: 8 }} gap={6}>
            <Stack gap={2}><Text color={colors.lime} fontSize="15px" fontWeight="bold">이벤트 상품</Text><Text as="h1" fontSize={{ base: "28px", md: "40px" }} lineHeight={{ base: "40px", md: "56px" }} fontWeight="black">Event Prizes</Text></Stack>
            <Grid templateColumns={{ base: "1fr", lg: "1.23fr 1fr 1fr" }} gap={5}>
                {prizes.map((prize, index) => { const place = `${prize.place}${placeSuffix[prize.place] ?? "th"}`; return <Card key={prize.place} highlight={index === 0}>
                    <Flex justify="space-between" align="center"><Text fontSize="28px" fontWeight="black" color={index === 0 ? colors.lime : colors.text}>{place} Place</Text><Text bg={colors.background} rounded="4px" px={2} py={1} fontWeight="bold" fontSize="14px" color={colors.muted}>{winners(prize.place)}</Text></Flex>
                    <Stack aspectRatio={{ base: "306 / 260", lg: index === 0 ? "446 / 296" : "354 / 296" }} bg={colors.background} border="1px solid" borderColor={colors.border} rounded="8px" align="center" justify="center" gap={4}>{prize.image ? <Image src={matchImageUrl(prize.image)} alt={prize.nameEn} w="full" h="full" objectFit="contain" /> : <><Image src={`${assets}/prize-placeholder.svg`} alt="" /><Text color={colors.muted} fontSize="14px">Prize Image</Text></>}</Stack>
                    <Stack gap={2}><Text as="h2" fontSize="22px" lineHeight="32px" fontWeight="bold">{prize.name}</Text><Text color={colors.muted} fontSize="14px">{prize.nameEn}</Text></Stack><Text fontSize="12px" fontWeight="bold" color={colors.lime}>{place.toUpperCase()} PLACE REWARD</Text>
                </Card>; })}
            </Grid>
            <Card><Text as="h2" fontWeight="bold">Prize Claiming / 상품 수령</Text><Text color={colors.muted} fontSize="14px">Prizes are awarded based on the final rankings of the leaderboard.<br />Collection details will be sent to your registered phone number.<br /><br />상품은 리더보드의 최종 순위로 결정됩니다.<br />제출하신 전화번호로 상품 수령 메시지를 발송할 예정입니다.</Text></Card>
            <Button alignSelf="start" w={{ base: "full", md: "340px" }} h="56px" bg={colors.lime} color={colors.background} fontWeight="bold" onClick={() => linkPush("/match-prediction/leaderboard")}>View Live Rankings →</Button>
        </Stack>
    </MatchShell>;
}
