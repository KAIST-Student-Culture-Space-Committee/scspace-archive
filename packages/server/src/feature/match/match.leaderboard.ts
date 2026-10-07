import type { IMatchLeaderboardPrediction, IMatchRankGroup } from '@scspace-depot/types/match';

export function rankPredictionGroups(rows: IMatchLeaderboardPrediction[]): IMatchRankGroup[] {
    const graded = rows.filter(row => row.correctScoreCount != null && row.scoreDiffAbs != null);
    graded.sort((a, b) => b.correctScoreCount! - a.correctScoreCount! ||
        a.scoreDiffAbs! - b.scoreDiffAbs! || Number(b.isOutcomeCorrect) - Number(a.isOutcomeCorrect));
    const groups: IMatchRankGroup[] = [];
    graded.forEach((row, index) => {
        const previous = groups[groups.length - 1];
        const first = previous?.predictions[0];
        const same = first && first.correctScoreCount === row.correctScoreCount &&
            first.scoreDiffAbs === row.scoreDiffAbs && first.isOutcomeCorrect === row.isOutcomeCorrect;
        if (same) { previous.positions.push(index + 1); previous.predictions.push(row); }
        else groups.push({ positions: [index + 1], predictions: [row] });
    });
    return groups;
}
