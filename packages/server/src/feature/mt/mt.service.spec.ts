jest.mock(
    '@scspace-depot/consts/mt.const',
    () => jest.requireActual('../../../../depot/src/consts/mt.const'),
    { virtual: true },
);

import { IMtState } from '@scspace-depot/types/mt';
import { MtService } from './mt.service';

const user = (id: number) => ({ id, nameKr: `user${id}` }) as any;

function setup(nicknames = ['호박', '유령', '마녀']) {
    const service = new MtService();
    nicknames.forEach((n, i) => service.join(user(i + 1), n));
    service.updateSettings({ totalRounds: 1, trialEvery: 1, timerMin: 20, timerMax: 20 });
    return service;
}

const view = (service: MtService, id: number) => service.state(id) as IMtState;

describe('MtService flow', () => {
    beforeEach(() => jest.useFakeTimers({ now: 1_000_000 }));
    afterEach(() => jest.useRealTimers());

    it('passes on exact match, locks on typo, limits returns', () => {
        const s = setup();
        s.start();
        s.next(); // ROUND_START -> random holder
        const holder = s.adminState().holderId;
        const nick = (id: number) => s.adminState().players.find((p) => p.userId === id).nickname;
        const other = [1, 2, 3].find((id) => id !== holder);

        expect(s.pass(holder, nick(other) + ' ')).toEqual({ hit: false });
        expect(() => s.pass(holder, nick(other))).toThrow(/locked/);
        jest.advanceTimersByTime(1500);
        expect(s.pass(holder, nick(other))).toEqual({ hit: true });

        // A→B→A→B→A: three returns between the same pair, the fourth is refused
        s.pass(other, nick(holder));
        s.pass(holder, nick(other));
        s.pass(other, nick(holder));
        expect(() => s.pass(holder, nick(other))).toThrow(/Return limit/);
    });

    it('banks candy for survivors and wipes the victim round candy', () => {
        const s = setup();
        s.start();
        s.next();
        const first = s.adminState().holderId;
        const nick = (id: number) => s.adminState().players.find((p) => p.userId === id).nickname;
        const second = [1, 2, 3].find((id) => id !== first);
        jest.advanceTimersByTime(5000);
        s.pass(first, nick(second));
        s.next(); // explode now
        const st = s.adminState();
        expect(st.phase).toBe('EXPLODED');
        expect(st.explosion.victimId).toBe(second);
        expect(st.grudgeHolderId).toBe(second);
        expect(st.players.find((p) => p.userId === first).candy).toBe(5);
        expect(st.players.find((p) => p.userId === second).candy).toBe(0);
    });

    it('hides original names from players in hard mode while holding', () => {
        const s = setup(['잭오랜턴', '유령신부', '마녀']);
        s.updateSettings({ hardMode: true, hardModes: { PARTIAL: true, CHOSEONG: false, SHUFFLE: false, BLINK: false } });
        s.start();
        const players = view(s, 1).players;
        expect(players.find((p) => p.userId === 1).nickname).toBe('잭오랜턴');
        expect(players.find((p) => p.userId === 2).nickname).toBe('유령●●');
        expect(JSON.stringify(view(s, 1))).not.toContain('유령신부');
    });

    it('runs a whole round through auto deadlines to game over', () => {
        const s = setup();
        s.start();
        jest.advanceTimersByTime(10_000); // ROUND_START
        expect(s.adminState().phase).toBe('HOLDING');
        jest.advanceTimersByTime(50_000); // range is 20~50s (max >= min + 30)
        expect(s.adminState().phase).toBe('EXPLODED');
        s.next();
        s.chooseTot(1, 'TRICK');
        jest.advanceTimersByTime(10_000);
        expect(s.adminState().tot).toEqual({ trickIds: [1], outcome: 'STEAL' });
        s.chooseSteal(1, 2);
        jest.advanceTimersByTime(15_000);
        expect(s.adminState().players.map((p) => p.nickname)).toEqual(['호박령', '유', '마녀']);
        jest.advanceTimersByTime(15_000); // RENAME, nobody renames -> TRIAL_VOTE
        expect(s.adminState().phase).toBe('TRIAL_VOTE');
        s.voteTrial(1, 3);
        s.voteTrial(2, 3);
        jest.advanceTimersByTime(20_000);
        const end = s.adminState();
        expect(end.phase).toBe('GAME_OVER');
        expect(end.players.find((p) => p.userId === 3).nickname).toBe('마');
        expect(end.result.kingId).toBe(1);
    });

    it('freezes the explosion timer while paused', () => {
        const s = setup();
        s.start();
        s.next();
        s.pause();
        jest.advanceTimersByTime(60_000);
        expect(s.adminState().phase).toBe('HOLDING');
        s.resume();
        jest.advanceTimersByTime(50_000);
        expect(s.adminState().phase).toBe('EXPLODED');
    });

    it('answers unchanged polls briefly', () => {
        const s = setup();
        const { version } = view(s, 1);
        expect(s.state(1, version)).toEqual({ changed: false });
    });
});
