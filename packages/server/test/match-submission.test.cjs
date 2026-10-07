// Run from packages/server:
// node -r ts-node/register/transpile-only -r tsconfig-paths/register --test test/match-submission.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MatchPredictionRepository } = require('../src/feature/match/match.prediction.repository');
const { MatchController } = require('../src/feature/match/match.controller');
const { MatchInfo } = require('../src/db/schema/match');

const scores = { firstScoreA: 1, firstScoreB: 0, secondScoreA: 2, secondScoreB: 1 };
const input = { matchId: 1, userId: 7, ...scores };

function fixture(match) {
    const events = [];
    const tx = {
        select: () => ({ from: () => ({ where: () => ({
            for: async (mode) => { events.push(['lock', mode]); return match ? [match] : []; },
        }) }) }),
        insert: () => ({ values: async (data) => { events.push(['insert', data]); return [{ insertId: 9 }]; } }),
        update: () => ({ set: (data) => ({ where: async () => { events.push(['update', data]); } }) }),
    };
    const db = { transaction: async (action) => {
        events.push(['begin']);
        try {
            const result = await action(tx);
            events.push(['commit']);
            return result;
        } catch (error) {
            events.push(['rollback']);
            throw error;
        }
    } };
    return { repository: new MatchPredictionRepository(db), events };
}

test('matches default to submissions disabled and the flag is non-nullable', () => {
    assert.equal(MatchInfo.allowSubmission.default, false);
    assert.equal(MatchInfo.allowSubmission.notNull, true);
});

test('closed match rejects submission without inserting a prediction', async () => {
    const { repository, events } = fixture({ id: 1, allowSubmission: false });
    await assert.rejects(repository.insert(input), (error) => error.getStatus() === 403);
    assert.deepEqual(events, [['begin'], ['lock', 'update'], ['rollback']]);
});

test('open match inserts the prediction inside the locked transaction', async () => {
    const { repository, events } = fixture({ id: 1, allowSubmission: true });
    assert.deepEqual(await repository.insert(input), { insertId: 9 });
    assert.deepEqual(events, [['begin'], ['lock', 'update'], ['insert', input], ['commit']]);
});

test('missing match rejects submission with 404', async () => {
    const { repository, events } = fixture(null);
    await assert.rejects(repository.insert(input), (error) => error.getStatus() === 404);
    assert.equal(events.some(([action]) => action === 'insert'), false);
});

for (const allowSubmission of [true, false]) {
    test(`admin can set submission state to ${allowSubmission}`, async () => {
        const { repository, events } = fixture({ id: 1, allowSubmission: !allowSubmission });
        const controller = new MatchController(repository);
        assert.deepEqual(await controller.updateAllowSubmission(1, { allowSubmission }), { success: true });
        assert.deepEqual(events, [['begin'], ['lock', 'update'], ['update', { allowSubmission }], ['commit']]);
    });
}

test('admin update rejects a missing match', async () => {
    const { repository, events } = fixture(null);
    await assert.rejects(repository.updateAllowSubmission(1, true), (error) => error.getStatus() === 404);
    assert.equal(events.some(([action]) => action === 'update'), false);
});

test('invalid toggle bodies are rejected before querying the database', async () => {
    const { repository, events } = fixture({ id: 1, allowSubmission: false });
    const controller = new MatchController(repository);
    for (const body of [undefined, null, {}, { allowSubmission: 'false' }, { allowSubmission: 1 }]) {
        await assert.rejects(controller.updateAllowSubmission(1, body), (error) => error.getStatus() === 400);
    }
    assert.deepEqual(events, []);
});

test('both POST and PATCH enforce the closed-match rule', async () => {
    const { repository, events } = fixture({ id: 1, allowSubmission: false });
    repository.fetchPredictionById = async () => ({ id: 2, matchId: 1, userId: 7 });
    const controller = new MatchController(repository);
    controller.logger = { error() {} };
    const req = { user: { id: 7 } };
    await assert.rejects(controller.createPrediction(req, { matchId: 1, ...scores }), (error) => error.getStatus() === 403);
    await assert.rejects(controller.appendPredictionFromPatch(req, 2, scores), (error) => error.getStatus() === 403);
    assert.equal(events.some(([action]) => action === 'insert'), false);
});
