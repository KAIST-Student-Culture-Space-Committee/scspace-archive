import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IUser } from '@scspace-depot/types/user';
import {
    IMtLog,
    IMtResult,
    IMtSettings,
    IMtState,
    IMtStateResponse,
    MtHardMode,
    MtPhase,
    MtTimedPhase,
    MtTotChoice,
    MtTotOutcome,
} from '@scspace-depot/types/mt';
import {
    MT_DEFAULT_SETTINGS,
    MT_FIRST_NICKNAME_MAX,
    MT_LOG_LIMIT,
    MT_MISS_LOCK_MS,
    MT_NICKNAME_MAX,
    MT_OFFLINE_MS,
    MT_RENAME_EXTRA,
    MT_RETURN_LIMIT,
    MT_TRIAL_TRIM,
    mtCandyForHold,
    mtGraphemes,
} from '@scspace-depot/consts/mt.const';
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

interface Player {
    userId: number;
    name: string;
    nickname: string;
    lastSeenAt: number;
    online: boolean;
    banked: number;
    roundCandy: number;
    lockedUntil: number;
    explodeCount: number;
    totChoice: MtTotChoice | null;
    stealTargetId: number | null;
    trialVoteId: number | null;
}

const HARD_MODES: MtHardMode[] = ['PARTIAL', 'CHOSEONG', 'SHUFFLE', 'BLINK'];
const TIMED_PHASES: MtTimedPhase[] = ['ROUND_START', 'TOT_CHOOSE', 'TOT_STEAL', 'RENAME', 'TRIAL_VOTE'];
const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * In-memory MT game. State lives only in this instance (pm2 runs a single process);
 * a server restart wipes the game, so don't deploy during the MT.
 */
@Injectable()
export class MtService implements OnModuleInit, OnModuleDestroy {
    private settings: IMtSettings = structuredClone(MT_DEFAULT_SETTINGS);
    private players = new Map<number, Player>();
    private version = 0;
    private phase: MtPhase = 'LOBBY';
    private paused = false;
    private pausedAt = 0;
    private round = 0;
    private deadline: number | null = null;
    private timer: NodeJS.Timeout | null = null;
    private interval: NodeJS.Timeout | null = null;
    private hardMode: MtHardMode | null = null;
    private seed = 0;
    private holderId: number | null = null;
    private holdStartedAt: number | null = null;
    private holdingStartedAt: number | null = null;
    private lastFromId: number | null = null;
    private returnCounts = new Map<string, number>();
    private grudgeHolderId: number | null = null;
    private explosion: IMtState['explosion'] = null;
    private tot: { trickIds: number[]; outcome: MtTotOutcome } | null = null;
    private stealOrder: number[] = [];
    private renamedIds = new Set<number>();
    private logs: IMtLog[] = [];
    private logId = 0;
    private typos: string[] = [];

    onModuleInit() {
        this.interval = setInterval(() => this.heartbeat(), 1000);
    }

    onModuleDestroy() {
        if (this.interval) clearInterval(this.interval);
        if (this.timer) clearTimeout(this.timer);
    }

    // ---------- views ----------

    state(userId: number, since?: number): IMtStateResponse {
        const player = this.players.get(userId);
        if (player) {
            player.lastSeenAt = Date.now();
            if (!player.online) {
                player.online = true;
                this.bump();
            }
        }
        this.tick();
        if (since === this.version) return { changed: false };
        return this.view(userId);
    }

    adminState(): IMtState {
        this.tick();
        return this.view(null);
    }

    private view(viewerId: number | null): IMtState {
        const admin = viewerId === null;
        const hide = !admin && this.hardMode !== null && (this.phase === 'ROUND_START' || this.phase === 'HOLDING');
        const me = viewerId === null ? undefined : this.players.get(viewerId);
        const live = this.liveHold();
        return {
            changed: true,
            version: this.version,
            serverNow: Date.now(),
            phase: this.phase,
            paused: this.paused,
            round: this.round,
            totalRounds: this.settings.totalRounds,
            renameCost: this.settings.renameCost,
            treatCandy: this.settings.treatCandy,
            typoPenalty: this.settings.typoPenalty,
            survivalMultiplier: this.settings.survivalMultiplier,
            deadline: this.phase === 'HOLDING' ? null : this.deadline,
            hardMode: this.hardMode,
            holderId: this.holderId,
            holdStartedAt: this.holdStartedAt,
            holdingStartedAt: this.holdingStartedAt,
            grudgeHolderId: this.grudgeHolderId,
            players: [...this.players.values()].map((p) => ({
                userId: p.userId,
                nickname: hide && p.userId !== viewerId ? transformNickname(p.nickname, this.hardMode, this.seed + p.userId) : p.nickname,
                online: p.online,
                ...(admin && { name: p.name, candy: p.banked + p.roundCandy + (p.userId === this.holderId ? live : 0) }),
            })),
            me: me ? {
                userId: me.userId,
                nickname: me.nickname,
                candy: me.banked + me.roundCandy,
                lockedUntil: me.lockedUntil,
                totChoice: me.totChoice,
                stealTargetId: me.stealTargetId,
                renamed: this.renamedIds.has(me.userId),
                trialVoteId: me.trialVoteId,
            } : null,
            logs: this.logs.slice(-MT_LOG_LIMIT),
            explosion: this.explosion,
            tot: this.tot,
            result: this.phase === 'GAME_OVER' ? this.result() : null,
            ...(admin && {
                settings: this.settings,
                explodeAt: this.phase === 'HOLDING' ? this.deadline : null,
                totChoices: Object.fromEntries([...this.players.values()].filter((p) => p.totChoice).map((p) => [p.userId, p.totChoice])),
            }),
        };
    }

    private result(): IMtResult {
        return {
            players: rankByCandy([...this.players.values()].map((p) => ({
                userId: p.userId, nickname: p.nickname, candy: p.banked, explodeCount: p.explodeCount,
            }))),
            topTypos: topTypos(this.typos),
        };
    }

    // ---------- player actions ----------

    join(user: IUser, nickname: unknown) {
        this.requirePhase('LOBBY');
        const error = validateNickname(nickname, MT_FIRST_NICKNAME_MAX, this.otherNicknames(user.id));
        if (error) throw new BadRequestException(error);
        const existing = this.players.get(user.id);
        if (existing) existing.nickname = nickname as string;
        else this.players.set(user.id, this.newPlayer(user, nickname as string));
        this.bump();
    }

    pass(userId: number, text: unknown) {
        this.requirePhase('HOLDING');
        if (this.holderId !== userId) throw new BadRequestException('You are not holding the jack-o-lantern');
        if (typeof text !== 'string' || !text || text.length > 100) throw new BadRequestException('Invalid text');
        const me = this.players.get(userId);
        const now = Date.now();
        if (now < me.lockedUntil) throw new BadRequestException('Casting is locked');

        const target = [...this.players.values()].find((p) => p.userId !== userId && p.nickname === text);
        if (!target) {
            me.lockedUntil = now + MT_MISS_LOCK_MS;
            // banked, not round candy: the penalty must survive an explosion
            me.banked -= this.settings.typoPenalty;
            this.typos.push(text);
            this.log(`{a}의 "{q}" 주문이 빗나갔다! 🍬-${this.settings.typoPenalty}`, userId, undefined, text);
            this.bump();
            return { hit: false };
        }
        if (target.userId === this.lastFromId) {
            const key = returnKey(userId, target.userId);
            const count = this.returnCounts.get(key) ?? 0;
            if (count >= MT_RETURN_LIMIT) throw new BadRequestException('Return limit reached for this pair');
            this.returnCounts.set(key, count + 1);
        }
        this.passTo(target.userId, '🎃 {a} → {t}', userId);
        return { hit: true };
    }

    grudge(userId: number, targetId: unknown) {
        this.requirePhase('ROUND_START');
        if (this.grudgeHolderId !== userId) throw new BadRequestException('You have no grudge');
        const target = this.requireOther(userId, targetId);
        this.log('😈 {a}의 원한! {t}부터 시작', userId, target.userId);
        this.startHolding(target.userId);
    }

    chooseTot(userId: number, choice: unknown) {
        this.requirePhase('TOT_CHOOSE');
        if (choice !== 'TRICK' && choice !== 'TREAT') throw new BadRequestException('Invalid choice');
        this.requirePlayer(userId).totChoice = choice;
        this.bump();
    }

    chooseSteal(userId: number, targetId: unknown) {
        this.requirePhase('TOT_STEAL');
        if (!this.tot?.trickIds.includes(userId)) throw new BadRequestException('Only tricksters can steal');
        const target = this.requireOther(userId, targetId);
        if (mtGraphemes(target.nickname).length <= 1) throw new BadRequestException('Target nickname is too short');
        this.players.get(userId).stealTargetId = target.userId;
        if (!this.stealOrder.includes(userId)) this.stealOrder.push(userId);
        this.bump();
    }

    rename(userId: number, nickname: unknown) {
        this.requirePhase('RENAME');
        const me = this.requirePlayer(userId);
        if (me.banked < this.settings.renameCost) throw new BadRequestException('Not enough candy');
        if (this.renamedIds.has(userId)) throw new BadRequestException('Already renamed this round');
        if (nickname === me.nickname) throw new BadRequestException('Same as current nickname');
        const error = validateNickname(nickname, mtGraphemes(me.nickname).length + MT_RENAME_EXTRA, this.otherNicknames(userId));
        if (error) throw new BadRequestException(error);
        const oldNickname = me.nickname;
        me.banked -= this.settings.renameCost;
        me.nickname = nickname as string;
        this.renamedIds.add(userId);
        this.log('✍️ "{q}" → {a} 개명!', userId, undefined, oldNickname);
        this.bump();
    }

    voteTrial(userId: number, targetId: unknown) {
        this.requirePhase('TRIAL_VOTE');
        const me = this.requirePlayer(userId);
        me.trialVoteId = this.requireOther(userId, targetId).userId;
        this.bump();
    }

    // ---------- admin actions ----------

    start() {
        this.requirePhase('LOBBY');
        if (this.players.size < 2) throw new BadRequestException('At least two players are needed');
        this.startRound(1);
    }

    pause() {
        if (this.paused) throw new BadRequestException('Already paused');
        this.tick();
        this.paused = true;
        this.pausedAt = Date.now();
        if (this.timer) clearTimeout(this.timer);
        this.bump();
    }

    resume() {
        if (!this.paused) throw new BadRequestException('Not paused');
        const delta = Date.now() - this.pausedAt;
        const shift = (t: number | null) => (t === null ? null : t + delta);
        this.deadline = shift(this.deadline);
        this.holdStartedAt = shift(this.holdStartedAt);
        this.holdingStartedAt = shift(this.holdingStartedAt);
        for (const p of this.players.values()) if (p.lockedUntil > this.pausedAt) p.lockedUntil += delta;
        this.paused = false;
        this.schedule();
        this.bump();
    }

    next() {
        if (this.paused) throw new BadRequestException('Resume the game first');
        if (this.phase === 'GAME_OVER') throw new BadRequestException('The game is over');
        if (this.phase === 'LOBBY') return this.start();
        this.advance();
    }

    reset() {
        if (this.timer) clearTimeout(this.timer);
        const { settings, version } = this;
        Object.assign(this, new MtService(), { settings, version, interval: this.interval });
        this.bump();
    }

    updateSettings(body: unknown) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Invalid settings');
        const input = body as Partial<IMtSettings>;
        const next: IMtSettings = {
            ...this.settings,
            ...input,
            phaseSeconds: { ...this.settings.phaseSeconds, ...input.phaseSeconds },
            hardModes: { ...this.settings.hardModes, ...input.hardModes },
        };
        const int = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
        const numbers = [next.timerMin, next.timerMax, next.renameCost, next.trialEvery, next.totalRounds, ...Object.values(next.phaseSeconds)];
        if (!numbers.every((v) => int(v, 1, 3600)) || Object.keys(next.phaseSeconds).length !== TIMED_PHASES.length) {
            throw new BadRequestException('Numbers must be integers between 1 and 3600');
        }
        if (!int(next.typoPenalty, 0, 100) || !int(next.treatCandy, 0, 100)) {
            throw new BadRequestException('typoPenalty and treatCandy must be integers between 0 and 100');
        }
        if (!Number.isFinite(next.survivalMultiplier) || next.survivalMultiplier < 0 || next.survivalMultiplier > 10) {
            throw new BadRequestException('survivalMultiplier must be 0~10');
        }
        if (next.timerMax < next.timerMin) throw new BadRequestException('timerMax must be >= timerMin');
        if (!Number.isFinite(next.rouletteChance) || next.rouletteChance < 0 || next.rouletteChance > 100) {
            throw new BadRequestException('rouletteChance must be 0~100');
        }
        if (typeof next.hardMode !== 'boolean' || typeof next.roulette !== 'boolean' ||
            Object.keys(next.hardModes).length !== HARD_MODES.length ||
            !HARD_MODES.every((m) => typeof next.hardModes[m] === 'boolean')) {
            throw new BadRequestException('Toggles must be booleans');
        }
        if (!Array.isArray(next.drinks) || next.drinks.length > 30 ||
            !next.drinks.every((d) => typeof d === 'string' && d.trim() && d.length <= 20)) {
            throw new BadRequestException('Drinks must be up to 30 non-empty names');
        }
        this.settings = { ...next, drinks: next.drinks.map((d) => d.trim()) };
        this.bump();
    }

    editPlayer(userId: number, nickname: unknown) {
        const player = this.requirePlayer(userId);
        const error = validateNickname(nickname, MT_NICKNAME_MAX, this.otherNicknames(userId));
        if (error) throw new BadRequestException(error);
        player.nickname = nickname as string;
        this.bump();
    }

    kick(userId: number) {
        this.requirePlayer(userId);
        if (this.holderId === userId) {
            const others = [...this.players.values()].filter((p) => p.userId !== userId);
            const target = pickRandom(others.filter((p) => p.online).length ? others.filter((p) => p.online) : others);
            if (this.phase === 'HOLDING' && target) this.passTo(target.userId, '🚪 {a} 퇴장 → {t}', userId);
            else this.holderId = null;
        }
        this.players.delete(userId);
        if (this.lastFromId === userId) this.lastFromId = null;
        if (this.grudgeHolderId === userId) this.grudgeHolderId = null;
        this.renamedIds.delete(userId);
        this.stealOrder = this.stealOrder.filter((id) => id !== userId);
        this.bump();
    }

    // ---------- phase machine ----------

    private bump() {
        this.version++;
    }

    private log(text: string, actorId?: number, targetId?: number, quote?: string) {
        this.logs.push({ id: ++this.logId, at: Date.now(), text, actorId, targetId, quote });
        if (this.logs.length > MT_LOG_LIMIT * 2) this.logs = this.logs.slice(-MT_LOG_LIMIT);
    }

    /** Server-time judgement: anything past the deadline resolves before the request is handled. */
    private tick() {
        if (!this.paused && this.deadline !== null && Date.now() >= this.deadline) this.advance();
    }

    private schedule() {
        if (this.timer) clearTimeout(this.timer);
        if (!this.paused && this.deadline !== null) {
            this.timer = setTimeout(() => this.tick(), Math.max(0, this.deadline - Date.now()));
        }
    }

    private enter(phase: MtPhase, deadline: number | null) {
        this.phase = phase;
        this.deadline = deadline;
        this.schedule();
        this.bump();
    }

    private enterTimed(phase: MtTimedPhase) {
        this.enter(phase, Date.now() + this.settings.phaseSeconds[phase] * 1000);
    }

    private advance() {
        switch (this.phase) {
            case 'ROUND_START': {
                const ids = [...this.players.keys()];
                if (ids.length) this.startHolding(pickRandom(ids));
                else this.enter('LOBBY', null);
                return;
            }
            case 'HOLDING':
                return this.explode();
            case 'EXPLODED':
                for (const p of this.players.values()) p.totChoice = null;
                return this.enterTimed('TOT_CHOOSE');
            case 'TOT_CHOOSE':
                return this.resolveTot();
            case 'TOT_STEAL':
                this.resolveSteal();
                return this.enterTimed('RENAME');
            case 'RENAME':
                return this.afterRename();
            case 'TRIAL_VOTE':
                this.resolveTrial();
                return this.endRound();
        }
    }

    private startRound(round: number) {
        this.round = round;
        this.returnCounts.clear();
        this.lastFromId = null;
        this.holderId = null;
        this.holdStartedAt = null;
        this.holdingStartedAt = null;
        this.explosion = null;
        this.tot = null;
        this.stealOrder = [];
        this.renamedIds.clear();
        for (const p of this.players.values()) {
            Object.assign(p, { totChoice: null, stealTargetId: null, trialVoteId: null, lockedUntil: 0 });
        }
        if (this.grudgeHolderId !== null && !this.players.has(this.grudgeHolderId)) this.grudgeHolderId = null;
        const modes = HARD_MODES.filter((m) => this.settings.hardModes[m]);
        this.hardMode = this.settings.hardMode && modes.length ? pickRandom(modes) : null;
        this.seed = Math.floor(Math.random() * 2 ** 31);
        this.log(`🕯️ ${round}라운드 시작`);
        this.enterTimed('ROUND_START');
    }

    private startHolding(targetId: number) {
        const now = Date.now();
        this.grudgeHolderId = null;
        this.holderId = targetId;
        this.lastFromId = null;
        this.holdStartedAt = now;
        this.holdingStartedAt = now;
        const { min, max } = explodeRange([...this.players.values()].map((p) => p.nickname), this.settings.timerMin, this.settings.timerMax);
        this.log('🎃 {t}에게 잭오랜턴이!', undefined, targetId);
        this.enter('HOLDING', now + (min + Math.random() * (max - min)) * 1000);
    }

    private liveHold() {
        if (this.holdStartedAt === null) return 0;
        return mtCandyForHold((this.paused ? this.pausedAt : Date.now()) - this.holdStartedAt);
    }

    private passTo(targetId: number, text: string, fromId: number) {
        const holder = this.players.get(this.holderId);
        if (holder) holder.roundCandy += this.liveHold();
        this.lastFromId = fromId;
        this.holderId = targetId;
        this.holdStartedAt = Date.now();
        this.log(text, fromId, targetId);
        this.bump();
    }

    private explode() {
        const victim = this.players.get(this.holderId);
        for (const p of this.players.values()) {
            if (p !== victim) p.banked += p.roundCandy + survivalBonus(p.nickname, this.settings.survivalMultiplier);
            p.roundCandy = 0;
        }
        this.holderId = null;
        this.holdStartedAt = null;
        if (victim) {
            victim.explodeCount++;
            this.grudgeHolderId = victim.userId;
            const { roulette, rouletteChance, drinks } = this.settings;
            const drink = roulette && drinks.length && Math.random() * 100 < rouletteChance ? pickRandom(drinks) : null;
            this.explosion = { victimId: victim.userId, drink, drinks: drink ? drinks : [] };
            this.log(drink ? '💥 {a} 폭발! 룰렛 결과: {q}' : '💥 {a} 폭발! 한 잔!', victim.userId, undefined, drink ?? undefined);
        }
        this.log('🍬 생존자에게 이름 난이도만큼 사탕 지급');
        this.enter('EXPLODED', null);
    }

    private resolveTot() {
        const players = [...this.players.values()];
        const trickIds = players.filter((p) => p.totChoice === 'TRICK').map((p) => p.userId);
        const outcome = totOutcome(trickIds.length, players.length);
        for (const p of players) if (p.totChoice !== 'TRICK') p.banked += this.settings.treatCandy;
        if (outcome === 'CAUGHT') {
            for (const id of trickIds) {
                const p = this.players.get(id);
                this.tryRename(p, trimEnd(p.nickname, 1));
                this.log('🚨 {a} 장난이 들켰다! 한 잔 + 한 글자 삭제', id);
            }
        }
        this.tot = { trickIds, outcome };
        this.log(`🍬 Trick ${trickIds.length}명 / Treat ${players.length - trickIds.length}명`);
        if (outcome === 'STEAL') this.enterTimed('TOT_STEAL');
        else this.enterTimed('RENAME');
    }

    private resolveSteal() {
        for (const thiefId of this.stealOrder) {
            const thief = this.players.get(thiefId);
            const target = thief && this.players.get(thief.stealTargetId);
            if (!target) continue;
            const others = [...this.players.values()].filter((p) => p !== thief && p !== target).map((p) => p.nickname);
            const result = steal(thief.nickname, target.nickname, others);
            if (result) {
                thief.nickname = result.thief;
                target.nickname = result.target;
                this.log('🦇 {a}이(가) {t}의 이름을 훔쳤다!', thiefId, target.userId);
            } else {
                this.log('🦇 {a}의 이름 훔치기 실패', thiefId, target.userId);
            }
        }
    }

    private afterRename() {
        if (this.round % this.settings.trialEvery !== 0) return this.endRound();
        for (const p of this.players.values()) p.trialVoteId = null;
        this.enterTimed('TRIAL_VOTE');
    }

    private resolveTrial() {
        const targetId = trialTarget([...this.players.values()].map((p) => p.trialVoteId).filter((id) => this.players.has(id)));
        const target = this.players.get(targetId);
        if (!target) return this.log('⚖️ 마녀재판 동점, 무사 통과');
        this.tryRename(target, trimEnd(target.nickname, MT_TRIAL_TRIM));
        this.log('⚖️ 마녀재판! {t} 이름 세 글자 삭제 + 한 잔', undefined, target.userId);
    }

    private endRound() {
        if (this.round < this.settings.totalRounds) return this.startRound(this.round + 1);
        for (const king of this.result().players.filter((p) => p.rank === 1)) this.log('👑 게임 종료! 호박왕: {a}', king.userId);
        this.enter('GAME_OVER', null);
    }

    /** Skips a change that would duplicate someone's nickname, since passing needs unique names. */
    private tryRename(player: Player, nickname: string) {
        if (this.otherNicknames(player.userId).includes(nickname)) return false;
        player.nickname = nickname;
        return true;
    }

    private heartbeat() {
        const now = Date.now();
        for (const p of this.players.values()) {
            const online = now - p.lastSeenAt < MT_OFFLINE_MS;
            if (online !== p.online) {
                p.online = online;
                this.bump();
            }
        }
        this.tick();
        const holder = this.players.get(this.holderId);
        if (this.phase === 'HOLDING' && !this.paused && holder && !holder.online) {
            const candidates = [...this.players.values()].filter((p) => p.online && p !== holder);
            if (candidates.length) this.passTo(pickRandom(candidates).userId, '📵 {a} 연결 끊김 → {t}', holder.userId);
        }
    }

    // ---------- helpers ----------

    private newPlayer(user: IUser, nickname: string): Player {
        return {
            userId: user.id, name: user.nameKr, nickname, lastSeenAt: Date.now(), online: true,
            banked: 0, roundCandy: 0, lockedUntil: 0, explodeCount: 0, totChoice: null, stealTargetId: null, trialVoteId: null,
        };
    }

    private otherNicknames(userId: number) {
        return [...this.players.values()].filter((p) => p.userId !== userId).map((p) => p.nickname);
    }

    private requirePhase(phase: MtPhase) {
        this.tick();
        if (this.phase !== phase) throw new BadRequestException(`Not allowed in ${this.phase}`);
        if (this.paused && phase !== 'LOBBY') throw new BadRequestException('Game is paused');
    }

    private requirePlayer(userId: number) {
        const player = this.players.get(userId);
        if (!player) throw new BadRequestException('Not a player');
        return player;
    }

    private requireOther(userId: number, targetId: unknown) {
        this.requirePlayer(userId);
        if (targetId === userId) throw new BadRequestException('You cannot choose yourself');
        return this.requirePlayer(targetId as number);
    }
}
