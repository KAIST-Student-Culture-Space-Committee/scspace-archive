import { IMtSettings, MtHardMode, MtPhase } from '../types/mt/mt.type';

// shortcut: true lets anyone in without login (each browser tab becomes a guest player, admin API is open too); local testing only, never deploy with true.
export const MT_ALLOW_GUEST = false;

export const MT_FIRST_NICKNAME_MAX = 6;
export const MT_RENAME_EXTRA = 2;
export const MT_NICKNAME_MAX = 20;
export const MT_MISS_LOCK_MS = 1500;
export const MT_RETURN_LIMIT = 3;
export const MT_OFFLINE_MS = 5000;
export const MT_TRICK_STEAL_RATIO = 0.25;
export const MT_TRICK_CAUGHT_RATIO = 0.65;
export const MT_TRIAL_TRIM = 3;
export const MT_SECONDS_PER_CHAR = 3;
export const MT_MIN_TIMER_SPAN = 30;
export const MT_LOG_LIMIT = 40;

export const MT_DEFAULT_SETTINGS: IMtSettings = {
    timerMin: 20,
    timerMax: 60,
    renameCost: 30,
    trialEvery: 3,
    totalRounds: 10,
    typoPenalty: 2,
    treatCandy: 15,
    survivalMultiplier: 1,
    phaseSeconds: { ROUND_START: 10, TOT_CHOOSE: 10, TOT_STEAL: 15, RENAME: 15, TRIAL_VOTE: 20 },
    hardMode: false,
    hardModes: { PARTIAL: true, CHOSEONG: true, SHUFFLE: true, BLINK: true },
    roulette: false,
    rouletteChance: 30,
    drinks: ['콜라', '사이다', '맥주'],
};

export const MT_PHASE_LABEL: Record<MtPhase, string> = {
    LOBBY: '대기실',
    ROUND_START: '라운드 시작',
    HOLDING: '잭오랜턴 돌리기',
    EXPLODED: '💥 폭발',
    TOT_CHOOSE: 'Trick or Treat',
    TOT_STEAL: '이름 훔치기',
    RENAME: '개명',
    TRIAL_VOTE: '마녀재판',
    GAME_OVER: '게임 종료',
};

export const MT_HARD_MODE_LABEL: Record<MtHardMode, string> = {
    PARTIAL: '일부만 보기',
    CHOSEONG: '초성만 보기',
    SHUFFLE: '글자 섞기',
    BLINK: '깜빡이',
};

const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' });

/** Grapheme split shared by client truncation and server validation. */
export function mtGraphemes(text: string): string[] {
    return Array.from(segmenter.segment(text), (s) => s.segment);
}

/** 1/s for the first 10s of a continuous hold, 2/s after that. */
export function mtCandyForHold(ms: number): number {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return seconds <= 10 ? seconds : 10 + (seconds - 10) * 2;
}

// ---------- keyboard model: iPhone default Korean 2-set (dubeolsik) QWERTY ----------

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const COMPOUND: Record<string, string> = {
    'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
    'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
};
const MERGE = Object.fromEntries(Object.entries(COMPOUND).map(([whole, keys]) => [keys, whole]));
const SHIFTED = 'ㄲㄸㅃㅆㅉㅒㅖ';
// Quotes are left out on purpose: iOS smart punctuation turns ' and " into curly ones.
const NUM_PAGE = '1234567890-/:;()&@.,?!';
const SYM_PAGE = '[]{}#%^*+=_\\|~<>';

type Page = 'KO' | 'EN' | 'NUM' | 'SYM';

/** Key presses (jamo, not touches) needed to type the text; compound jamo split into their keys. */
function mtKeys(text: string): string[] {
    const split = (jamo: string) => [...(COMPOUND[jamo] ?? jamo)];
    return [...text].flatMap((ch) => {
        const code = ch.charCodeAt(0) - 0xac00;
        if (code < 0 || code >= 11172) return split(ch);
        return [...split(CHO[Math.floor(code / 588)]), ...split(JUNG[Math.floor((code % 588) / 28)]), ...(JONG[code % 28] ? split(JONG[code % 28]) : [])];
    });
}

/** What a standard 2-set IME produces from the key presses. */
function compose(keys: string[]): string {
    let out = '';
    let cho = '';
    let jung = '';
    let jong = '';
    const flush = () => {
        out += cho && jung ? String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong)) : cho + jung;
        cho = jung = jong = '';
    };
    for (const k of keys) {
        if (JUNG.includes(k)) {
            if (jong) {
                // the last final consonant moves to the next syllable: 각+ㅏ → 가가
                const parts = [...(COMPOUND[jong] ?? jong)];
                const moved = parts.pop()!;
                jong = parts[0] ?? '';
                flush();
                [cho, jung] = [moved, k];
            } else if (jung && MERGE[jung + k]) jung = MERGE[jung + k];
            else if (cho && !jung) jung = k;
            else {
                flush();
                jung = k;
            }
        } else if (CHO.includes(k)) {
            if (cho && jung && !jong && JONG.includes(k)) jong = k;
            else if (cho && jung && jong && MERGE[jong + k]) jong = MERGE[jong + k];
            else {
                flush();
                cho = k;
            }
        } else {
            flush();
            out += k;
        }
    }
    flush();
    return out;
}

/** False when the IME would merge the jamo differently (e.g. ㄱㅏ always becomes 가), so nobody can type it. */
export function mtIsTypeable(text: string): boolean {
    return compose(mtKeys(text)) === text;
}

/** Touches on the keyboard to type the text, or null when a character isn't on it. Starts on the Korean page. */
export function mtTouchCount(text: string): number | null {
    let page: Page = 'KO';
    let letters: Page = 'KO';
    let touches = 0;
    for (const k of mtKeys(text)) {
        const target: Page | null | undefined =
            k === ' ' ? null
            : CHO.includes(k) || JUNG.includes(k) ? 'KO'
            : /^[a-zA-Z]$/.test(k) ? 'EN'
            : NUM_PAGE.includes(k) ? 'NUM'
            : SYM_PAGE.includes(k) ? 'SYM'
            : undefined;
        if (target === undefined) return null;
        if (target && target !== page) {
            const fromLetters = page === 'KO' || page === 'EN';
            const toLetters = target === 'KO' || target === 'EN';
            // the 123/#+= pages return to the last letter page; reaching the other language costs one more
            touches += fromLetters && target === 'SYM' ? 2 : !fromLetters && toLetters && target !== letters ? 2 : 1;
            page = target;
            if (toLetters) letters = target;
        }
        touches += SHIFTED.includes(k) || /^[A-Z]$/.test(k) ? 2 : 1;
    }
    return touches;
}
