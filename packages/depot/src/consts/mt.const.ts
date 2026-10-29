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
export const MT_TREAT_CANDY = 5;
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
    phaseSeconds: { ROUND_START: 10, TOT_CHOOSE: 10, TOT_STEAL: 15, RENAME: 15, NAMING_VOTE: 10, TRIAL_VOTE: 20 },
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
    NAMING_VOTE: '명명식',
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
