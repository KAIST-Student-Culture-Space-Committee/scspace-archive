jest.mock(
    '@scspace-depot/consts/mt.const',
    () => jest.requireActual('../../../../depot/src/consts/mt.const'),
    { virtual: true },
);

import { IMtState } from '@scspace-depot/types/mt';
import { mtTouchCount } from '@scspace-depot/consts/mt.const';
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
        expect(s.adminState().players.find((p) => p.userId === holder).candy).toBe(-2); // typo penalty
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
        // 5s of holding + survival bonus (touch count × 1); the victim loses round candy and gets no bonus
        expect(st.players.find((p) => p.userId === first).candy).toBe(5 + mtTouchCount(nick(first)));
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
        const before = s.adminState().players.map((p) => p.candy);
        jest.advanceTimersByTime(10_000);
        expect(s.adminState().tot).toEqual({ trickIds: [1], outcome: 'STEAL' });
        expect(s.adminState().players.map((p, i) => p.candy - before[i])).toEqual([0, 15, 15]); // treat
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
        const ranked = end.result.players;
        expect(ranked[0].rank).toBe(1);
        expect(ranked.every((p, i) => i === 0 || (p.candy <= ranked[i - 1].candy && p.rank >= ranked[i - 1].rank))).toBe(true);
    });

    it('renames immediately for candy, once per round', () => {
        const s = setup();
        s.updateSettings({ renameCost: 1, survivalMultiplier: 0 });
        s.start();
        s.next();
        const victim = s.adminState().holderId;
        const rich = [1, 2, 3].find((id) => id !== victim);
        jest.advanceTimersByTime(3000);
        s.next(); // explode: everyone else banks a little via treat below
        s.next(); // TOT_CHOOSE
        s.next(); // all treat (+15) -> RENAME
        expect(s.adminState().phase).toBe('RENAME');
        expect(() => s.rename(rich, 'ㄱㅏ')).toThrow(/cannot be typed/);
        s.rename(rich, '새이름');
        const me = view(s, rich).me;
        expect(me.nickname).toBe('새이름');
        expect(me.renamed).toBe(true);
        expect(me.candy).toBe(14);
        expect(() => s.rename(rich, '또바꿈')).toThrow(/Already renamed/);
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
