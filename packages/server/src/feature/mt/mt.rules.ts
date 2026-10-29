import { MtHardMode, MtTotOutcome } from '@scspace-depot/types/mt';
import {
    MT_MIN_TIMER_SPAN,
    MT_NICKNAME_MAX,
    MT_SECONDS_PER_CHAR,
    MT_TRICK_CAUGHT_RATIO,
    MT_TRICK_STEAL_RATIO,
    mtGraphemes,
} from '@scspace-depot/consts/mt.const';

const EMOJI = /\p{Extended_Pictographic}/u;
// Control/format chars (zero-width etc.), Hangul fillers, and any whitespace other than a plain space.
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}ᅟᅠㅤﾠ]|[^\S ]/u;

/** Returns an English error message, or null when the nickname is acceptable. */
export function validateNickname(nickname: unknown, maxLength: number, others: string[]): string | null {
    if (typeof nickname !== 'string') return 'Nickname must be a string';
    const length = mtGraphemes(nickname).length;
    if (length < 1) return 'Nickname is empty';
    if (length > Math.min(maxLength, MT_NICKNAME_MAX)) return `Nickname must be at most ${Math.min(maxLength, MT_NICKNAME_MAX)} characters`;
    if (EMOJI.test(nickname)) return 'Emoji are not allowed';
    if (INVISIBLE.test(nickname)) return 'Invisible characters are not allowed';
    if (nickname !== nickname.trim()) return 'Leading or trailing spaces are not allowed';
    if (others.includes(nickname)) return 'Nickname already taken';
    return null;
}

export function explodeRange(nicknames: string[], timerMin: number, timerMax: number) {
    const avg = nicknames.length ? nicknames.reduce((sum, n) => sum + mtGraphemes(n).length, 0) / nicknames.length : 0;
    const min = Math.max(timerMin, avg * MT_SECONDS_PER_CHAR);
    const max = Math.max(timerMax, min + MT_MIN_TIMER_SPAN);
    return { min, max };
}

/** Same key for A→B and B→A. */
export function returnKey(a: number, b: number) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function totOutcome(trickCount: number, playerCount: number): MtTotOutcome {
    if (trickCount >= 1 && trickCount <= Math.round(playerCount * MT_TRICK_STEAL_RATIO)) return 'STEAL';
    if (trickCount >= Math.ceil(playerCount * MT_TRICK_CAUGHT_RATIO)) return 'CAUGHT';
    return 'NONE';
}

/**
 * Moves the target's last grapheme to the thief (or the one before it if that collides).
 * Collisions are checked for both resulting names so passing stays unambiguous. null = steal failed.
 */
export function steal(thief: string, target: string, others: string[]): { thief: string; target: string } | null {
    const t = mtGraphemes(target);
    if (t.length <= 1) return null;
    const thiefFull = mtGraphemes(thief).length >= MT_NICKNAME_MAX;
    for (const index of [t.length - 1, t.length - 2]) {
        if (index < 0) break;
        const nextTarget = t.filter((_, i) => i !== index).join('');
        const nextThief = thiefFull ? thief : thief + t[index];
        if (nextTarget === nextThief || others.includes(nextTarget) || others.includes(nextThief)) continue;
        return { thief: nextThief, target: nextTarget };
    }
    return null;
}

/** Drops up to `count` trailing graphemes, keeping at least one. */
export function trimEnd(nickname: string, count: number) {
    const g = mtGraphemes(nickname);
    return g.slice(0, Math.max(1, g.length - count)).join('');
}

/** Unique top vote-getter, or null on a tie / no votes. */
export function trialTarget(votes: Iterable<number>): number | null {
    const counts = new Map<number, number>();
    for (const id of votes) counts.set(id, (counts.get(id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    let tie = false;
    for (const [id, count] of counts) {
        if (count > bestCount) [best, bestCount, tie] = [id, count, false];
        else if (count === bestCount) tie = true;
    }
    return tie ? null : best;
}

const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

function mulberry32(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** BLINK is client-side, so it returns the original. */
export function transformNickname(nickname: string, mode: MtHardMode | null, seed: number): string {
    const g = mtGraphemes(nickname);
    switch (mode) {
        case 'PARTIAL': {
            const visible = Math.ceil(g.length / 2);
            return g.map((c, i) => (i < visible ? c : '●')).join('');
        }
        case 'CHOSEONG':
            return g.map((c) => {
                const code = c.charCodeAt(0) - 0xac00;
                return c.length === 1 && code >= 0 && code < 11172 ? CHOSEONG[Math.floor(code / 588)] : c;
            }).join('');
        case 'SHUFFLE': {
            const random = mulberry32(seed);
            for (let i = g.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [g[i], g[j]] = [g[j], g[i]];
            }
            return g.join('');
        }
        default:
            return nickname;
    }
}

/** Longest nickname wins, ties go to more candy. */
export function pickKing<T extends { nickname: string; candy: number }>(players: T[]): T | null {
    return players.reduce<T | null>((best, p) => {
        if (!best) return p;
        const diff = mtGraphemes(p.nickname).length - mtGraphemes(best.nickname).length;
        return diff > 0 || (diff === 0 && p.candy > best.candy) ? p : best;
    }, null);
}

export function topTypos(typos: string[], limit = 3) {
    const counts = new Map<string, number>();
    for (const t of typos) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
