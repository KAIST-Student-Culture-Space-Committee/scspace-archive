"use client";

import { Box, Button, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { IMtPlayer } from "@scspace-depot/types/mt";
import {
    MT_ALLOW_GUEST,
    MT_FIRST_NICKNAME_MAX,
    MT_HARD_MODE_LABEL,
    MT_NICKNAME_MAX,
    MT_PHASE_LABEL,
    MT_RENAME_EXTRA,
    mtCandyForHold,
    mtGraphemes,
    mtTouchCount,
} from "@scspace-depot/consts/mt.const";
import { useAuth } from "@scspace-client/Hooks/auth";
import { MtClientState, useMtAction, useMtNow, useMtState } from "@scspace-client/Hooks/mt";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import NicknameInput from "./NicknameInput";
import { LogList, PlayerButton, Roulette, boom, mtColors, unlockAudio } from "./shared";

type Act = ReturnType<typeof useMtAction>;

function useWakeLock() {
    useEffect(() => {
        let lock: WakeLockSentinel | null = null;
        const request = () => navigator.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
        const onVisible = () => { if (document.visibilityState === "visible") request(); };
        request();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            lock?.release().catch(() => {});
        };
    }, []);
}

function Title({ children }: { children: React.ReactNode }) {
    return <Text fontSize="22px" fontWeight="black" color={mtColors.orange} textAlign="center">{children}</Text>;
}

function Muted({ children }: { children: React.ReactNode }) {
    return <Text color={mtColors.muted} textAlign="center">{children}</Text>;
}

function PlayerGrid({ players, selectedId, disabled, onPick }: {
    players: IMtPlayer[]; selectedId?: number | null; disabled?: (p: IMtPlayer) => boolean; onPick: (p: IMtPlayer) => void;
}) {
    return <Grid templateColumns="1fr 1fr" gap={2}>
        {players.map((p) => <PlayerButton key={p.userId} player={p} selected={p.userId === selectedId} disabled={disabled?.(p)} onClick={() => onPick(p)} />)}
    </Grid>;
}

function Holding({ state, now, act }: { state: MtClientState; now: number; act: Act }) {
    const me = state.me!;
    const isHolder = state.holderId === me.userId;
    const elapsed = (now - (state.holdingStartedAt ?? now)) / 1000;
    const beat = Math.max(0.25, 1.1 - elapsed * 0.015);
    const blinkHidden = state.hardMode === "BLINK" && Math.floor(now / 1000) % 3 !== 0;
    const locked = now < me.lockedUntil;
    return <Stack gap={4}>
        <Box textAlign="center" fontSize="96px" lineHeight={1}
            style={{ animation: `mt-flicker ${beat * 1.6}s infinite, mt-heartbeat ${beat}s infinite` }}>
            🎃
        </Box>
        <Text textAlign="center" color={mtColors.text} fontSize="20px" fontWeight="bold">
            {isHolder ? "지금 내가 들고 있어요!" : `${state.players.find((p) => p.userId === state.holderId)?.nickname ?? ""} 이(가) 들고 있어요`}
        </Text>
        <Stack gap={2}>
            {state.players.map((p) => (
                <Flex key={p.userId} justify="space-between" align="center" px={4} py={3} rounded="10px" bg={mtColors.surface}
                    border="2px solid" borderColor={p.userId === state.holderId ? mtColors.orange : "transparent"}>
                    <Text color={mtColors.text} fontSize="22px" fontWeight="bold" wordBreak="break-all"
                        visibility={blinkHidden && p.userId !== me.userId ? "hidden" : "visible"}>
                        {p.nickname}{p.userId === me.userId && " (나)"}
                    </Text>
                    <Text fontSize="20px">{p.userId === state.holderId ? "🎃" : ""}{p.online ? "" : "📵"}</Text>
                </Flex>
            ))}
        </Stack>
        {isHolder && <Box style={locked ? { animation: "mt-shake .3s" } : undefined}>
            <NicknameInput max={MT_NICKNAME_MAX} placeholder={`넘길 사람의 닉네임 (오타 시 🍬-${state.typoPenalty})`} disabled={locked || act.isPending}
                buttonLabel={locked ? "🔒" : "시전!"}
                onSubmit={(text, clear) => act.mutate({ endpoint: "/mt/pass", body: { text } }, { onSuccess: (r) => { if (r.hit) clear(); } })} />
        </Box>}
    </Stack>;
}

function Phase({ state, now, act }: { state: MtClientState; now: number; act: Act }) {
    const me = state.me!;
    const others = state.players.filter((p) => p.userId !== me.userId);
    const nameOf = (id: number | null | undefined) => state.players.find((p) => p.userId === id)?.nickname ?? "";

    switch (state.phase) {
        case "LOBBY":
            return <Stack gap={4}>
                <Title>MC가 시작하길 기다리는 중…</Title>
                <Stack gap={1}>{state.players.map((p) => <Text key={p.userId} color={mtColors.text} textAlign="center">🕯️ {p.nickname}</Text>)}</Stack>
                <Muted>닉네임 바꾸기</Muted>
                <NicknameInput max={MT_FIRST_NICKNAME_MAX} buttonLabel="변경" disabled={act.isPending}
                    onSubmit={(nickname, clear) => act.mutate({ endpoint: "/mt/join", body: { nickname } }, { onSuccess: clear })} />
            </Stack>;
        case "ROUND_START":
            return state.grudgeHolderId === me.userId
                ? <Stack gap={4}>
                    <Title>😈 원한을 풀 시간! 누구부터 시작할까요?</Title>
                    <PlayerGrid players={others} onPick={(p) => act.mutate({ endpoint: "/mt/grudge", body: { targetUserId: p.userId } })} />
                </Stack>
                : <Stack gap={2}>
                    <Title>🕯️ {state.round}라운드 곧 시작</Title>
                    {state.grudgeHolderId && <Muted>{nameOf(state.grudgeHolderId)} 님이 시작할 사람을 고르는 중…</Muted>}
                </Stack>;
        case "HOLDING":
            return <Holding state={state} now={now} act={act} />;
        case "EXPLODED":
            return <Stack gap={4} align="center">
                <Text fontSize="96px" lineHeight={1}>💥</Text>
                <Title>{nameOf(state.explosion?.victimId)} 마셔라!</Title>
                {state.explosion?.drink && <Roulette key={state.round} drinks={state.explosion.drinks} result={state.explosion.drink} />}
            </Stack>;
        case "TOT_CHOOSE":
            return <Stack gap={4}>
                <Title>🍬 Trick or Treat?</Title>
                <Muted>Trick이 적으면 이름을 훔치고, 많으면 들켜서 마셔요. Treat은 사탕 +{state.treatCandy}</Muted>
                <Grid templateColumns="1fr 1fr" gap={3}>
                    {(["TRICK", "TREAT"] as const).map((choice) => (
                        <Button key={choice} h="96px" fontSize="24px" fontWeight="black"
                            bg={me.totChoice === choice ? mtColors.orange : mtColors.surface} color={me.totChoice === choice ? "black" : mtColors.text}
                            onClick={() => act.mutate({ endpoint: "/mt/tot", body: { choice } })}>
                            {choice === "TRICK" ? "😈 Trick" : "🍬 Treat"}
                        </Button>
                    ))}
                </Grid>
            </Stack>;
        case "TOT_STEAL":
            return state.tot?.trickIds.includes(me.userId)
                ? <Stack gap={4}>
                    <Title>🦇 누구의 마지막 글자를 훔칠까요?</Title>
                    <PlayerGrid players={others} selectedId={me.stealTargetId}
                        disabled={(p) => mtGraphemes(p.nickname).length <= 1}
                        onPick={(p) => act.mutate({ endpoint: "/mt/tot/steal", body: { targetUserId: p.userId } })} />
                </Stack>
                : <Stack gap={2}>
                    <Title>🦇 Trick {state.tot?.trickIds.length}명이 이름을 훔치는 중…</Title>
                    <Muted>{state.tot?.trickIds.map(nameOf).join(", ")}</Muted>
                </Stack>;
        case "RENAME":
            if (me.renamed) return <Title>✍️ 개명 완료!</Title>;
            if (me.candy < state.renameCost) return <Stack gap={2}>
                <Title>✍️ 개명 시간</Title>
                <Muted>사탕이 {state.renameCost}개 있어야 개명할 수 있어요 (지금 {me.candy}개)</Muted>
            </Stack>;
            return <RenameForm state={state} act={act} />;
        case "TRIAL_VOTE":
            return <Stack gap={4}>
                <Title>⚖️ 마녀재판</Title>
                <Muted>제일 어려운 닉네임은? 최다 득표자는 이름 세 글자가 지워져요</Muted>
                <PlayerGrid players={others} selectedId={me.trialVoteId}
                    onPick={(p) => act.mutate({ endpoint: "/mt/vote/trial", body: { targetUserId: p.userId } })} />
            </Stack>;
        case "GAME_OVER":
            return <GameOver state={state} />;
    }
}

/** Shows the bonus the new name would earn before spending candy on it. */
function RenameForm({ state, act }: { state: MtClientState; act: Act }) {
    const me = state.me!;
    const [draft, setDraft] = useState("");
    const max = Math.min(MT_NICKNAME_MAX, mtGraphemes(me.nickname).length + MT_RENAME_EXTRA);
    const touches = mtTouchCount(draft || me.nickname);
    return <Stack gap={3}>
        <Title>✍️ 사탕 {state.renameCost}개로 개명할까요?</Title>
        <Muted>최대 {max}글자 · 바로 적용돼요</Muted>
        <NicknameInput max={max} buttonLabel="개명" disabled={act.isPending} onValueChange={setDraft}
            onSubmit={(nickname, clear) => act.mutate({ endpoint: "/mt/rename", body: { nickname } }, { onSuccess: clear })} />
        <Muted>
            {touches === null
                ? "키보드로 칠 수 없는 문자가 있어요"
                : `⌨️ 터치 ${touches}번 → 생존 보너스 +${Math.floor(touches * state.survivalMultiplier)}🍬`}
        </Muted>
    </Stack>;
}

function GameOver({ state }: { state: MtClientState }) {
    const result = state.result!;
    return <Stack gap={4}>
        <Title>🏁 최종 순위</Title>
        <Stack gap={2}>
            {result.players.map((p) => (
                <Flex key={p.userId} justify="space-between" align="center" gap={2} p={3} rounded="12px" bg={mtColors.surface}
                    border="2px solid" borderColor={p.rank === 1 ? mtColors.orange : "transparent"}>
                    <Stack gap={0}>
                        <Text fontWeight="black" color={p.rank === 1 ? mtColors.orange : mtColors.text}>
                            {p.rank}등 {p.rank === 1 && "👑 호박왕"}
                        </Text>
                        <Text color={mtColors.text} wordBreak="break-all">{p.nickname}</Text>
                        <Text color={mtColors.muted} fontSize="sm">🍬 {p.candy} · 💥 {p.explodeCount}</Text>
                    </Stack>
                    <Text fontSize="20px" fontWeight="black" whiteSpace="nowrap">🍺 {p.rank}잔</Text>
                </Flex>
            ))}
        </Stack>
        <Stack gap={1} p={3} rounded="12px" bg={mtColors.surface}>
            <Text color={mtColors.orange} fontWeight="bold">가장 많이 틀린 철자 TOP 3</Text>
            {result.topTypos.length === 0 && <Text color={mtColors.muted}>없음</Text>}
            {result.topTypos.map((t, i) => <Text key={t.text} color={mtColors.text} wordBreak="break-all">{i + 1}. &quot;{t.text}&quot; ({t.count}회)</Text>)}
        </Stack>
    </Stack>;
}

export default function MtPlayerPage() {
    const { isManager, isLoading, needManager } = useAuth();
    useEffect(() => { if (!MT_ALLOW_GUEST) needManager(); }, [isLoading]);
    useWakeLock();
    const { data: state } = useMtState(false, MT_ALLOW_GUEST || isManager);
    const act = useMtAction();
    const now = useMtNow(state?.offset ?? 0);

    const prevPhase = useRef(state?.phase);
    useEffect(() => {
        if (state?.phase === "EXPLODED" && prevPhase.current === "HOLDING") boom();
        prevPhase.current = state?.phase;
    }, [state?.phase]);

    if (!state) return <LoadingComponent />;
    const me = state.me;
    const holdingCandy = me && state.holderId === me.userId && state.holdStartedAt !== null && !state.paused
        ? mtCandyForHold(now - state.holdStartedAt) : 0;
    const secondsLeft = state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;

    return <Box position="fixed" inset={0} zIndex={1000} overflowY="auto" bg={mtColors.background} color={mtColors.text} px={4} py={5} onPointerDown={unlockAudio}>
        <Stack gap={4} maxW="480px" mx="auto">
            <Flex justify="space-between" align="center">
                <Text fontWeight="bold" color={mtColors.orange}>🎃 {MT_PHASE_LABEL[state.phase]}</Text>
                <Text color={mtColors.muted} fontSize="sm">
                    {state.round > 0 && `${state.round}/${state.totalRounds}R`}
                    {secondsLeft !== null && ` · ⏳${secondsLeft}s`}
                </Text>
            </Flex>
            {state.paused && <Text textAlign="center" bg={mtColors.purple} rounded="8px" py={2} fontWeight="bold">⏸ 일시정지</Text>}
            {state.hardMode && (state.phase === "ROUND_START" || state.phase === "HOLDING") &&
                <Text textAlign="center" color={mtColors.red} fontWeight="bold">🔥 하드모드: {MT_HARD_MODE_LABEL[state.hardMode]}{state.revealed && " · 👀 이름 공개 중!"}</Text>}

            {!me
                ? state.phase === "LOBBY"
                    ? <Stack gap={4}>
                        <Title>🎃 잭오랜턴 넘기기</Title>
                        <Muted>닉네임을 정해주세요. 다른 사람이 정확히 쳐야 넘길 수 있어요!</Muted>
                        <NicknameInput max={MT_FIRST_NICKNAME_MAX} buttonLabel="입장" disabled={act.isPending}
                            onSubmit={(nickname) => act.mutate({ endpoint: "/mt/join", body: { nickname } })} />
                    </Stack>
                    : <Title>게임이 이미 진행 중이에요</Title>
                : <>
                    <Flex justify="space-between" p={3} rounded="12px" bg={mtColors.surface}>
                        <Stack gap={0}>
                            <Text fontWeight="bold" wordBreak="break-all">나: {me.nickname}</Text>
                            <Text color={mtColors.muted} fontSize="sm">
                                ⌨️ 터치 {mtTouchCount(me.nickname)}번 · 생존 보너스 +{Math.floor((mtTouchCount(me.nickname) ?? 0) * state.survivalMultiplier)}🍬
                            </Text>
                        </Stack>
                        <Text>🍬 {me.candy + holdingCandy}</Text>
                    </Flex>
                    <Phase state={state} now={now} act={act} />
                </>}

            <LogList logs={state.logs} players={state.players} />
        </Stack>
    </Box>;
}
