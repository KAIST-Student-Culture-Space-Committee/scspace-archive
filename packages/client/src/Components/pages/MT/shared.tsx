"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { IMtLog, IMtPlayer } from "@scspace-depot/types/mt";
import { mtLogText } from "@scspace-client/Hooks/mt";

export const mtColors = { background: "#120b1a", surface: "#22172e", text: "#f7f1ff", muted: "#a596b8", orange: "#ff7a1a", purple: "#8b5cf6", red: "#ef4444" };

export function PlayerButton({ player, selected, disabled, onClick }: {
    player: IMtPlayer; selected?: boolean; disabled?: boolean; onClick: () => void;
}) {
    return <Button h="52px" w="full" fontSize="18px" disabled={disabled} onClick={onClick}
        bg={selected ? mtColors.orange : mtColors.surface} color={selected ? "black" : mtColors.text}
        border="1px solid" borderColor={mtColors.orange}>
        {player.nickname}
    </Button>;
}

export function LogList({ logs, players }: { logs: IMtLog[]; players: IMtPlayer[] }) {
    return <Stack gap={1} bg={mtColors.surface} rounded="12px" p={3} maxH="200px" overflowY="auto">
        {logs.length === 0 && <Text color={mtColors.muted} fontSize="sm">아직 기록이 없어요</Text>}
        {[...logs].reverse().map((log) => (
            <Text key={log.id} fontSize="sm" color={mtColors.text} wordBreak="break-all">{mtLogText(log, players)}</Text>
        ))}
    </Stack>;
}

/** Spins through drinks and lands on the server-picked result. */
export function Roulette({ drinks, result }: { drinks: string[]; result: string }) {
    const [index, setIndex] = useState(0);
    const [done, setDone] = useState(false);
    useEffect(() => {
        let delay = 60;
        let timer: ReturnType<typeof setTimeout>;
        const step = () => {
            setIndex((i) => i + 1);
            delay *= 1.15;
            if (delay > 400) setDone(true);
            else timer = setTimeout(step, delay);
        };
        timer = setTimeout(step, delay);
        return () => clearTimeout(timer);
    }, []);
    return <Box textAlign="center" p={4} rounded="16px" border="3px solid" borderColor={mtColors.purple} bg={mtColors.surface}>
        <Text color={mtColors.muted}>🎰 음료 룰렛</Text>
        <Text fontSize="40px" fontWeight="black" color={done ? mtColors.orange : mtColors.text}>
            {done ? result : drinks[index % drinks.length]}
        </Text>
    </Box>;
}

let audio: AudioContext | null = null;

/** iOS only plays audio from a context created during a user gesture. */
export function unlockAudio() {
    try {
        audio ??= new AudioContext();
        if (audio.state === "suspended") audio.resume();
    } catch { /* unsupported */ }
}

export function boom() {
    navigator.vibrate?.([400, 100, 400]);
    if (!audio) return;
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start();
}
