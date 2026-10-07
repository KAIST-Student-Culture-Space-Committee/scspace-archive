export interface PredictionFilters {
    matchId: string;
    userId: string;
    history: "all" | "latest";
    result: "all" | "pending" | "graded";
    sort: "latest" | "score";
}

export const emptyPredictionFilters: PredictionFilters = {
    matchId: "",
    userId: "",
    history: "all",
    result: "all",
    sort: "latest",
};

interface PredictionRow {
    id: number;
    matchId: number;
    userId: number;
    timeSubmit: string | Date | null;
    correctScoreCount: number | null;
    scoreDiffAbs: number | null;
    finalScoreCorrect: boolean | null;
    firstHalfScoreCorrect: boolean | null;
    isOutcomeCorrect: boolean | null;
    goalDiffError: number | null;
}

function submittedAt(value: PredictionRow["timeSubmit"]) {
    const time = value === null ? NaN : new Date(value).getTime();
    return Number.isNaN(time) ? -Infinity : time;
}

export function filterPredictions<T extends PredictionRow>(rows: readonly T[], filters: PredictionFilters): T[] {
    const sorted = [...rows].sort((a, b) =>
        (submittedAt(b.timeSubmit) - submittedAt(a.timeSubmit)) || b.id - a.id,
    );
    const seen = new Set<string>();
    const userId = filters.userId.trim();

    const filtered = sorted.filter((row) => {
        if (filters.matchId && row.matchId !== Number(filters.matchId)) return false;
        if (userId && (!/^\d+$/.test(userId) || row.userId !== Number(userId))) return false;

        // Choose the actual latest record before applying result filters.
        if (filters.history === "latest" || (filters.sort === "score" && filters.matchId)) {
            const key = `${row.matchId}:${row.userId}`;
            if (seen.has(key)) return false;
            seen.add(key);
        }

        const graded = row.correctScoreCount != null && row.scoreDiffAbs != null;
        if (filters.result === "pending") return !graded;
        if (filters.result === "graded") return graded;
        return true;
    });
    if (filters.sort === "score" && filters.matchId) {
        filtered.sort((a, b) => {
            const aGraded = a.correctScoreCount != null && a.scoreDiffAbs != null;
            const bGraded = b.correctScoreCount != null && b.scoreDiffAbs != null;
            if (aGraded !== bGraded) return aGraded ? -1 : 1;
            if (!aGraded) return 0;
            // Keep in sync with server compareRanking (match.leaderboard.ts).
            return Number(b.finalScoreCorrect) - Number(a.finalScoreCorrect) ||
                Number(b.firstHalfScoreCorrect) - Number(a.firstHalfScoreCorrect) ||
                Number(b.isOutcomeCorrect) - Number(a.isOutcomeCorrect) ||
                (a.goalDiffError ?? Infinity) - (b.goalDiffError ?? Infinity) ||
                a.scoreDiffAbs! - b.scoreDiffAbs! || a.id - b.id;
        });
    }
    return filtered;
}
