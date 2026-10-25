"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryApi } from "./api";
import { IMatchLeaderboard, IMatchInfo, IMatchInfoCreate, IMatchInfoUpdate, IMatchPrediction, IMatchPredictionCreate, IMatchPredictionWithInfo } from "@scspace-depot/types/match";
import { ISuccessResponse } from "@scspace-depot/types/common";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function requestMatch<ResponseType>(endpoint: string, method: "POST" | "PATCH" | "PUT" | "DELETE", init: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, { method, credentials: "include", ...init });
    if (!res.ok) {
        let msg = res.statusText;
        try { msg = (await res.json()).message || msg; } catch {}
        throw new Error(msg);
    }
    return res.json() as Promise<ResponseType>;
}

function requestMatchJson<ResponseType, RequestBody extends object>(
    endpoint: string,
    method: "POST" | "PATCH",
    body: RequestBody,
) {
    return requestMatch<ResponseType>(endpoint, method, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

export function matchImageUrl(filename: string) {
    return `${baseUrl}/uploads/${encodeURIComponent(filename)}`;
}

type MatchCreateInput = Omit<IMatchInfoCreate, "teamALogo" | "teamBLogo"> & { teamALogoFile: File; teamBLogoFile: File };

export function useMatchAPI() {
    const queryClient = useQueryClient();
    const allMatches = useQueryApi<{ status: string; data: IMatchInfo[] }>("/match");

    const invalidatePredictions = () => {
        queryClient.invalidateQueries({
            predicate: ({ queryKey }) => (
                typeof queryKey[0] === "string" &&
                queryKey[0].startsWith("/match/prediction")
            ),
        });
    };

    const createPredictionMutation = useMutation<ISuccessResponse, Error, IMatchPredictionCreate>({
        mutationFn: (data) => requestMatchJson<ISuccessResponse, IMatchPredictionCreate>("/match/prediction", "POST", data),
        onSuccess: invalidatePredictions,
    });

    return {
        allMatches,
        createPrediction: createPredictionMutation.mutate,
        isCreating: createPredictionMutation.isPending,
    };
}

export function useMatchPredictionAPI(userId?: number) {
    const enabled = typeof userId === "number" && userId > 0;
    const myPredictions = useQueryApi<{ status: string; data: IMatchPredictionWithInfo[] }>(
        `/match/prediction/${userId ?? 0}`,
        undefined,
        { enabled },
    );

    return {
        myPredictions,
    };
}

type MatchPredictionResponse = Omit<IMatchPrediction, "timeSubmit"> & {
    timeSubmit: string | null;
    phoneNumber?: string | null;
    userName: string | null;
    studentNumber: number | null;
    finalScoreCorrect: boolean | null;
    firstHalfScoreCorrect: boolean | null;
    isOutcomeCorrect: boolean | null;
    goalDiffError: number | null;
};

export function useAllMatchPredictions(enabled: boolean) {
    return useQueryApi<{ status: string; data: MatchPredictionResponse[] }>(
        "/match/predictions/admin",
        undefined,
        { enabled },
    );
}

export function useMatchSubmissionAdmin(enabled: boolean) {
    const queryClient = useQueryClient();
    const matches = useQueryApi<{ status: string; data: IMatchInfo[] }>(
        "/match", undefined, { enabled },
    );
    const updateSubmission = useMutation({
        mutationFn: ({ matchId, allowSubmission }: { matchId: number; allowSubmission: boolean }) =>
            requestMatchJson<ISuccessResponse, { allowSubmission: boolean }>(
                `/match/${matchId}/submission`, "PATCH", { allowSubmission },
            ),
        onSuccess: () => queryClient.invalidateQueries({
            predicate: ({ queryKey }) => typeof queryKey[0] === "string" &&
                (queryKey[0] === "/match" || queryKey[0].startsWith("/match/")),
        }),
    });
    return { matches, updateSubmission };
}

export function useCreateMatchInfo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ teamALogoFile, teamBLogoFile, ...data }: MatchCreateInput) => {
            const form = new FormData();
            form.append("matchName", data.matchName);
            form.append("teamA", data.teamA);
            form.append("teamB", data.teamB);
            form.append("startTime", String(data.startTime));
            form.append("teamALogo", teamALogoFile);
            form.append("teamBLogo", teamBLogoFile);
            return requestMatch<ISuccessResponse & { id: number }>("/match", "POST", { body: form });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/match"] }),
    });
}

export function useUpdateMatchLogos() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ matchId, teamALogoFile, teamBLogoFile }: { matchId: number; teamALogoFile?: File | null; teamBLogoFile?: File | null }) => {
            const form = new FormData();
            if (teamALogoFile) form.append("teamALogo", teamALogoFile);
            if (teamBLogoFile) form.append("teamBLogo", teamBLogoFile);
            return requestMatch<ISuccessResponse>(`/match/${matchId}/logos`, "PUT", { body: form });
        },
        onSuccess: () => queryClient.invalidateQueries({
            predicate: ({ queryKey }) => typeof queryKey[0] === "string" &&
                (queryKey[0] === "/match" || queryKey[0].startsWith("/match/")),
        }),
    });
}

export function useUpdateMatchInfo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ matchId, data }: { matchId: number; data: IMatchInfoUpdate }) =>
            requestMatchJson<ISuccessResponse, IMatchInfoUpdate>(`/match/${matchId}`, "PATCH", data),
        onSuccess: () => queryClient.invalidateQueries({
            predicate: ({ queryKey }) => typeof queryKey[0] === "string" &&
                (queryKey[0] === "/match" || queryKey[0].startsWith("/match/")),
        }),
    });
}

export function useCreateTestPrediction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<IMatchPredictionCreate, 'phoneNumber' | 'privacyConsent'> & { userId: number }) =>
            requestMatchJson<ISuccessResponse, typeof data>("/match/predictions/test", "POST", data),
        onSuccess: () => queryClient.invalidateQueries({
            predicate: ({ queryKey }) => typeof queryKey[0] === "string" && queryKey[0].startsWith("/match/prediction"),
        }),
    });
}

export function useApplyMatchGrading() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: number) => requestMatchJson<ISuccessResponse, object>(`/match/${matchId}/grade`, "POST", {}),
        onSuccess: () => queryClient.invalidateQueries({
            predicate: ({ queryKey }) => typeof queryKey[0] === "string" && queryKey[0].startsWith("/match/"),
        }),
    });
}

export function useMatchLeaderboard(matchId?: number) {
    return useQueryApi<{ status: string; data: IMatchLeaderboard }>(
        `/match/${matchId ?? 0}/leaderboard`, undefined,
        { enabled: matchId != null && matchId > 0 },
    );
}
