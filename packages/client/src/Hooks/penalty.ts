"use client";

import { useQueryApi, useMutationApi } from "./api";
import {
    IPenaltyCreate,
    IPenaltyDetail,
    IPenaltyMy,
    IPenaltyRecord,
    IPenaltyTarget,
    IPenaltyTargetSummary,
} from "@scspace-depot/types/penalty";
import { PenaltyTargetEnum } from "@scspace-depot/enums/penalty.enum";

export function usePenaltyTargets(targetType: PenaltyTargetEnum) {
    return useQueryApi<IPenaltyTargetSummary[]>("/penalty/targets", { targetType });
}

export function usePenaltyDetail(target: IPenaltyTarget | null) {
    return useQueryApi<IPenaltyDetail>(target ? "/penalty/detail" : "", target ?? undefined);
}

export function useMyPenalty(enabled: boolean) {
    return useQueryApi<IPenaltyMy>(enabled ? "/penalty/me" : "");
}

export function usePenaltyAPI() {
    return {
        createPenalty: useMutationApi<IPenaltyRecord, IPenaltyCreate>("/penalty", "POST").mutateAsync,
    };
}
