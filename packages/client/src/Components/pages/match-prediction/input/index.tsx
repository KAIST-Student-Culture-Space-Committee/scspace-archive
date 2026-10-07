"use client";

import { Box, Button, Checkbox, Flex, Grid, Image, Input, Stack, Text } from "@chakra-ui/react";
import { Announcement, MatchFooter, MatchHeader } from "../shared";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useLinkPush } from "@scspace-client/Hooks/api";
import { useMatchAPI, useMatchPredictionAPI } from "@scspace-client/Hooks/match";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { getMatchNow } from "../match-time";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

const assets = "/img/match-prediction/final";
const colors = { background: "#090c10", surface: "#151b22", text: "#f5f7fa", muted: "#9ca6b2", lime: "#dcff00", border: "#303842" };
const consentText = [
    "1. Personal data collected: Mobile phone number",
    "2. Purpose of collection and use: To verify the identity of prize winners, contact them, and deliver prizes",
    "3. Retention and use period: Until prize delivery is completed, after which the data is destroyed without delay",
    "4. Right to refuse: You may refuse consent. If you refuse, you will not be able to participate in the event or receive prizes.",
];
const emptyScores = { firstScoreA: "", firstScoreB: "", secondScoreA: "", secondScoreB: "" };
type Scores = typeof emptyScores;

function Team({ name }: { name: string }) {
    const normalized = name.toLowerCase().replace(/\s/g, "");
    const logo = normalized.includes("barcelona") || normalized.includes("바르셀로나") ? "barcelona.png"
        : normalized.includes("realmadrid") || normalized.includes("레알마드리드") ? "real-madrid.png" : null;
    return <Stack gap={1} align="center">
        {logo && <Image src={`${assets}/${logo}`} alt={name} boxSize={{ base: "88px", md: "144px" }} objectFit="contain" />}
        <Text fontWeight="bold" fontSize={{ base: "14px", md: "18px" }} textAlign="center">{name}</Text>
    </Stack>;
}

function ScoreControl({ value, onChange, label, disabled, readOnly }: {
    value: string; onChange: (value: string) => void; label: string; disabled: boolean; readOnly: boolean;
}) {
    return <Stack gap={3}>
        <Input aria-label={label} inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2}
            value={value} placeholder="—" readOnly={readOnly} disabled={disabled && !readOnly}
            onChange={({ target }) => { if (target.value === "" || /^\d{1,2}$/.test(target.value)) onChange(target.value); }}
            h={{ base: "88px", md: "112px" }} border="2px solid" borderColor={colors.lime} rounded="12px"
            bg={colors.background} color={colors.text} p={0} textAlign="center" fontSize={{ base: "48px", md: "64px" }} fontWeight="bold"
            _focusVisible={{ outline: "2px solid white", outlineOffset: "3px" }} _disabled={{ opacity: 0.7 }} />
        {!readOnly && <Flex bg={colors.surface} rounded="8px">
            <Button aria-label={`${label} decrease`} flex={1} h="44px" bg="transparent" color={colors.text} fontSize="25px"
                disabled={disabled || value === "" || Number(value) === 0} onClick={() => onChange(String(Number(value) - 1))}>−</Button>
            <Button aria-label={`${label} increase`} flex={1} h="44px" bg="transparent" color={colors.text} fontSize="25px"
                disabled={disabled || Number(value) >= 99} onClick={() => onChange(String(Number(value || 0) + 1))}>+</Button>
        </Flex>}
    </Stack>;
}

function ScoreSection({ title, teamA, teamB, valueA, valueB, onChangeA, onChangeB, disabled, readOnly }: {
    title: string; teamA: string; teamB: string; valueA: string; valueB: string;
    onChangeA: (value: string) => void; onChangeB: (value: string) => void; disabled: boolean; readOnly: boolean;
}) {
    return <Stack gap={4} w="full">
        <Text as="h2" color={colors.lime} fontWeight="black" fontSize={{ base: "24px", md: "36px" }} textAlign="center">{title}</Text>
        <Grid templateColumns={{ base: "1fr 16px 1fr", md: "144px 140px 24px 140px 144px" }}
            gap={{ base: 3, md: 6 }} justifyContent="center" alignItems="start" w="full">
            <Box gridColumn={1} gridRow={1}><Team name={teamA} /></Box>
            <Box gridColumn={{ base: 3, md: 5 }} gridRow={1}><Team name={teamB} /></Box>
            <Box gridColumn={{ base: 1, md: 2 }} gridRow={{ base: 2, md: 1 }}>
                <ScoreControl value={valueA} onChange={onChangeA} label={`${title} ${teamA}`} disabled={disabled} readOnly={readOnly} />
            </Box>
            <Text gridColumn={{ base: 2, md: 3 }} gridRow={{ base: 2, md: 1 }} pt={{ base: "18px", md: "24px" }}
                fontSize={{ base: "32px", md: "44px" }} textAlign="center">:</Text>
            <Box gridColumn={{ base: 3, md: 4 }} gridRow={{ base: 2, md: 1 }}>
                <ScoreControl value={valueB} onChange={onChangeB} label={`${title} ${teamB}`} disabled={disabled} readOnly={readOnly} />
            </Box>
        </Grid>
        <Text color={colors.muted} fontSize={{ base: "14px", md: "16px" }} textAlign="center">Regulation time · Enter a whole number of 0 or more</Text>
    </Stack>;
}

export default function MatchPredictionInputPage() {
    const { isLogined, isLoading, userInfo } = useAuth();
    const { linkPush } = useLinkPush();
    const { allMatches, createPrediction, isCreating } = useMatchAPI();
    const { myPredictions } = useMatchPredictionAPI(userInfo?.id);
    const [scores, setScores] = useState<Scores>(emptyScores);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [privacyConsent, setPrivacyConsent] = useState(false);
    const [error, setError] = useState("");
    const [now, setNow] = useState(getMatchNow);
    const match = allMatches.data?.data.find((item) => item.allowSubmission && item.startTime != null && now < item.startTime) ?? allMatches.data?.data[0];
    const existing = myPredictions.data?.data.find((item) => item.prediction.matchId === match?.id)?.prediction;
    const closed = match?.startTime != null && now >= match.startTime;
    const canSubmit = !!match?.allowSubmission && match.startTime != null && !closed;
    const busy = isCreating || allMatches.isFetching || myPredictions.isFetching;

    useEffect(() => {
        const timer = window.setInterval(() => setNow(getMatchNow()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (isLoading || isLogined) return;
        sessionStorage.setItem("loginRedirect", "/match-prediction/input");
        linkPush("/login");
    }, [isLogined, isLoading, linkPush]);
    useEffect(() => {
        setScores(existing ? {
            firstScoreA: String(existing.firstScoreA), firstScoreB: String(existing.firstScoreB),
            secondScoreA: String(existing.secondScoreA), secondScoreB: String(existing.secondScoreB),
        } : emptyScores);
        setPhoneNumber(existing?.phoneNumber ?? "");
        setPrivacyConsent(false);
        setError("");
    }, [match?.id, existing?.id]);

    function change(field: keyof Scores, value: string) { setScores((current) => ({ ...current, [field]: value })); setError(""); }
    function submit(event: FormEvent) {
        event.preventDefault();
        if (!match || busy || !canSubmit) return;
        const values = Object.values(scores);
        const phone = phoneNumber.replace(/[\s-]/g, "");
        if (values.some((value) => !/^\d{1,2}$/.test(value))) { setError("Enter all four scores as whole numbers from 0 to 99."); return; }
        if (Number(scores.secondScoreA) < Number(scores.firstScoreA) || Number(scores.secondScoreB) < Number(scores.firstScoreB)) {
            setError("The final score must be at least the first-half score for each team."); return;
        }
        if (!/^010\d{8}$/.test(phone)) { setError("Enter an 11-digit mobile number starting with 010."); return; }
        if (!privacyConsent) { setError("Consent to personal data collection is required."); return; }
        setError("");
        createPrediction({ matchId: match.id, firstScoreA: Number(scores.firstScoreA), firstScoreB: Number(scores.firstScoreB),
            secondScoreA: Number(scores.secondScoreA), secondScoreB: Number(scores.secondScoreB), phoneNumber: phone, privacyConsent: true }, {
            onSuccess: () => { toaster.success({ title: existing ? "Prediction updated" : "Prediction submitted" }); linkPush("/match-prediction/main"); },
            onError: (failure) => { setError(failure.message); allMatches.refetch(); },
        });
    }
    if (isLoading) return <LoadingComponent />;
    if (!isLogined || !userInfo) return null;
    const startLabel = match?.startTime == null ? "Kickoff time not set" : `${dateUtils().getString(match.startTime)} KST`;
    const status = allMatches.isError ? "Unable to load matches. Please try again." : !match ? "No match available." : closed ? "Submissions are closed." : !canSubmit ? "Submissions are not open." : "";

    return <Scroll><Box bg={colors.background} color={colors.text} minH="100dvh">
        <MatchHeader active="input" />
        <Announcement>{closed ? "GOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOD LUCK!" : "Make your prediction before kickoff."}</Announcement>
        <Box backgroundImage={`url('${assets}/stadium.png')`} backgroundSize="cover" backgroundPosition="center" px={{ base: 4, md: 12 }} py={8}>
            <Box as="form" onSubmit={submit} maxW="904px" mx="auto" bg={colors.background} border="1px solid" borderColor={colors.border} rounded="8px" px={{ base: 4, md: 10 }} py={6}>
                <Stack gap={{ base: 6, md: 5 }}>
                    <Button variant="plain" alignSelf="start" color={colors.muted} p={0} fontSize="14px" onClick={() => linkPush("/match-prediction/main")}>← Back to Event Info</Button>
                    <Stack align="center" gap={1}><Text as="h1" fontSize={{ base: "28px", md: "40px" }} fontWeight="black" textAlign="center">{closed ? "My Prediction" : "Predict the Score"}</Text>
                        <Text color={colors.muted} textAlign="center" fontSize={{ base: "14px", md: "20px" }}>{match ? `${match.teamA} vs ${match.teamB}` : "Match prediction"} · {startLabel}</Text></Stack>
                    {status && <Text role={allMatches.isError ? "alert" : "status"} color={colors.muted}>{status}</Text>}
                    {closed && !existing && !myPredictions.isPending && <Text role="status">You have not submitted a prediction for this match.</Text>}
                    {myPredictions.isError && <Text role="alert" color="orange.300">Unable to load your prediction. <Button variant="plain" color="inherit" onClick={() => myPredictions.refetch()}>Retry</Button></Text>}
                    <ScoreSection title="First Half Score" teamA={match?.teamA ?? "Team A"} teamB={match?.teamB ?? "Team B"} valueA={scores.firstScoreA} valueB={scores.firstScoreB}
                        onChangeA={(value) => change("firstScoreA", value)} onChangeB={(value) => change("firstScoreB", value)} disabled={!canSubmit || busy} readOnly={closed} />
                    <ScoreSection title="Final Score" teamA={match?.teamA ?? "Team A"} teamB={match?.teamB ?? "Team B"} valueA={scores.secondScoreA} valueB={scores.secondScoreB}
                        onChangeA={(value) => change("secondScoreA", value)} onChangeB={(value) => change("secondScoreB", value)} disabled={!canSubmit || busy} readOnly={closed} />
                    {!closed && <Stack gap={3}><label htmlFor="prediction-phone"><Text fontWeight="bold">Mobile Phone Number</Text></label>
                        <Input id="prediction-phone" type="tel" autoComplete="tel-national" placeholder="010 1234 5678" h="60px" bg={colors.background} borderColor={colors.border}
                            value={phoneNumber} disabled={!canSubmit || busy} onChange={({ target }) => { setPhoneNumber(target.value); setError(""); }} /></Stack>}
                    <Stack gap={3}><Text fontWeight="bold">Personal Data Collection and Use</Text>
                        <Stack tabIndex={0} aria-label="Personal data collection and use details" h="240px" overflowY="auto" border="1px solid" borderColor={colors.border} rounded="8px" p={5} gap={4}>
                            {consentText.map((text) => <Text key={text} color={colors.muted} fontSize="14px" lineHeight="22px">{text}</Text>)}
                        </Stack>
                        {!closed && <Checkbox.Root checked={privacyConsent} disabled={!canSubmit || busy} colorPalette="lime" onCheckedChange={({ checked }) => setPrivacyConsent(checked === true)}>
                            <Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>[Required] I agree to the collection and use of my personal data.</Checkbox.Label>
                        </Checkbox.Root>}
                    </Stack>
                    <Stack borderTop="1px solid" borderColor={colors.border} pt={5} gap={3} align="center">
                        <Flex gap={2} align="center" color="#ff7a1a"><Image src={`${assets}/clock.svg`} alt="" /><Text fontWeight="bold">{closed ? "OVER" : `Deadline ${startLabel}`}</Text></Flex>
                        {error && <Text role="alert" color="orange.300" w="full">{error}</Text>}
                        {closed ? <Button w="full" minH="64px" bg={colors.lime} color={colors.background} fontWeight="black" onClick={() => linkPush("/match-prediction/main")}>HAVE FUN :D <Image src={`${assets}/chevron.svg`} alt="" /></Button>
                            : <Button type="submit" w="full" minH="70px" h="auto" whiteSpace="normal" bg={colors.lime} color={colors.background} fontSize={{ base: "20px", md: "23px" }} fontWeight="black"
                                loading={busy} disabled={!canSubmit || !privacyConsent || myPredictions.isError || allMatches.isError || busy}>Agree and {existing ? "Update" : "Make"} a Prediction <Image src={`${assets}/chevron.svg`} alt="" /></Button>}
                        <Text color={colors.muted} fontSize="14px">{closed ? "View your entry" : "View or edit your entry"}</Text>
                    </Stack>
                </Stack>
            </Box>
        </Box>
        <MatchFooter />
    </Box></Scroll>;
}
