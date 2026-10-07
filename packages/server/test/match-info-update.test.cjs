// Run from packages/server with ts-node/register/transpile-only and tsconfig-paths/register.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MatchPredictionRepository } = require('../src/feature/match/match.prediction.repository');
const { MatchController } = require('../src/feature/match/match.controller');
const { AdminGuard } = require('../src/feature/auth/jwt/jwt.guard');
const { createMatchInfoDraft, buildMatchInfoUpdate } = require('../../client/src/Components/pages/Administration/MatchPredictions/match-info-form');

async function validateBody(body) {
    let update;
    const controller = new MatchController({ updateMatchInfo: async (_id, data) => { update = data; } });
    await controller.updateMatchInfo(1, body);
    return update;
}

test('partial update accepts trimmed names, zero scores and clearing scores', async () => {
    assert.deepEqual(await validateBody({ matchName: '  Final  ', firstScoreA: 0, secondScoreB: null }), {
        matchName: 'Final', firstScoreA: 0, secondScoreB: null,
    });
});

test('invalid bodies and non-editable fields are rejected', async () => {
    for (const body of [null, [], {}, { id: 2 }, { allowSubmission: true }, { phoneNumber: 'x' }]) {
        await assert.rejects(validateBody(body), (error) => error.getStatus() === 400);
    }
});

test('invalid names and scores are rejected', async () => {
    for (const body of [
        { matchName: ' ' }, { matchName: 'x'.repeat(256) }, { teamA: 'x'.repeat(101) }, { teamB: 2 },
        { firstScoreA: -1 }, { firstScoreB: 100 }, { secondScoreA: 1.5 }, { secondScoreB: '2' },
    ]) {
        await assert.rejects(validateBody(body), (error) => error.getStatus() === 400);
    }
});

test('removed match time cannot be written by an outdated client', async () => {
    await assert.rejects(validateBody({ matchTime: '2026-10-07T12:30:00Z' }), (error) => error.getStatus() === 400);
});

test('form only sends edited fields and preserves zero vs null', () => {
    const initial = createMatchInfoDraft({
        id: 1, matchName: 'Final', teamA: 'A', teamB: 'B', allowSubmission: true,
        firstScoreA: 0, firstScoreB: null, secondScoreA: 2, secondScoreB: null,
    });
    assert.equal('matchTime' in initial, false);
    assert.equal(initial.firstScoreA, '0');
    assert.equal(initial.firstScoreB, '');
    assert.deepEqual(buildMatchInfoUpdate(initial, { ...initial }), {});
    const update = buildMatchInfoUpdate(initial, { ...initial, firstScoreA: '', firstScoreB: '0' });
    assert.deepEqual(update, { firstScoreA: null, firstScoreB: 0 });
    assert.throws(() => buildMatchInfoUpdate(initial, { ...initial, secondScoreB: '1.5' }));
});

test('update route requires the existing admin guard', () => {
    assert.ok(Reflect.getMetadata('__guards__', MatchController.prototype.updateMatchInfo).includes(AdminGuard));
});

function repositoryFixture(exists) {
    const updates = [];
    const tx = {
        select: () => ({ from: () => ({ where: () => ({ for: async () => exists ? [{ id: 1 }] : [] }) }) }),
        update: () => ({ set: (data) => ({ where: async () => updates.push(data) }) }),
    };
    return { repository: new MatchPredictionRepository({ transaction: (fn) => fn(tx) }), updates };
}

test('controller updates only validated fields and accepts unchanged values', async () => {
    const { repository, updates } = repositoryFixture(true);
    const controller = new MatchController(repository);
    assert.deepEqual(await controller.updateMatchInfo(1, { teamA: ' A ', firstScoreA: null }), { success: true });
    assert.deepEqual(updates, [{ teamA: 'A', firstScoreA: null }]);
});

test('missing match returns 404 without updating', async () => {
    const { repository, updates } = repositoryFixture(false);
    await assert.rejects(repository.updateMatchInfo(99, { teamA: 'A' }), (error) => error.getStatus() === 404);
    assert.deepEqual(updates, []);
});
