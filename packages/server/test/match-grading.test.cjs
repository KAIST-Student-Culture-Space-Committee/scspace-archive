// Run from packages/server with ts-node/register/transpile-only and tsconfig-paths/register.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MySqlDialect } = require('drizzle-orm/mysql-core');
const { MatchInfo, MatchPrediction } = require('../src/db/schema/match');
const { MatchPredictionRepository } = require('../src/feature/match/match.prediction.repository');
const { MatchController } = require('../src/feature/match/match.controller');
const { AdminGuard } = require('../src/feature/auth/jwt/jwt.guard');
const { gradePrediction, isOutcomeCorrect, latestPredictions } = require('../src/feature/match/match.grading');
const { filterPredictions, emptyPredictionFilters } = require('../../client/src/Components/pages/Administration/MatchPredictions/filters');
const { buildMatchInfoUpdate } = require('../../client/src/Components/pages/Administration/MatchPredictions/match-info-form');

const scores = (firstScoreA, firstScoreB, secondScoreA, secondScoreB) => ({ firstScoreA, firstScoreB, secondScoreA, secondScoreB });
const unset = scores(null, null, null, null);
const first = scores(1, 0, null, null);
const final = scores(1, 0, 2, 1);
const match = (extra = {}) => ({ id: 1, matchName: 'Final', teamA: 'A', teamB: 'B', allowSubmission: false, ...first, ...extra });
const prediction = (id, extra = {}) => ({
    id, userId: id, matchId: 1, ...final, timeSubmit: new Date('2026-10-07T10:00:00Z'),
    predictionResult: null, correctScoreCount: null, scoreDiffAbs: null, isOutcomeCorrect: null, ...extra,
});

// Runs repository operations against a transactional in-memory store, using the
// actual Drizzle WHERE expressions to enforce IDs and test match isolation/rollback.
function fixture(matches = [match()], predictions = [prediction(1)], failUpdate = Infinity) {
    let state = structuredClone({ matches, predictions });
    const events = [];
    const dialect = new MySqlDialect();
    const repo = new MatchPredictionRepository({
        transaction: async (action) => {
            const draft = structuredClone(state);
            let updates = 0;
            const selectRows = (table, condition) => {
                const query = dialect.sqlToQuery(condition);
                const key = query.sql.includes('`match_id`') ? 'matchId' : 'id';
                const source = table === MatchInfo ? draft.matches : draft.predictions;
                return source.filter((row) => row[key] === query.params[0]);
            };
            const tx = {
                select: () => ({ from: (table) => ({ where: (condition) => ({
                    for: async (mode) => {
                        events.push(['lock', table === MatchInfo ? 'match' : 'predictions', mode]);
                        return structuredClone(selectRows(table, condition));
                    },
                }) }) }),
                update: (table) => ({ set: (values) => ({ where: async (condition) => {
                    if (++updates === failUpdate) throw new Error('simulated write failure');
                    const rows = selectRows(table, condition);
                    rows.forEach((row) => Object.assign(row, values));
                    events.push(['update', table === MatchInfo ? 'match' : 'predictions']);
                    return [{ affectedRows: rows.length }];
                } }) }),
            };
            try {
                await action(tx);
                state = draft;
                events.push(['commit']);
            } catch (error) {
                events.push(['rollback']);
                throw error;
            }
        },
    });
    return { repo, events, state: () => state };
}

test('no actual scores means ungraded; zero is a real score; only entered fields count', () => {
    assert.deepEqual(gradePrediction(final, unset), { correctScoreCount: null, scoreDiffAbs: null });
    assert.deepEqual(gradePrediction(final, first), { correctScoreCount: 2, scoreDiffAbs: 0 });
    assert.deepEqual(gradePrediction(final, scores(null, 0, null, null)), { correctScoreCount: 1, scoreDiffAbs: 0 });
    assert.deepEqual(gradePrediction(scores(0, 2, 4, 0), final), { correctScoreCount: 0, scoreDiffAbs: 6 });
});

test('final grading recomputes four values rather than adding previous grading', () => {
    assert.deepEqual(gradePrediction(final, final), { correctScoreCount: 4, scoreDiffAbs: 0 });
    assert.deepEqual(gradePrediction(final, scores(1, 0, 3, 1)), { correctScoreCount: 3, scoreDiffAbs: 1 });
});

test('outcome uses final cumulative scores when complete, otherwise a complete first pair', () => {
    const pred = scores(2, 0, 2, 3);
    assert.equal(isOutcomeCorrect(pred, scores(2, 0, null, null)), true);
    assert.equal(isOutcomeCorrect(pred, scores(2, 0, 2, 2)), false);
    assert.equal(isOutcomeCorrect(pred, scores(2, 0, 2, 3)), true);
    assert.equal(isOutcomeCorrect(pred, scores(2, null, null, null)), null);
    assert.equal(isOutcomeCorrect(scores(0, 0, 1, 1), scores(null, null, 2, 2)), true);
});

test('dedup uses user AND match, then time and ID to choose latest', () => {
    const rows = [prediction(1, { userId: 1 }), prediction(2, { userId: 1 }), prediction(3, { userId: 1, matchId: 2 })];
    assert.deepEqual(latestPredictions(rows).map((row) => row.id), [3, 2]);
    assert.equal(rows.length, 3);
});

test('apply grades only latest submissions of the selected match and is repeatable', async () => {
    const f = fixture([match(), match({ id: 2 })], [prediction(1), prediction(2, { userId: 1 }), prediction(3, { matchId: 2 })]);
    await f.repo.regradeMatch(1);
    const rows = f.state().predictions;
    assert.equal(rows[0].correctScoreCount, null);
    assert.deepEqual([rows[1].correctScoreCount, rows[1].scoreDiffAbs], [2, 0]);
    assert.equal(rows[2].correctScoreCount, null);
    assert.deepEqual(f.events.slice(0, 2), [['lock', 'match', 'update'], ['lock', 'predictions', 'update']]);
    const state = structuredClone(f.state());
    await f.repo.regradeMatch(1);
    assert.deepEqual(f.state(), state);
});

test('saving actual scores clears grades; explicit apply is required to recalculate', async () => {
    const f = fixture();
    await f.repo.regradeMatch(1);
    await f.repo.updateMatchInfo(1, { secondScoreA: 2, secondScoreB: 1 });
    assert.equal(f.state().predictions[0].correctScoreCount, null);
    assert.equal(f.state().predictions[0].scoreDiffAbs, null);
    await f.repo.regradeMatch(1);
    assert.equal(f.state().predictions[0].correctScoreCount, 4);
    await f.repo.updateMatchInfo(1, { secondScoreA: 3 });
    assert.equal(f.state().predictions[0].correctScoreCount, null);
    await f.repo.regradeMatch(1);
    assert.deepEqual([f.state().predictions[0].correctScoreCount, f.state().predictions[0].scoreDiffAbs], [3, 1]);
});

test('name edits and unchanged scores preserve grades; clearing scores cancels grades', async () => {
    const f = fixture();
    await f.repo.regradeMatch(1);
    await f.repo.updateMatchInfo(1, { matchName: 'Renamed', firstScoreA: 1 });
    assert.equal(f.state().predictions[0].correctScoreCount, 2);
    await f.repo.updateMatchInfo(1, unset);
    assert.equal(f.state().predictions[0].correctScoreCount, null);
    await f.repo.updateAllowSubmission(1, true);
    assert.equal(f.state().matches[0].allowSubmission, true);
});

test('open match, missing match and no actual scores cannot be graded', async () => {
    for (const [matches, status] of [[[match({ allowSubmission: true })], 400], [[], 404], [[match(unset)], 400]]) {
        const f = fixture(matches);
        await assert.rejects(f.repo.regradeMatch(1), (error) => error.getStatus() === status);
        assert.equal(f.events.some(([action]) => action === 'update'), false);
    }
});

test('actual scores cannot change while submissions are open or allow impossible final totals', async () => {
    const open = fixture([match({ ...unset, allowSubmission: true })]);
    await assert.rejects(open.repo.updateMatchInfo(1, first), (error) => error.getStatus() === 400);
    const closed = fixture([match(final)]);
    await assert.rejects(closed.repo.updateMatchInfo(1, { firstScoreA: 3 }), (error) => error.getStatus() === 400);
    await assert.rejects(closed.repo.updateAllowSubmission(1, true), (error) => error.getStatus() === 400);
});

test('grading failure rolls back cleared grades and partially written results', async () => {
    const f = fixture([match(final)], [prediction(1, { correctScoreCount: 2, scoreDiffAbs: 0 }), prediction(2)], 3);
    const before = structuredClone(f.state());
    await assert.rejects(f.repo.regradeMatch(1), /simulated write failure/);
    assert.deepEqual(f.state(), before);
});

test('failure to invalidate grades also rolls back actual score changes', async () => {
    const f = fixture([match()], [prediction(1, { correctScoreCount: 2, scoreDiffAbs: 0 })], 2);
    const before = structuredClone(f.state());
    await assert.rejects(f.repo.updateMatchInfo(1, { secondScoreA: 2 }), /simulated write failure/);
    assert.deepEqual(f.state(), before);
});

test('apply endpoint requires AdminGuard and delegates the match ID', async () => {
    assert.ok(Reflect.getMetadata('__guards__', MatchController.prototype.regradeMatch).includes(AdminGuard));
    const ids = [];
    const controller = new MatchController({ regradeMatch: async (id) => ids.push(id) });
    assert.deepEqual(await controller.regradeMatch(3), { success: true });
    assert.deepEqual(ids, [3]);
});

test('new and test submissions reject final score below first half', async () => {
    const controller = new MatchController({ insertTestPrediction: () => { throw new Error('must not write'); } });
    await assert.rejects(controller.createTestPrediction({ userId: 1, matchId: 1, ...scores(2, 0, 1, 0) }), (error) => error.getStatus() === 400);
});

test('form rejects impossible cumulative score before saving', () => {
    const draft = { matchName: 'M', teamA: 'A', teamB: 'B', firstScoreA: '2', firstScoreB: '0', secondScoreA: '1', secondScoreB: '0' };
    assert.throws(() => buildMatchInfoUpdate(draft, draft), /최종 누적/);
});

test('score sorting uses count, absolute error, outcome; ungraded rows come last', () => {
    const rows = [
        prediction(1),
        prediction(2, { correctScoreCount: 2, scoreDiffAbs: 0, isOutcomeCorrect: true }),
        prediction(3, { correctScoreCount: 3, scoreDiffAbs: 1, isOutcomeCorrect: false }),
        prediction(4, { correctScoreCount: 3, scoreDiffAbs: 1, isOutcomeCorrect: true }),
        prediction(5, { correctScoreCount: 3, scoreDiffAbs: 0, isOutcomeCorrect: true }),
        prediction(6, { correctScoreCount: 4, scoreDiffAbs: 0, isOutcomeCorrect: true }),
    ];
    const result = filterPredictions(rows, { ...emptyPredictionFilters, matchId: '1', sort: 'score' });
    assert.deepEqual(result.map((row) => row.id), [6, 5, 4, 3, 2, 1]);
    assert.deepEqual(rows.map((row) => row.id), [1, 2, 3, 4, 5, 6]);
});

test('latest submission is selected before grade filtering, zero is graded and matches never mix', () => {
    const rows = [prediction(1, { correctScoreCount: 4, scoreDiffAbs: 0 }), prediction(2, { userId: 1 }),
        prediction(3, { matchId: 2, correctScoreCount: 4, scoreDiffAbs: 0 }),
        prediction(4, { correctScoreCount: 0, scoreDiffAbs: 4 })];
    const filters = { ...emptyPredictionFilters, matchId: '1', sort: 'score', result: 'graded' };
    assert.deepEqual(filterPredictions(rows, filters).map((row) => row.id), [4]);
    assert.deepEqual(filterPredictions(rows, { ...filters, result: 'pending' }).map((row) => row.id), [2]);
});
