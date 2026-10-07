import { gradePrediction } from './match.grading';
import { rankPredictionGroups } from './match.leaderboard';

const prediction = (id: number, correctScoreCount = 2, scoreDiffAbs = 1, isOutcomeCorrect: boolean | null = true) => ({
    id, userId: id, userName: `Player ${id}`, timeSubmit: null,
    firstScoreA: 1, firstScoreB: 0, secondScoreA: 2, secondScoreB: 1,
    correctScoreCount, scoreDiffAbs, isOutcomeCorrect,
});

describe('leaderboard tie groups', () => {
    it('returns every tied player and every occupied position without using submission time', () => {
        const rows = Array.from({ length: 12 }, (_, index) => prediction(index + 1));
        const groups = rankPredictionGroups(rows);
        expect(groups).toHaveLength(1);
        expect(groups[0].predictions).toHaveLength(12);
        expect(groups[0].positions).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    });
    it('orders groups by correct scores, absolute error, then match outcome', () => {
        const groups = rankPredictionGroups([prediction(4, 1, 0), prediction(3, 2, 2), prediction(2, 2, 1, false), prediction(1, 2, 1, true)]);
        expect(groups.map(group => group.predictions[0].id)).toEqual([1, 2, 3, 4]);
    });
    it('does not publish a rank before grading', () => {
        const groups = rankPredictionGroups([{ ...prediction(1), correctScoreCount: null, scoreDiffAbs: null }]);
        expect(groups).toEqual([]);
    });
});

describe('complete scoreline grading from the remote branch', () => {
    const actual = { firstScoreA: 1, firstScoreB: 0, secondScoreA: 2, secondScoreB: 1 };
    it('counts two fully correct periods as two hits', () => {
        expect(gradePrediction(actual, actual)).toEqual({ correctScoreCount: 2, scoreDiffAbs: 0 });
    });
    it('does not award a hit for only one correct team in a period', () => {
        expect(gradePrediction({ ...actual, secondScoreB: 2 }, actual)).toEqual({ correctScoreCount: 1, scoreDiffAbs: 1 });
    });
    it('compares partial actual scores for error without awarding an incomplete period hit', () => {
        expect(gradePrediction(actual, { ...actual, firstScoreB: null, secondScoreA: null, secondScoreB: null }))
            .toEqual({ correctScoreCount: 0, scoreDiffAbs: 0 });
    });
});
