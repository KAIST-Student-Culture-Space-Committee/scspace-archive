jest.mock(
    '@scspace-depot/consts/mt.const',
    () => jest.requireActual('../../../../depot/src/consts/mt.const'),
    { virtual: true },
);

import { mtCandyForHold, mtGraphemes, mtIsTypeable, mtTouchCount } from '@scspace-depot/consts/mt.const';
import {
    explodeRange,
    rankByCandy,
    returnKey,
    steal,
    survivalBonus,
    topTypos,
    totOutcome,
    transformNickname,
    trialTarget,
    trimEnd,
    validateNickname,
} from './mt.rules';

const ZERO_WIDTH = String.fromCharCode(0x200b);
const HANGUL_FILLER = String.fromCharCode(0x3164);
const NBSP = String.fromCharCode(0xa0);

describe('nickname graphemes and validation', () => {
    it('counts syllables, jamo and spaces as one each', () => {
        expect(mtGraphemes('최유 ㅅ')).toHaveLength(4);
    });
    it('accepts jamo, inner spaces, English, digits and keyboard symbols', () => {
        expect(validateNickname('ㅋㅋ 호박', 6, [])).toBeNull();
        expect(validateNickname('호박a1!', 6, [])).toBeNull();
    });
    it('rejects chars off the keyboard, untypeable jamo, edge spaces, duplicates and overlength', () => {
        for (const bad of ['호박🎃', `호${ZERO_WIDTH}박`, `호${HANGUL_FILLER}박`, `호${NBSP}박`, "호'박", '漢字']) {
            expect(validateNickname(bad, 6, [])).toMatch(/Only Korean/);
        }
        expect(validateNickname('ㄱㅏ', 6, [])).toMatch(/cannot be typed/);
        expect(validateNickname(' 호박', 6, [])).toMatch(/spaces/);
        expect(validateNickname('호박', 6, ['호박'])).toMatch(/taken/);
        expect(validateNickname('일이삼사오육칠', 6, [])).toMatch(/at most 6/);
        expect(validateNickname('가'.repeat(21), 30, [])).toMatch(/at most 20/);
        expect(validateNickname('', 6, [])).toMatch(/empty/);
    });
});

describe('keyboard model (iPhone 2-set QWERTY)', () => {
    it('counts touches: shift, compound jamo and page switches', () => {
        expect(mtTouchCount('호박')).toBe(5);
        expect(mtTouchCount('뷁')).toBe(5);
        expect(mtTouchCount('쀍')).toBe(6);
        expect(mtTouchCount('괜찮')).toBe(8);
        expect(mtTouchCount('가 나')).toBe(5);
        expect(mtTouchCount('호박a1')).toBe(9);
        expect(mtTouchCount('Ab!')).toBe(6);
        expect(mtTouchCount('1a')).toBe(5);
        expect(mtTouchCount('#')).toBe(3);
        expect(mtTouchCount('😀')).toBeNull();
    });
    it('knows which strings the IME can produce', () => {
        for (const ok of ['강아지', '괜찮아', 'ㅋㅋ', 'ㄱㅅ', 'ㅘ', '가ㄸ', 'a가1']) expect(mtIsTypeable(ok)).toBe(true);
        for (const bad of ['ㄱㅏ', '각ㅏ', '가ㄱ', '갈ㄱ', '고ㅏ', 'ㅗㅏ', '닭ㅏ']) expect(mtIsTypeable(bad)).toBe(false);
    });
    it('pays survival bonus by touch count', () => {
        expect(survivalBonus('호박', 1.5)).toBe(7);
    });
});

describe('timer and candy', () => {
    it('raises the range for long nicknames', () => {
        expect(explodeRange(['가'], 20, 60)).toEqual({ min: 20, max: 60 });
        expect(explodeRange(['가'.repeat(15)], 20, 60)).toEqual({ min: 45, max: 75 });
    });
    it('doubles candy after 10 continuous seconds', () => {
        expect(mtCandyForHold(9_999)).toBe(9);
        expect(mtCandyForHold(10_000)).toBe(10);
        expect(mtCandyForHold(13_000)).toBe(16);
    });
    it('uses one return counter for both directions', () => {
        expect(returnKey(3, 1)).toBe(returnKey(1, 3));
    });
});

describe('trick or treat', () => {
    it('splits outcomes for 7 players', () => {
        expect([0, 1, 2, 3, 4, 5, 7].map((t) => totOutcome(t, 7))).toEqual(['NONE', 'STEAL', 'STEAL', 'NONE', 'NONE', 'CAUGHT', 'CAUGHT']);
    });
    it('steals the last char, falling back to the previous one on collision', () => {
        expect(steal('호박', '유령이', [])).toEqual({ thief: '호박이', target: '유령' });
        expect(steal('호박', '유령이', ['호박이'])).toEqual({ thief: '호박령', target: '유이' });
        expect(steal('호박', '유령이', ['호박이', '호박령'])).toBeNull();
        expect(steal('호박', '유', [])).toBeNull();
    });
    it('only removes from the target when the thief is full', () => {
        expect(steal('가'.repeat(20), '유령', [])).toEqual({ thief: '가'.repeat(20), target: '유' });
    });
});

describe('trial and results', () => {
    it('trims three chars but keeps one', () => {
        expect(trimEnd('잭오랜턴호박', 3)).toBe('잭오랜');
        expect(trimEnd('잭오', 3)).toBe('잭');
    });
    it('picks a unique top vote, none on tie', () => {
        expect(trialTarget([1, 2, 1])).toBe(1);
        expect(trialTarget([1, 2])).toBeNull();
        expect(trialTarget([])).toBeNull();
    });
    it('ranks by candy with shared ranks on ties', () => {
        expect(rankByCandy([{ candy: 3 }, { candy: 9 }, { candy: 3 }, { candy: -2 }]).map((p) => [p.candy, p.rank]))
            .toEqual([[9, 1], [3, 2], [3, 2], [-2, 4]]);
    });
    it('ranks typos by frequency', () => {
        expect(topTypos(['a', 'b', 'a', 'c', 'b', 'a', 'd'])).toEqual([{ text: 'a', count: 3 }, { text: 'b', count: 2 }, { text: 'c', count: 1 }]);
    });
});

describe('hard mode', () => {
    it('masks, extracts choseong and shuffles deterministically', () => {
        expect(transformNickname('잭오랜턴호', 'PARTIAL', 1)).toBe('잭오랜●●');
        expect(transformNickname('최유성 A', 'CHOSEONG', 1)).toBe('ㅊㅇㅅ A');
        const shuffled = transformNickname('잭오랜턴호박', 'SHUFFLE', 42);
        expect(shuffled).toBe(transformNickname('잭오랜턴호박', 'SHUFFLE', 42));
        expect([...shuffled].sort()).toEqual([...'잭오랜턴호박'].sort());
        expect(transformNickname('호박', 'BLINK', 1)).toBe('호박');
    });
});
