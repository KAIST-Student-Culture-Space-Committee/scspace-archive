import { gradePrediction, rankingFields } from './match.grading';
import { rankPredictionGroups } from './match.leaderboard';

const actual = { firstScoreA: 1, firstScoreB: 0, secondScoreA: 2, secondScoreB: 1 };
const prediction = (id: number, first: [number, number], final: [number, number], userName = `Player ${id}`) => {
    const scores = { firstScoreA: first[0], firstScoreB: first[1], secondScoreA: final[0], secondScoreB: final[1] };
    const grades = gradePrediction(scores, actual);
    return { id, userId: id, userName, timeSubmit: null, ...scores, ...grades, ...rankingFields({ ...scores, ...grades }, actual) };
};

describe('leaderboard tie groups', () => {
    it('returns every tied player and every occupied position', () => {
        const rows = Array.from({ length: 12 }, (_, index) => prediction(index + 1, [1, 0], [2, 1]));
        const groups = rankPredictionGroups(rows);
        expect(groups).toHaveLength(1);
        expect(groups[0].predictions).toHaveLength(12);
        expect(groups[0].positions).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    });
    it('orders by final exact, first-half exact, outcome, goal-difference error, then total error', () => {
        const groups = rankPredictionGroups([
            prediction(6, [1, 0], [1, 1]), // first-half exact only, wrong outcome
            prediction(5, [0, 0], [4, 2]), // outcome right, goal diff error 1, total error 4
            prediction(4, [0, 0], [3, 2]), // outcome right, goal diff error 0, total error 3
            prediction(3, [1, 0], [3, 1]), // first-half exact, outcome right
            prediction(2, [0, 0], [2, 1]), // final exact
            prediction(1, [1, 0], [2, 1]), // both exact
            prediction(7, [0, 0], [1, 1]), // outcome wrong, closer by total error than 5
        ]);
        expect(groups.map(group => group.predictions[0].id)).toEqual([1, 2, 3, 6, 4, 5, 7]);
    });
    it('ranks a correct outcome above a closer wrong outcome', () => {
        const groups = rankPredictionGroups([prediction(1, [0, 0], [1, 1]), prediction(2, [0, 0], [5, 1])]);
        expect(groups.map(group => group.predictions[0].id)).toEqual([2, 1]);
    });
    it('lists tied players by name without changing their shared group', () => {
        const [group] = rankPredictionGroups([prediction(1, [0, 0], [3, 2], '하늘'), prediction(2, [0, 0], [3, 2], '가람')]);
        expect(group.predictions.map(row => row.id)).toEqual([2, 1]);
        expect(group.positions).toEqual([1, 2]);
    });
    it('does not publish a rank before grading', () => {
        const groups = rankPredictionGroups([{ ...prediction(1, [1, 0], [2, 1]), correctScoreCount: null, scoreDiffAbs: null }]);
        expect(groups).toEqual([]);
    });
});

describe('complete scoreline grading from the remote branch', () => {
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
