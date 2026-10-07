"use client";

import { Flex, Box, Text, Button, Image } from "@chakra-ui/react";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { useMatchAPI, useMatchPredictionAPI } from "@scspace-client/Hooks/match";

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

function MatchHeader() {
    return (
        <Flex px="12px" justify="center" alignSelf="stretch">
            <Flex justify="center" align="center" gap="28px" flex="1">
                <Flex align="center" gap="6px">
                    <Image src="/img/match-predict/psg.png" alt="PSG" w="48px" h="48px" objectFit="contain" />
                    <Text color="white" fontSize="18px" fontWeight="800">PSG</Text>
                </Flex>
                <Text color="white" fontSize="28px" fontWeight="800">VS</Text>
                <Flex align="center" gap="6px">
                    <Text color="white" fontSize="18px" fontWeight="800">Arsenal</Text>
                    <Image src="/img/match-predict/arsenal.png" alt="Arsenal" w="48px" h="48px" objectFit="contain" />
                </Flex>
            </Flex>
        </Flex>
    );
}

function InfoBar() {
    const items = [
        {
            icon: "/img/match-predict/event_note.png",
            title: "예측 참여",
            desc: "05.31.(일) 01:00(KST)까지",
        },
        {
            icon: "/img/match-predict/alarm.png",
            title: "결과 반영",
            desc: "연장전까지 고려\n승부 차기 미반영",
        },
        {
            icon: "/img/match-predict/gift.png",
            title: "당첨자 발표",
            desc: "06.01.(월) 18:00(KST)",
        },
    ];

    return (
        <Flex px="12px" alignSelf="stretch">
            <Flex flex="1" justify="space-between" align="flex-start" py="10px" px="3px" gap="4px">
                {items.map((item) => (
                    <Flex key={item.title} align="flex-start" gap="6px" flex="1">
                        <Image
                            src={item.icon}
                            alt=""
                            w="22px"
                            h="22px"
                            objectFit="contain"
                            mt="2px"
                            flexShrink={0}
                        />
                        <Flex direction="column" gap="3px" minW={0}>
                            <Text color="cyan.300" fontSize="13px" fontWeight="800" lineHeight="1.2">
                                {item.title}
                            </Text>
                            <Text color="cyan.300" fontSize="10px" fontWeight="400" lineHeight="1.4" whiteSpace="pre-line">
                                {item.desc}
                            </Text>
                        </Flex>
                    </Flex>
                ))}
            </Flex>
        </Flex>
    );
}

const EMBLEM_SIZE = "32px";
const SCORE_BOX_SIZE = "52px";
const SCORE_FONT = "28px";

function ScoreDisplay({ label, scoreA, scoreB }: {
    label: string;
    scoreA: number;
    scoreB: number;
}) {
    return (
        <Flex direction="column" gap="8px" alignSelf="stretch" px="5px">
            <Text color="white" fontSize="16px" fontWeight="400">{label}</Text>
            <Flex justify="space-between" align="center">
                <Flex direction="column" align="center" gap="5px" minW="44px">
                    <Image src="/img/match-predict/psg.png" alt="PSG" w={EMBLEM_SIZE} h={EMBLEM_SIZE} objectFit="cover" borderRadius="full" />
                    <Text color="white" fontSize="12px" fontWeight="600">PSG</Text>
                </Flex>
                <Flex align="center" gap="6px">
                    <Flex w={SCORE_BOX_SIZE} h={SCORE_BOX_SIZE} justify="center" align="center" bg="#08080C" border="1px solid rgba(255,204,0,0.6)" style={{ boxShadow: "0 0 8px rgba(255,204,0,0.4)" }}>
                        <Text color="rgba(255,255,255,0.9)" fontSize={SCORE_FONT} fontWeight="700">{scoreA}</Text>
                    </Flex>
                    <Text color="white" fontSize={SCORE_FONT} fontWeight="700">:</Text>
                    <Flex w={SCORE_BOX_SIZE} h={SCORE_BOX_SIZE} justify="center" align="center" bg="#08080C" border="1px solid rgba(255,204,0,0.6)" style={{ boxShadow: "0 0 8px rgba(255,204,0,0.4)" }}>
                        <Text color="rgba(255,255,255,0.9)" fontSize={SCORE_FONT} fontWeight="700">{scoreB}</Text>
                    </Flex>
                </Flex>
                <Flex direction="column" align="center" gap="5px" minW="52px">
                    <Image src="/img/match-predict/arsenal.png" alt="Arsenal" w={EMBLEM_SIZE} h={EMBLEM_SIZE} objectFit="cover" borderRadius="full" />
                    <Text color="white" fontSize="12px" fontWeight="600">Arsenal</Text>
                </Flex>
            </Flex>
        </Flex>
    );
}

function MyPredictionCard({ prediction, onEdit }: {
    prediction: { firstScoreA: number; firstScoreB: number; secondScoreA: number; secondScoreB: number };
    onEdit: () => void;
}) {
    return (
        <Flex px="12px" alignSelf="stretch">
            <Flex
                flex="1"
                direction="column"
                gap="14px"
                bg="#08080C"
                borderRadius="10px"
                border="1px solid rgba(255,204,0,1)"
                px="14px"
                py="16px"
                style={{
                    boxShadow: "0 0 10px rgba(255,204,0,1), 0 0 30px rgba(255,204,0,0.6), 0 0 80px rgba(255,204,0,0.2)",
                }}
            >
                <Text color="white" fontSize="20px" fontWeight="700">나의 예측 현황</Text>
                <ScoreDisplay label="전반전 예상 스코어" scoreA={prediction.firstScoreA} scoreB={prediction.firstScoreB} />
                <ScoreDisplay label="후반전 예상 스코어" scoreA={prediction.secondScoreA} scoreB={prediction.secondScoreB} />
                <Flex justify="center">
                    <Button
                        onClick={onEdit}
                        color="white"
                        fontSize="16px"
                        fontWeight="700"
                        bg="rgba(255,255,255,0.1)"
                        border="1px solid rgba(255,255,255,0.3)"
                        borderRadius="10px"
                        px="24px"
                        py="10px"
                        h="auto"
                        minH="44px"
                        _hover={{ bg: "rgba(255,255,255,0.18)" }}
                        _active={{ bg: "rgba(255,255,255,0.14)" }}
                    >
                        예측 수정하기
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}

function NoPredictionCard({ onInput }: { onInput: () => void }) {
    return (
        <Flex px="12px" alignSelf="stretch">
            <Flex
                flex="1"
                direction="column"
                align="center"
                gap="14px"
                bg="#08080C"
                borderRadius="10px"
                border="1px solid rgba(255,204,0,1)"
                px="14px"
                py="24px"
                style={{
                    boxShadow: "0 0 10px rgba(255,204,0,1), 0 0 30px rgba(255,204,0,0.6), 0 0 80px rgba(255,204,0,0.2)",
                }}
            >
                <Text color="white" fontSize="20px" fontWeight="700">나의 예측 현황</Text>
                <Text color="rgba(255,255,255,0.5)" fontSize="14px">아직 예측을 제출하지 않았어요.</Text>
                <Button
                    onClick={onInput}
                    color="white"
                    fontSize="16px"
                    fontWeight="700"
                    bg="#4A90D9"
                    borderRadius="md"
                    px="24px"
                    minH="44px"
                    h="auto"
                    _hover={{ bg: "#357ABD" }}
                >
                    예측 입력하기
                </Button>
            </Flex>
        </Flex>
    );
}

const RANK_GLOWS = [
    "0 0 5px rgba(255,204,0,1), 0 0 10px rgba(255,204,0,0.8)",
    "0 0 4px rgba(94,92,92,1), 0 0 8px rgba(94,92,92,0.8)",
    "0 0 3px rgba(185,62,73,1), 0 0 6px rgba(185,62,73,0.8)",
];

function ScoringCard() {
    const rows = [
        { rank: "1 순위", desc: "맞힌 스코어 개수" },
        { rank: "2 순위", desc: "실제 점수와 차이의 절댓값" },
        { rank: "3 순위", desc: "승패 여부" },
    ];

    return (
        <Flex px="12px" alignSelf="stretch">
            <Flex
                flex="1"
                direction="column"
                gap="10px"
                bg="#08080C"
                borderRadius="10px"
                border="1px solid rgba(39,130,242,1)"
                px="14px"
                py="16px"
                style={{ boxShadow: "0 0 30px rgba(1,39,143,1)" }}
            >
                <Text
                    color="white"
                    fontSize="20px"
                    fontWeight="700"
                    style={{
                        textShadow: "0 0 10px rgba(0,255,255,1), 0 0 15px rgba(0,255,255,0.7), 0 0 30px rgba(0,255,255,0.4)",
                    }}
                >
                    채점 우선순위
                </Text>
                {rows.map((row, i) => (
                    <Flex key={row.rank} justify="space-between" align="center">
                        <Text color="white" fontSize="14px" fontWeight="500" style={{ textShadow: RANK_GLOWS[i] }}>
                            {row.rank}
                        </Text>
                        <Text color="white" fontSize="14px" fontWeight="500">{row.desc}</Text>
                    </Flex>
                ))}
            </Flex>
        </Flex>
    );
}

function PrizeCard() {
    const rows = [
        { rank: "1위(1명)", desc: "배달의민족 상품권 5만원 교환권" },
        { rank: "2위(3명)", desc: "휴대용 선풍기" },
        { rank: "3위(3명)", desc: "커피 교환권" },
    ];

    return (
        <Flex px="12px" alignSelf="stretch">
            <Flex
                flex="1"
                direction="column"
                gap="10px"
                bg="#08080C"
                borderRadius="10px"
                border="1px solid rgb(245, 30, 11)"
                px="14px"
                py="16px"
                style={{ boxShadow: "0 0 30px rgb(143, 8, 8)" }}
            >
                <Text
                    color="white"
                    fontSize="20px"
                    fontWeight="700"
                    style={{
                        textShadow: "0 0 10px rgb(255, 162, 0), 0 0 15px rgba(255, 38, 0, 0.7), 0 0 30px rgba(72, 47, 0, 0.82)",
                    }}
                >
                    예측 순위별 상품
                </Text>
                {rows.map((row, i) => (
                    <Flex key={row.rank} justify="space-between" align="center">
                        <Text color="white" fontSize="14px" fontWeight="500" style={{ textShadow: RANK_GLOWS[i] }}>
                            {row.rank}
                        </Text>
                        <Text color="white" fontSize="14px" fontWeight="500">{row.desc}</Text>
                    </Flex>
                ))}
            </Flex>
        </Flex>
    );
}

export default function MatchPredictMainPage() {
    const { isLogined, userInfo } = useAuth();
    const { linkPush } = useLinkPush();
    const { allMatches } = useMatchAPI();
    const { myPredictions } = useMatchPredictionAPI(userInfo?.id);

    const activeMatch = allMatches.data?.data?.find((match) => (
        match.firstScoreA === null &&
        match.firstScoreB === null &&
        match.secondScoreA === null &&
        match.secondScoreB === null &&
        new Date(match.matchTime).getTime() > Date.now()
    )) ?? allMatches.data?.data?.[0];
    const matchId = activeMatch?.id;
    const existingPrediction = myPredictions.data?.data?.find(
        (p) => p.prediction.matchId === matchId
    )?.prediction;

    function handleInputClick() {
        if (!isLogined) {
            sessionStorage.setItem("loginRedirect", "/match-predict/input");
            linkPush("/login");
        } else {
            linkPush("/match-predict/input");
        }
    }

    return (
        <Scroll>
            <Flex direction="column" align="center" bg="#09090E" minH="100vh">
                <Flex w="100%" maxW="440px" h="60px" justify="center" align="center" bg="#292E38">
                    <Box {...titleStyle} />
                </Flex>

                <TopBanners />

                <Flex w="100%" maxW="440px" direction="column" mx="auto" gap="12px" pb="20px">
                    <Box
                        alignSelf="stretch"
                        h="180px"
                        backgroundImage="url('/img/match-predict/poster.png')"
                        backgroundSize="cover"
                        backgroundPosition="center"
                        backgroundRepeat="no-repeat"
                    />

                    <MatchHeader />
                    <InfoBar />

                    <PrizeCard />

                    {existingPrediction ? (
                        <MyPredictionCard prediction={existingPrediction} onEdit={handleInputClick} />
                    ) : (
                        <NoPredictionCard onInput={handleInputClick} />
                    )}

                    <ScoringCard />
                </Flex>

                <BottomBanners />
            </Flex>
        </Scroll>
    );
}
