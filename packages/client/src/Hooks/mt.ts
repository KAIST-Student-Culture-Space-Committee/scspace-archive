"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IMtLog, IMtPlayer, IMtState, IMtStateResponse } from "@scspace-depot/types/mt";
import { MT_ALLOW_GUEST } from "@scspace-depot/consts/mt.const";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { requestMatch } from "./match";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

let fallbackGuest = 0;

/** Per-tab guest id (sessionStorage), so several tabs act as different players while MT_ALLOW_GUEST is on. */
function guestId() {
    const random = () => String(1 + Math.floor(Math.random() * 1e9));
    try {
        const saved = sessionStorage.getItem("mtGuest");
        if (saved) return saved;
        const id = random();
        sessionStorage.setItem("mtGuest", id);
        return id;
    } catch {
        return String(fallbackGuest ||= Number(random()));
    }
}

function withGuest(endpoint: string) {
    return MT_ALLOW_GUEST ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}mtGuest=${guestId()}` : endpoint;
}

export type MtClientState = IMtState & { offset: number };

/** 500ms polling; unchanged versions answer `{ changed: false }` and keep the cached state. */
export function useMtState(admin: boolean, enabled: boolean) {
    const queryClient = useQueryClient();
    const path = admin ? "/mt/admin/state" : "/mt/state";
    return useQuery<MtClientState>({
        queryKey: [path],
        enabled,
        refetchInterval: 500,
        queryFn: async () => {
            const prev = queryClient.getQueryData<MtClientState>([path]);
            const res = await fetch(`${baseUrl}${withGuest(`${path}${prev && !admin ? `?since=${prev.version}` : ""}`)}`, { credentials: "include" });
            if (!res.ok) throw new Error(res.statusText);
            const data: IMtStateResponse = await res.json();
            if (!data.changed) return prev!;
            return { ...data, offset: data.serverNow - Date.now() };
        },
    });
}

export function useMtAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ endpoint, body, method = "POST" }: { endpoint: string; body?: object; method?: "POST" | "PATCH" | "DELETE" }) =>
            requestMatch<{ success: boolean; hit?: boolean }>(withGuest(endpoint), method, body ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            } : {}),
        onSuccess: () => queryClient.invalidateQueries({
            predicate: ({ queryKey }) => typeof queryKey[0] === "string" && queryKey[0].startsWith("/mt/"),
        }),
        onError: (error) => toaster.create({ type: "error", title: error.message }),
    });
}

/** Server-corrected clock that re-renders every `ms`. */
export function useMtNow(offset: number, ms = 200) {
    const [now, setNow] = useState(() => Date.now() + offset);
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now() + offset), ms);
        return () => clearInterval(id);
    }, [offset, ms]);
    return now;
}

export function mtLogText(log: IMtLog, players: IMtPlayer[]) {
    const name = (id?: number) => players.find((p) => p.userId === id)?.nickname ?? "???";
    return log.text.replace(/\{(a|t|q)\}/g, (_, key) => (key === "a" ? name(log.actorId) : key === "t" ? name(log.targetId) : log.quote ?? ""));
}
