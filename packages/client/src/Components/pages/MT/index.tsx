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
            <NicknameInput max={MT_NICKNAME_MAX} placeholder="넘길 사람의 닉네임" disabled={locked || act.isPending}
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
                <Muted>Trick이 적으면 이름을 훔치고, 많으면 들켜서 마셔요. Treat은 사탕 +5</Muted>
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
        case "RENAME": {
            const max = Math.min(MT_NICKNAME_MAX, mtGraphemes(me.nickname).length + MT_RENAME_EXTRA);
            if (me.renameSubmitted) return <Title>✍️ 개명 신청 완료! 명명식을 기다려요</Title>;
            if (me.candy < state.renameCost) return <Stack gap={2}>
                <Title>✍️ 개명 시간</Title>
                <Muted>사탕이 {state.renameCost}개 있어야 개명할 수 있어요 (지금 {me.candy}개)</Muted>
            </Stack>;
            return <Stack gap={3}>
                <Title>✍️ 사탕 {state.renameCost}개로 개명할까요?</Title>
                <Muted>최대 {max}글자</Muted>
                <NicknameInput max={max} buttonLabel="개명" disabled={act.isPending}
                    onSubmit={(nickname, clear) => act.mutate({ endpoint: "/mt/rename", body: { nickname } }, { onSuccess: clear })} />
            </Stack>;
        }
        case "NAMING_VOTE":
            return <Stack gap={4}>
                <Title>📜 명명식</Title>
                {state.renames.map((r) => (
                    <Stack key={r.userId} gap={2} p={4} rounded="12px" bg={mtColors.surface}>
                        <Text color={mtColors.muted} textAlign="center">{r.oldNickname} →</Text>
                        <Text color={mtColors.text} fontSize="28px" fontWeight="black" textAlign="center" wordBreak="break-all">{r.newNickname}</Text>
                        {r.userId === me.userId
                            ? <Muted>소리 내어 읽어주세요!</Muted>
                            : <Grid templateColumns="1fr 1fr" gap={2}>
                                {[true, false].map((approve) => (
                                    <Button key={String(approve)} h="52px" fontSize="24px"
                                        bg={me.namingVotes[r.userId] === approve ? mtColors.orange : mtColors.background}
                                        onClick={() => act.mutate({ endpoint: "/mt/vote/naming", body: { targetUserId: r.userId, approve } })}>
                                        {approve ? "👍" : "👎"}
                                    </Button>
                                ))}
                            </Grid>}
                    </Stack>
                ))}
            </Stack>;
        case "TRIAL_VOTE":
            return <Stack gap={4}>
                <Title>⚖️ 마녀재판</Title>
                <Muted>제일 어려운 닉네임은? 최다 득표자는 이름 세 글자가 지워져요</Muted>
                <PlayerGrid players={others} selectedId={me.trialVoteId}
                    onPick={(p) => act.mutate({ endpoint: "/mt/vote/trial", body: { targetUserId: p.userId } })} />
            </Stack>;
        case "GAME_OVER":
            return <GameOver state={state} act={act} />;
    }
}

function GameOver({ state, act }: { state: MtClientState; act: Act }) {
    const me = state.me!;
    const result = state.result!;
    const [picked, setPicked] = useState<number[]>([]);
    const nameOf = (id: number) => state.players.find((p) => p.userId === id)?.nickname ?? "";
    return <Stack gap={4}>
        <Title>👑 호박왕: {result.kingId ? nameOf(result.kingId) : "없음"}</Title>
        {result.kingTargetIds
            ? <Muted>🍺 {result.kingTargetIds.map(nameOf).join(", ")} 마셔라!</Muted>
            : result.kingId === me.userId && <Stack gap={2}>
                <Muted>마실 사람 두 명을 고르세요</Muted>
                <PlayerGrid players={state.players.filter((p) => p.userId !== me.userId)} selectedId={null}
                    disabled={(p) => picked.length >= 2 && !picked.includes(p.userId)}
                    onPick={(p) => setPicked((prev) => prev.includes(p.userId) ? prev.filter((id) => id !== p.userId) : [...prev, p.userId])} />
                <Text color={mtColors.text} textAlign="center">{picked.map(nameOf).join(", ")}</Text>
                <Button bg={mtColors.orange} color="black" disabled={picked.length !== 2}
                    onClick={() => act.mutate({ endpoint: "/mt/king", body: { targetUserIds: picked } })}>지목!</Button>
            </Stack>}
        <Stack gap={1} p={3} rounded="12px" bg={mtColors.surface}>
            <Text color={mtColors.orange} fontWeight="bold">최종 닉네임 · 💥 폭발 횟수</Text>
            {result.players.map((p) => <Text key={p.userId} color={mtColors.text} wordBreak="break-all">{p.nickname} · 💥{p.explodeCount}</Text>)}
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
                <Text textAlign="center" color={mtColors.red} fontWeight="bold">🔥 하드모드: {MT_HARD_MODE_LABEL[state.hardMode]}</Text>}

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
                        <Text fontWeight="bold" wordBreak="break-all">나: {me.nickname}</Text>
                        <Text>🍬 {me.candy + holdingCandy}</Text>
                    </Flex>
                    <Phase state={state} now={now} act={act} />
                </>}

            <LogList logs={state.logs} players={state.players} />
        </Stack>
    </Box>;
}
