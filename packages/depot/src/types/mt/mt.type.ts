export type MtPhase =
    | 'LOBBY'
    | 'ROUND_START'
    | 'HOLDING'
    | 'EXPLODED'
    | 'TOT_CHOOSE'
    | 'TOT_STEAL'
    | 'RENAME'
    | 'TRIAL_VOTE'
    | 'GAME_OVER';

export type MtTimedPhase = 'ROUND_START' | 'TOT_CHOOSE' | 'TOT_STEAL' | 'RENAME' | 'TRIAL_VOTE';
export type MtHardMode = 'PARTIAL' | 'CHOSEONG' | 'SHUFFLE' | 'BLINK';
export type MtTotChoice = 'TRICK' | 'TREAT';
export type MtTotOutcome = 'STEAL' | 'NONE' | 'CAUGHT';

export interface IMtSettings {
    timerMin: number;
    timerMax: number;
    renameCost: number;
    trialEvery: number;
    totalRounds: number;
    /** candy lost per typo */
    typoPenalty: number;
    treatCandy: number;
    /** survivors get floor(nickname touch count × this) candy per explosion */
    survivalMultiplier: number;
    phaseSeconds: Record<MtTimedPhase, number>;
    hardMode: boolean;
    hardModes: Record<MtHardMode, boolean>;
    /** server-side hard modes show the full names for `revealSeconds` out of every `revealEvery` seconds */
    revealEvery: number;
    revealSeconds: number;
    roulette: boolean;
    /** 0~100 (%) */
    rouletteChance: number;
    drinks: string[];
}

/** text may hold {a} (actor), {t} (target), {q} (quote) placeholders, rendered with each viewer's display names. */
export interface IMtLog {
    id: number;
    at: number;
    text: string;
    actorId?: number;
    targetId?: number;
    quote?: string;
}

export interface IMtPlayer {
    userId: number;
    /** Hard-mode transformed for other players while passing; always original for yourself and admin. */
    nickname: string;
    online: boolean;
    /** admin only */
    candy?: number;
    /** admin only */
    name?: string;
}

export interface IMtMe {
    userId: number;
    nickname: string;
    /** banked + this round, excluding the live hold (computed from holdStartedAt) */
    candy: number;
    lockedUntil: number;
    totChoice: MtTotChoice | null;
    stealTargetId: number | null;
    renamed: boolean;
    trialVoteId: number | null;
}

export interface IMtResult {
    /** Sorted by rank; ties share a rank. Rank k drinks k cups, rank 1 is the pumpkin king. */
    players: { userId: number; nickname: string; candy: number; explodeCount: number; rank: number }[];
    topTypos: { text: string; count: number }[];
}

export interface IMtState {
    changed: true;
    version: number;
    serverNow: number;
    phase: MtPhase;
    paused: boolean;
    round: number;
    totalRounds: number;
    renameCost: number;
    treatCandy: number;
    typoPenalty: number;
    survivalMultiplier: number;
    /** End of the current timed phase; null while HOLDING so the explosion time stays hidden. */
    deadline: number | null;
    hardMode: MtHardMode | null;
    /** true while the hard-mode names are temporarily shown in full */
    revealed: boolean;
    holderId: number | null;
    holdStartedAt: number | null;
    holdingStartedAt: number | null;
    grudgeHolderId: number | null;
    players: IMtPlayer[];
    me: IMtMe | null;
    logs: IMtLog[];
    explosion: { victimId: number; drink: string | null; drinks: string[] } | null;
    tot: { trickIds: number[]; outcome: MtTotOutcome } | null;
    result: IMtResult | null;
    /** admin only */
    settings?: IMtSettings;
    /** admin only */
    explodeAt?: number | null;
    /** admin only */
    totChoices?: Record<number, MtTotChoice>;
}

export type IMtStateResponse = IMtState | { changed: false };
