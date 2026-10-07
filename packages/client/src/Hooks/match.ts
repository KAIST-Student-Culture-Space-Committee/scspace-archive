"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryApi } from "./api";
import { IMatchInfo, IMatchInfoCreate, IMatchInfoUpdate, IMatchPrediction, IMatchPredictionCreate, IMatchPredictionWithInfo } from "@scspace-depot/types/match";
import { ISuccessResponse } from "@scspace-depot/types/common";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function requestMatchJson<ResponseType, RequestBody extends object>(
    endpoint: string,
    method: "POST" | "PATCH",
    body: RequestBody,
) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        let msg = res.statusText;
        try { msg = (await res.json()).message || msg; } catch {}
        throw new Error(msg);
    }
    return res.json() as Promise<ResponseType>;
}

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
    isOutcomeCorrect: boolean | null;
};

export function useAllMatchPredictions(enabled: boolean) {
    return useQueryApi<{ status: string; data: MatchPredictionResponse[] }>(
        "/match/predictions",
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
        mutationFn: (data: IMatchInfoCreate) =>
            requestMatchJson<ISuccessResponse & { id: number }, IMatchInfoCreate>("/match", "POST", data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/match"] }),
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
        mutationFn: (data: IMatchPredictionCreate & { userId: number }) =>
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
