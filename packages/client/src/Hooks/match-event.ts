"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryApi } from "./api";
import { requestMatch } from "./match";
import type { IMatchAd, IMatchPrize } from "@scspace-depot/types/match";
import { ISuccessResponse } from "@scspace-depot/types/common";

export function useMatchAds() {
    return useQueryApi<{ status: string; data: IMatchAd[] }>("/match-event/ads");
}

export function useMatchPrizes() {
    return useQueryApi<{ status: string; data: IMatchPrize[] }>("/match-event/prizes");
}

export function useCreateMatchAd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (image: File) => {
            const form = new FormData();
            form.append("image", image);
            return requestMatch<ISuccessResponse & { id: number }>("/match-event/ads", "POST", { body: form });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/match-event/ads"] }),
    });
}

export function useDeleteMatchAd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => requestMatch<ISuccessResponse>(`/match-event/ads/${id}`, "DELETE"),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/match-event/ads"] }),
    });
}

export function useUpdateMatchPrize() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ place, name, nameEn, image }: { place: number; name: string; nameEn: string; image?: File | null }) => {
            const form = new FormData();
            form.append("name", name);
            form.append("nameEn", nameEn);
            if (image) form.append("image", image);
            return requestMatch<ISuccessResponse>(`/match-event/prizes/${place}`, "PUT", { body: form });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/match-event/prizes"] }),
    });
}
