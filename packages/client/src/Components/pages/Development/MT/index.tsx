"use client";

import { Button, Flex, Grid, Input, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { IMtSettings, MtHardMode, MtTimedPhase } from "@scspace-depot/types/mt";
import { MT_ALLOW_GUEST, MT_HARD_MODE_LABEL, MT_PHASE_LABEL } from "@scspace-depot/consts/mt.const";
import { useAuth } from "@scspace-client/Hooks/auth";
import { mtLogText, useMtAction, useMtNow, useMtState } from "@scspace-client/Hooks/mt";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";

const NUMBER_FIELDS: [keyof IMtSettings, string][] = [
    ["timerMin", "폭발 최소(초)"], ["timerMax", "폭발 최대(초)"], ["renameCost", "개명 비용(사탕)"],
    ["trialEvery", "마녀재판 주기(라운드)"], ["totalRounds", "총 라운드"], ["typoPenalty", "오타 벌금(사탕)"],
    ["treatCandy", "Treat 보상(사탕)"], ["survivalMultiplier", "생존 보너스 배수(×터치 수)"],
];
const TIMED_PHASES: MtTimedPhase[] = ["ROUND_START", "TOT_CHOOSE", "TOT_STEAL", "RENAME", "TRIAL_VOTE"];
const HARD_MODES = Object.keys(MT_HARD_MODE_LABEL) as MtHardMode[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return <Stack gap={3} p={4} rounded="12px" bg="bg" border="1px solid" borderColor="border">
        <Text fontWeight="bold" fontSize="lg">{title}</Text>
        {children}
    </Stack>;
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
    return <Button size="sm" variant={on ? "solid" : "outline"} colorPalette={on ? "orange" : "gray"} onClick={onClick}>{label}: {on ? "ON" : "OFF"}</Button>;
}

export default function MtAdmin() {
    const { isAdmin, isLoading, needAdmin } = useAuth();
    useEffect(() => { if (!MT_ALLOW_GUEST) needAdmin(); }, [isLoading]);
    const { data: state } = useMtState(true, MT_ALLOW_GUEST || isAdmin);
    const act = useMtAction();
    const now = useMtNow(state?.offset ?? 0, 500);
    const [draft, setDraft] = useState<IMtSettings | null>(null);
    const [edits, setEdits] = useState<Record<number, string>>({});

    if (!state?.settings) return <LoadingComponent />;
    const form = draft ?? state.settings;
    const set = (patch: Partial<IMtSettings>) => setDraft({ ...form, ...patch });
    const left = (t: number | null | undefined) => (t ? `${Math.max(0, Math.ceil((t - now) / 1000))}s` : "-");
    const nameOf = (id: number | null) => state.players.find((p) => p.userId === id)?.nickname ?? "-";
    const command = (name: string) => act.mutate({ endpoint: `/mt/admin/${name}` });

    return <Scroll><Stack gap={4} pb={6}>
        <Section title="진행">
            <Text>
                단계: <b>{MT_PHASE_LABEL[state.phase]}</b> · 라운드 {state.round}/{state.totalRounds}
                {state.paused && " · ⏸ 일시정지"}
                {state.hardMode && ` · 하드모드 ${MT_HARD_MODE_LABEL[state.hardMode]}`}
            </Text>
            <Text>
                🎃 {nameOf(state.holderId)} · 단계 남은 시간 {left(state.deadline)} · 폭발까지 {left(state.explodeAt)}
                {state.explosion && ` · 💥 ${nameOf(state.explosion.victimId)}${state.explosion.drink ? ` (${state.explosion.drink})` : ""}`}
            </Text>
            <Flex gap={2} wrap="wrap">
                <Button onClick={() => command("start")} disabled={state.phase !== "LOBBY"}>시작</Button>
                {state.paused
                    ? <Button onClick={() => command("resume")}>재개</Button>
                    : <Button onClick={() => command("pause")}>일시정지</Button>}
                <Button onClick={() => command("next")}>다음 단계로</Button>
                <Button colorPalette="red" onClick={() => { if (confirm("게임과 참가자를 전부 초기화할까요?")) command("reset"); }}>전체 리셋</Button>
            </Flex>
            {state.phase === "TOT_CHOOSE" && <Text fontSize="sm">
                선택: {Object.entries(state.totChoices ?? {}).map(([id, c]) => `${nameOf(Number(id))}=${c}`).join(", ") || "없음"}
            </Text>}
            {state.result && <Text fontSize="sm">
                순위: {state.result.players.map((p) => `${p.rank}등${p.rank === 1 ? "👑" : ""} ${p.nickname} (🍬${p.candy}, 🍺${p.rank}잔)`).join(" · ")}
            </Text>}
        </Section>

        <Section title={`참가자 (${state.players.length})`}>
            {state.players.map((p) => (
                <Flex key={p.userId} gap={2} align="center" wrap="wrap">
                    <Text minW="220px">
                        {p.online ? "🟢" : "⚫"} {p.userId === state.holderId && "🎃"} <b>{p.nickname}</b> ({p.name}) · 🍬{p.candy}
                    </Text>
                    <Input size="sm" w="160px" placeholder="새 닉네임" value={edits[p.userId] ?? ""}
                        onChange={(e) => setEdits({ ...edits, [p.userId]: e.target.value })} />
                    <Button size="sm" disabled={!edits[p.userId]}
                        onClick={() => act.mutate({ endpoint: `/mt/admin/players/${p.userId}`, method: "PATCH", body: { nickname: edits[p.userId] } },
                            { onSuccess: () => setEdits({ ...edits, [p.userId]: "" }) })}>수정</Button>
                    <Button size="sm" colorPalette="red" variant="outline"
                        onClick={() => { if (confirm(`${p.nickname} 내보낼까요?`)) act.mutate({ endpoint: `/mt/admin/players/${p.userId}`, method: "DELETE" }); }}>
                        내보내기
                    </Button>
                </Flex>
            ))}
        </Section>

        <Section title="설정">
            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(3, 1fr)" }} gap={3}>
                {NUMBER_FIELDS.map(([key, label]) => (
                    <Stack key={key} gap={1}>
                        <Text fontSize="sm">{label}</Text>
                        <Input type="number" value={String(form[key])} onChange={(e) => set({ [key]: Number(e.target.value) })} />
                    </Stack>
                ))}
                {TIMED_PHASES.map((phase) => (
                    <Stack key={phase} gap={1}>
                        <Text fontSize="sm">{MT_PHASE_LABEL[phase]} 제한(초)</Text>
                        <Input type="number" value={String(form.phaseSeconds[phase])}
                            onChange={(e) => set({ phaseSeconds: { ...form.phaseSeconds, [phase]: Number(e.target.value) } })} />
                    </Stack>
                ))}
            </Grid>
            <Stack gap={2} align="flex-start">
                <Toggle label="하드모드" on={form.hardMode} onClick={() => set({ hardMode: !form.hardMode })} />
                {form.hardMode && <Stack gap={2} pl={4} borderLeftWidth="2px" borderColor="orange.400">
                    <Text fontSize="sm">켜 둔 방식 중 하나가 라운드마다 랜덤으로 적용돼요{HARD_MODES.some((m) => form.hardModes[m]) ? "" : " (하나 이상 켜야 적용돼요)"}</Text>
                    <Flex gap={2} wrap="wrap">
                        {HARD_MODES.map((m) => (
                            <Toggle key={m} label={MT_HARD_MODE_LABEL[m]} on={form.hardModes[m]}
                                onClick={() => set({ hardModes: { ...form.hardModes, [m]: !form.hardModes[m] } })} />
                        ))}
                    </Flex>
                </Stack>}
            </Stack>
            <Stack gap={2} align="flex-start">
                <Toggle label="음료 룰렛" on={form.roulette} onClick={() => set({ roulette: !form.roulette })} />
                {form.roulette && <Flex gap={2} wrap="wrap" align="flex-end" pl={4} borderLeftWidth="2px" borderColor="orange.400" w="full">
                    <Stack gap={1}>
                        <Text fontSize="sm">폭발 시 룰렛 확률(%)</Text>
                        <Input type="number" w="120px" value={String(form.rouletteChance)} onChange={(e) => set({ rouletteChance: Number(e.target.value) })} />
                    </Stack>
                    <Stack gap={1} flex={1} minW="200px">
                        <Text fontSize="sm">음료 (쉼표로 구분)</Text>
                        <Input value={form.drinks.join(",")} onChange={(e) => set({ drinks: e.target.value.split(",") })} />
                    </Stack>
                </Flex>}
            </Stack>
            <Flex gap={2}>
                <Button colorPalette="orange" disabled={!draft}
                    onClick={() => act.mutate({ endpoint: "/mt/admin/settings", method: "PATCH", body: { ...form, drinks: form.drinks.map((d) => d.trim()).filter(Boolean) } },
                        { onSuccess: () => setDraft(null) })}>저장</Button>
                <Button variant="outline" disabled={!draft} onClick={() => setDraft(null)}>되돌리기</Button>
            </Flex>
        </Section>

        <Section title="이벤트 로그">
            <Stack gap={1} maxH="300px" overflowY="auto">
                {[...state.logs].reverse().map((log) => <Text key={log.id} fontSize="sm">{mtLogText(log, state.players)}</Text>)}
            </Stack>
        </Section>
    </Stack></Scroll>;
}
