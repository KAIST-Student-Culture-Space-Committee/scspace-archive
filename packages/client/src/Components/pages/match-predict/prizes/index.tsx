"use client";

import { Box, Button, Flex, Grid, Image, Stack, Text } from "@chakra-ui/react";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { assets, Card, colors, MatchShell } from "../shared";

const prizes = [
    { place: "1st", title: "Premium Wireless Headphones", description: "Your sound. Total immersion." },
    { place: "2nd", title: "Portable Bluetooth Speaker", description: "Rich sound, wherever you go." },
    { place: "3rd", title: "Wireless Gaming Mouse", description: "Light and fast. Ready for your next win." },
];
export default function MatchPrizes() {
    const { linkPush } = useLinkPush();
    return <MatchShell active="prizes" announcement="Make Your Prediction Count.">
        <Stack maxW="1440px" mx="auto" px={{ base: 4, md: 12 }} py={{ base: 6, md: 8 }} gap={6}>
            <Stack gap={2}><Text color={colors.lime} fontSize="12px" fontWeight="bold">EVENT REWARDS</Text><Text as="h1" fontSize={{ base: "28px", md: "40px" }} lineHeight={{ base: "40px", md: "56px" }} fontWeight="black">Prizes</Text><Text color={colors.muted} fontSize="14px">Turn your prediction into a reward. Explore prizes for the final rankings.</Text></Stack>
            <Grid templateColumns={{ base: "1fr", lg: "1.23fr 1fr 1fr" }} gap={5}>
                {prizes.map((prize, index) => <Card key={prize.place} highlight={index === 0}>
                    <Flex justify="space-between" align="center"><Text fontSize="28px" fontWeight="black" color={index === 0 ? colors.lime : colors.text}>{prize.place} Place</Text><Text bg={colors.background} rounded="4px" px={2} py={1} fontWeight="bold" fontSize="14px" color={colors.muted}>1 winner</Text></Flex>
                    <Stack aspectRatio={{ base: "306 / 260", lg: index === 0 ? "446 / 296" : "354 / 296" }} bg={colors.background} border="1px solid" borderColor={colors.border} rounded="8px" align="center" justify="center" gap={4}><Image src={`${assets}/prize-placeholder.svg`} alt="" /><Text color={colors.muted} fontSize="14px">Prize Image</Text></Stack>
                    <Stack gap={2}><Text as="h2" fontSize="22px" lineHeight="32px" fontWeight="bold">{prize.title}</Text><Text color={colors.muted} fontSize="14px">{prize.description}</Text></Stack><Text fontSize="12px" fontWeight="bold" color={colors.lime}>{prize.place.toUpperCase()} PLACE REWARD</Text>
                </Card>)}
            </Grid>
            <Stack gap={4}><Text as="h2" fontSize="16px" fontWeight="bold">More Prizes to Share</Text><Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
                {[["4th–10th · 7 winners", "Fried Chicken Voucher", "Share the taste of victory."], ["11th–30th · 20 winners", "Digital Coffee Voucher", "A cup to brighten your day."]].map(([rank, title, description]) => <Flex key={title} bg={colors.surface} border="1px solid" borderColor={colors.border} rounded="8px" p={4} gap={4} align="center" minH="130px"><Flex bg={colors.background} border="1px solid" borderColor={colors.border} rounded="6px" w="104px" h="94px" flexShrink={0} align="center" justify="center"><Text color={colors.muted} fontSize="12px">Prize Image</Text></Flex><Stack gap={2}><Text fontWeight="bold" fontSize="14px" color={colors.lime}>{rank}</Text><Text fontWeight="bold">{title}</Text><Text fontSize="12px" color={colors.muted}>{description}</Text></Stack></Flex>)}
            </Grid></Stack>
            <Card><Text as="h2" fontWeight="bold">Claiming Your Prize</Text><Text color={colors.muted} fontSize="14px">Prizes are awarded based on the final rankings.<br />Winners and collection details will be announced after the event.</Text></Card>
            <Button alignSelf="start" w={{ base: "full", md: "340px" }} h="56px" bg={colors.lime} color={colors.background} fontWeight="bold" onClick={() => linkPush("/match-predict/leaderboard")}>View Live Rankings →</Button>
        </Stack>
    </MatchShell>;
}
