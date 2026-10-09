import { NOTICES_PER_WARNING, PENALTY_RESTRICTION_DAYS, PENALTY_SPACE_TYPES, SPRING_SEMESTER_START_DATES } from '../consts/penalty.const';
import { PenaltyKindEnum, PenaltyStageEnum } from '../enums/penalty.enum';
import { SpaceTypeEnum } from '../enums/space.enum';
import { IPenalty, IPenaltyApplyResult, IPenaltyCount, IPenaltySpaceState } from '../types/penalty/penalty.type';

export interface IPenaltyLegacyDate {
    year: number;
    month: number; // 1-based
    day: number;
}

export type IPenaltyStateRow = Pick<
    IPenalty,
    'id' | 'spaceType' | 'noticeTotal' | 'warningTotal' | 'restrictionStage' | 'restrictionEnd' | 'timeImpose'
>;

// Legacy time at 00:00 of the given date. month is 1-based.
export const toLegacyDate = ({ year, month, day }: IPenaltyLegacyDate): number =>
    ((year * 12 + (month - 1)) * 32 + day) * 24 * 60;

// The cycle containing `time`: start = latest registered spring-semester start <= time (0 if none),
// end = earliest registered spring-semester start > time (null if none).
export const getCycleRange = (time: number): { start: number; end: number | null } => {
    const starts = SPRING_SEMESTER_START_DATES.map(toLegacyDate).sort((a, b) => a - b);

    let start = 0;
    let end: number | null = null;
    for (const s of starts) {
        if (s <= time) {
            start = s;
        } else if (end === null) {
            end = s;
        }
    }
    return { start, end };
};

export const getPenaltyKind = (row: { notice: number; warning: number }): PenaltyKindEnum =>
    row.notice === 1 ? PenaltyKindEnum.NOTICE : PenaltyKindEnum.WARNING;

// Core accumulation algorithm: 2 notices convert into 1 warning; 1 warning => 30-day restriction;
// 2nd warning => 90-day restriction and resets warning to 0 (notice is kept).
export const applyPenalty = (current: IPenaltyCount, kind: PenaltyKindEnum): IPenaltyApplyResult => {
    let { notice, warning } = current;
    let converted = false;
    let warningAdded = false;

    if (kind === PenaltyKindEnum.NOTICE) {
        notice += 1;
        if (notice >= NOTICES_PER_WARNING) {
            notice -= NOTICES_PER_WARNING;
            warning += 1;
            converted = true;
            warningAdded = true;
        }
    } else {
        warning += 1;
        warningAdded = true;
    }

    let stage = PenaltyStageEnum.NONE;
    if (warningAdded) {
        if (warning >= 2) {
            stage = PenaltyStageEnum.SECOND;
            warning = 0; // notice is kept
        } else if (warning === 1) {
            stage = PenaltyStageEnum.FIRST;
        }
    }

    const restrictionDays = stage === PenaltyStageEnum.NONE ? 0 : PENALTY_RESTRICTION_DAYS[stage];

    return {
        next: { notice, warning },
        converted,
        stage,
        restrictionDays,
    };
};

// Applies each kind in order starting from {0, 0}. Used to recompute history after a deletion.
export const replayPenalties = (kinds: PenaltyKindEnum[]): IPenaltyApplyResult[] => {
    let current: IPenaltyCount = { notice: 0, warning: 0 };
    const results: IPenaltyApplyResult[] = [];

    for (const kind of kinds) {
        const result = applyPenalty(current, kind);
        results.push(result);
        current = result.next;
    }

    return results;
};

export const isRestrictionActive = (restrictionEnd: number, now: number): boolean =>
    restrictionEnd > 0 && restrictionEnd >= now;

// Per-spaceType state for a target: current-cycle accumulation + the currently active restriction
// (restriction lookup ignores the cycle boundary; overlapping restrictions keep the latest end).
export const buildSpaceStates = (
    rows: IPenaltyStateRow[],
    now: number,
    spaceTypes: SpaceTypeEnum[] = PENALTY_SPACE_TYPES,
): IPenaltySpaceState[] => {
    const cycleStart = getCycleRange(now).start;

    return spaceTypes.map((spaceType) => {
        const spaceRows = rows.filter((row) => row.spaceType === spaceType);

        const accumulationRow = spaceRows
            .filter((row) => row.timeImpose >= cycleStart)
            .reduce<IPenaltyStateRow | null>((latest, row) => {
                if (!latest) return row;
                if (row.timeImpose !== latest.timeImpose) {
                    return row.timeImpose > latest.timeImpose ? row : latest;
                }
                return row.id > latest.id ? row : latest;
            }, null);

        const restrictionRow = spaceRows
            .filter((row) => isRestrictionActive(row.restrictionEnd, now))
            .reduce<IPenaltyStateRow | null>((latest, row) => {
                if (!latest) return row;
                return row.restrictionEnd > latest.restrictionEnd ? row : latest;
            }, null);

        return {
            spaceType,
            notice: accumulationRow?.noticeTotal ?? 0,
            warning: accumulationRow?.warningTotal ?? 0,
            restrictionStage: restrictionRow?.restrictionStage ?? PenaltyStageEnum.NONE,
            restrictionEnd: restrictionRow?.restrictionEnd ?? 0,
        };
    });
};
