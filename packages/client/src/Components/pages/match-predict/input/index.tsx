"use client";

import { Flex, Box, Text, Input, Button, Image } from "@chakra-ui/react";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { useMatchAPI, useMatchPredictionAPI } from "@scspace-client/Hooks/match";
import { useEffect, useState } from "react";

const titleStyle = {
    w: "190px",
    h: "60px",
    backgroundImage: "url('/img/match-predict/title.png')",
    backgroundColor: "#292E38",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundBlendMode: "lighten",
};

function TopBanners() {
    return (
        <Flex direction="column" gap="3px" w="100%" maxW="440px">
            {Array.from({ length: 4 }).map((_, i) => (
                <Box
                    key={i}
                    w="100%"
                    h="60px"
                    backgroundImage="url('/img/match-predict/top-banner.png')"
                    backgroundSize="cover"
                    backgroundPosition="center"
                    backgroundRepeat="no-repeat"
                />
            ))}
        </Flex>
    );
}

function BottomBanners() {
    return (
        <Flex direction="column" gap="3px" w="100%" maxW="440px">
            {Array.from({ length: 4 }).map((_, i) => (
                <Box
                    key={i}
                    w="100%"
                    h="65px"
                    backgroundImage="url('/img/match-predict/bottom-banner.png')"
                    backgroundSize="cover"
                    backgroundPosition="center"
                    backgroundRepeat="no-repeat"
                />
            ))}
        </Flex>
    );
}

const scoreTextStyle = {
    color: "rgba(255,255,255,0.81)" as const,
    WebkitTextStroke: "1px rgba(9,12,32,1)",
};

function ScoreBox({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <Flex
            w="72px"
            h="72px"
            justify="center"
            align="center"
            bg="transparent"
            border="1px solid white"
            flexShrink={0}
        >
            <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || (/^\d{1,2}$/.test(v) && Number(v) <= 99)) onChange(v);
                }}
                w="full"
                h="full"
                p="0"
                bg="transparent"
                border="none"
                boxShadow="none"
                outline="none"
                _focus={{ boxShadow: "none", border: "none" }}
                fontSize="28px"
                fontWeight="700"
                textAlign="center"
                style={scoreTextStyle}
            />
        </Flex>
    );
}

function ScoreSection({
    label,
    valueA,
    valueB,
    onChangeA,
    onChangeB,
}: {
    label: string;
    valueA: string;
    valueB: string;
    onChangeA: (v: string) => void;
    onChangeB: (v: string) => void;
}) {
    return (
        <Flex direction="column" gap="8px" alignSelf="stretch">
            <Text
                color="rgba(255,255,255,0.62)"
                fontSize="16px"
                fontWeight="400"
                textAlign="center"
                style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
            >
                {label}
            </Text>
            <Flex align="center" alignSelf="stretch">
                <ScoreBox value={valueA} onChange={onChangeA} />
                <Flex flex="1" justify="center" align="center">
                    <Text fontSize="28px" fontWeight="700" style={scoreTextStyle}>:</Text>
                </Flex>
                <ScoreBox value={valueB} onChange={onChangeB} />
            </Flex>
        </Flex>
    );
}

export default function MatchPredictInputPage() {
    const { isLogined, isLoading, userInfo } = useAuth();
    const { linkPush } = useLinkPush();
    const { allMatches, createPrediction, isCreating } = useMatchAPI();
    const { myPredictions } = useMatchPredictionAPI(userInfo?.id);

    const [firstA, setFirstA] = useState("");
    const [firstB, setFirstB] = useState("");
    const [secondA, setSecondA] = useState("");
    const [secondB, setSecondB] = useState("");

    useEffect(() => {
        if (isLoading) return;
        if (!isLogined) {
            sessionStorage.setItem("loginRedirect", "/match-predict/input");
            linkPush("/login");
        }
    }, [isLogined, isLoading, linkPush]);

    const activeMatch = allMatches.data?.data?.find((match) => match.allowSubmission) ?? allMatches.data?.data?.find((match) => (
        match.firstScoreA === null &&
        match.firstScoreB === null &&
        match.secondScoreA === null &&
        match.secondScoreB === null &&
        new Date(match.matchTime).getTime() > Date.now()
    )) ?? allMatches.data?.data?.[0];
    const matchId = activeMatch?.id;
    const existingPrediction = myPredictions.data?.data?.find(
        (p) => p.prediction.matchId === matchId
    );
    const hasSubmitted = !!existingPrediction;

    useEffect(() => {
        if (!existingPrediction) return;
        setFirstA(String(existingPrediction.prediction.firstScoreA));
        setFirstB(String(existingPrediction.prediction.firstScoreB));
        setSecondA(String(existingPrediction.prediction.secondScoreA));
        setSecondB(String(existingPrediction.prediction.secondScoreB));
    }, [existingPrediction]);

    if (!isLogined || !userInfo) return null;

    const scores = {
        firstScoreA: Number(firstA),
        firstScoreB: Number(firstB),
        secondScoreA: Number(secondA),
        secondScoreB: Number(secondB),
    };

    function validate() {
        if (!activeMatch?.allowSubmission) {
            alert("현재 이 경기의 예측 제출을 받지 않습니다.");
            return false;
        }
        if ([firstA, firstB, secondA, secondB].some((v) => v === "")) {
            alert("모든 점수를 입력해주세요.");
            return false;
        }
        const values = [firstA, firstB, secondA, secondB].map(Number);
        if (values.some((v) => isNaN(v) || v < 0 || v > 99)) {
            alert("점수는 0~99 사이의 숫자여야 합니다.");
            return false;
        }
        return true;
    }

    function handleSubmit() {
        if (!matchId) {
            alert("예측 가능한 경기가 없습니다.");
            return;
        }
        if (!validate()) return;

        createPrediction(
            { matchId, ...scores },
            {
                onSuccess: () => {
                    alert("예측이 제출되었습니다!");
                    linkPush("/match-predict/main");
                },
                onError: (e) => alert(e.message),
            }
        );
    }

    function handleUpdate() {
        if (!matchId) {
            alert("예측 가능한 경기가 없습니다.");
            return;
        }
        if (!validate()) return;

        createPrediction(
            { matchId, ...scores },
            {
                onSuccess: () => {
                    linkPush("/match-predict/main");
                },
                onError: (e) => alert(e.message),
            }
        );
    }

    return (
        <Scroll>
            <Flex direction="column" align="center" bg="#09090E" minH="100vh">
                <Flex w="100%" maxW="440px" h="60px" justify="center" align="center" bg="#292E38">
                    <Box {...titleStyle} />
                </Flex>

                <TopBanners />

                <Flex w="100%" maxW="440px" mx="auto" px="12px" py="20px">
                    <Flex
                        flex="1"
                        direction="column"
                        align="center"
                        gap="32px"
                        bg="#08080C"
                        borderRadius="10px"
                        px="24px"
                        py="20px"
                        style={{
                            boxShadow: "0 0 30px rgba(1,39,143,1), 0 0 50px rgba(1,39,143,0.6), 0 0 70px rgba(1,39,143,0.3)",
                        }}
                    >
                        <Flex justify="space-between" align="flex-end" alignSelf="stretch">
                            <Flex direction="column" align="center" gap="5px">
                                <Image src="/img/match-predict/psg.png" alt="PSG" w="72px" h="72px" objectFit="cover" borderRadius="full" />
                                <Text color="white" fontSize="18px" fontWeight="800">PSG</Text>
                            </Flex>
                            <Text
                                color="white"
                                fontSize="28px"
                                fontWeight="800"
                                pb="28px"
                                style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
                            >
                                VS
                            </Text>
                            <Flex direction="column" align="center" gap="5px" w="72px">
                                <Image src="/img/match-predict/arsenal.png" alt="Arsenal" w="72px" h="72px" objectFit="contain" />
                                <Text color="white" fontSize="18px" fontWeight="800">Arsenal</Text>
                            </Flex>
                        </Flex>

                        <ScoreSection label="전반전 점수" valueA={firstA} valueB={firstB} onChangeA={setFirstA} onChangeB={setFirstB} />
                        <ScoreSection label="후반전 점수" valueA={secondA} valueB={secondB} onChangeA={setSecondA} onChangeB={setSecondB} />

                        <Button
                            alignSelf="stretch"
                            color="white"
                            fontSize="16px"
                            fontWeight="400"
                            bg="#0F0F0F"
                            border="1px solid rgba(47,47,47,1)"
                            borderRadius="md"
                            minH="47px"
                            h="auto"
                            _hover={{ bg: "rgba(255,255,255,0.08)" }}
                            _active={{ bg: "rgba(255,255,255,0.05)" }}
                            onClick={hasSubmitted ? handleUpdate : handleSubmit}
                            disabled={!activeMatch?.allowSubmission || allMatches.isError}
                            loading={allMatches.isLoading || myPredictions.isLoading || isCreating}
                            style={{ boxShadow: "0 0 10px rgba(255,255,255,0.4), 0 0 15px rgba(255,255,255,0.2)" }}
                        >
                            {!activeMatch?.allowSubmission ? "현재 제출을 받지 않습니다" : hasSubmitted ? "수정하기" : "Submit"}
                        </Button>
                    </Flex>
                </Flex>

                <BottomBanners />
            </Flex>
        </Scroll>
    );
}
