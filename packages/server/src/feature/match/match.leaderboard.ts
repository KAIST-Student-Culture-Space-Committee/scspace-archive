import type { IMatchLeaderboardPrediction, IMatchRankGroup } from '@scspace-depot/types/match';

// Ranking: final exact > first-half exact > outcome > goal-difference error > total score error.
export function compareRanking(a: IMatchLeaderboardPrediction, b: IMatchLeaderboardPrediction): number {
    return Number(b.finalScoreCorrect) - Number(a.finalScoreCorrect) ||
        Number(b.firstHalfScoreCorrect) - Number(a.firstHalfScoreCorrect) ||
        Number(b.isOutcomeCorrect) - Number(a.isOutcomeCorrect) ||
        (a.goalDiffError ?? Infinity) - (b.goalDiffError ?? Infinity) ||
        a.scoreDiffAbs! - b.scoreDiffAbs!;
}

export function rankPredictionGroups(rows: IMatchLeaderboardPrediction[]): IMatchRankGroup[] {
    const graded = rows.filter(row => row.correctScoreCount != null && row.scoreDiffAbs != null);
    // Tied players share a group; name order only fixes their display order, not their rank.
    graded.sort((a, b) => compareRanking(a, b) || a.userName.localeCompare(b.userName, 'ko') || a.id - b.id);
    const groups: IMatchRankGroup[] = [];
    graded.forEach((row, index) => {
        const previous = groups[groups.length - 1];
        const first = previous?.predictions[0];
        if (first && compareRanking(first, row) === 0) { previous.positions.push(index + 1); previous.predictions.push(row); }
        else groups.push({ positions: [index + 1], predictions: [row] });
    });
    return groups;
}
