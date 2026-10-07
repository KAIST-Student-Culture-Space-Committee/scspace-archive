export interface PredictionFilters {
    matchId: string;
    userId: string;
    history: "all" | "latest";
    result: "all" | "pending" | "graded";
}

export const emptyPredictionFilters: PredictionFilters = {
    matchId: "",
    userId: "",
    history: "all",
    result: "all",
};

interface PredictionRow {
    id: number;
    matchId: number;
    userId: number;
    timeSubmit: string | Date | null;
    predictionResult: number | null;
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

    return sorted.filter((row) => {
        if (filters.matchId && row.matchId !== Number(filters.matchId)) return false;
        if (userId && (!/^\d+$/.test(userId) || row.userId !== Number(userId))) return false;

        // Choose the actual latest record before applying result filters.
        if (filters.history === "latest") {
            const key = `${row.matchId}:${row.userId}`;
            if (seen.has(key)) return false;
            seen.add(key);
        }

        if (filters.result === "pending") return row.predictionResult === null;
        if (filters.result === "graded") return row.predictionResult !== null;
        return true;
    });
}
