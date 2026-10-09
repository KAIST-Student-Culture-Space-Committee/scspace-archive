import { PenaltyKindEnum, PenaltyStageEnum } from '../../../../depot/src/enums/penalty.enum';
import { SpaceTypeEnum } from '../../../../depot/src/enums/space.enum';
import { PENALTY_SPACE_TYPE_LABEL, PENALTY_SPACE_TYPES } from '../../../../depot/src/consts/penalty.const';
import * as PenaltyUtils from '../../../../depot/src/utils/penalty.utils';

describe('penalty.utils', () => {
  describe('applyPenalty', () => {
    it('NOTICE on {0,0} adds a notice with no conversion', () => {
      const result = PenaltyUtils.applyPenalty({ notice: 0, warning: 0 }, PenaltyKindEnum.NOTICE);
      expect(result.next).toEqual({ notice: 1, warning: 0 });
      expect(result.converted).toBe(false);
      expect(result.stage).toBe(PenaltyStageEnum.NONE);
      expect(result.restrictionDays).toBe(0);
    });

    it('NOTICE on {1,0} converts into a warning and triggers a 30-day restriction', () => {
      const result = PenaltyUtils.applyPenalty({ notice: 1, warning: 0 }, PenaltyKindEnum.NOTICE);
      expect(result.next).toEqual({ notice: 0, warning: 1 });
      expect(result.converted).toBe(true);
      expect(result.stage).toBe(PenaltyStageEnum.FIRST);
      expect(result.restrictionDays).toBe(30);
    });

    it('WARNING on {0,0} triggers a 30-day restriction', () => {
      const result = PenaltyUtils.applyPenalty({ notice: 0, warning: 0 }, PenaltyKindEnum.WARNING);
      expect(result.next).toEqual({ notice: 0, warning: 1 });
      expect(result.converted).toBe(false);
      expect(result.stage).toBe(PenaltyStageEnum.FIRST);
      expect(result.restrictionDays).toBe(30);
    });

    it('WARNING on {0,1} triggers a 90-day restriction and resets warning to 0', () => {
      const result = PenaltyUtils.applyPenalty({ notice: 0, warning: 1 }, PenaltyKindEnum.WARNING);
      expect(result.next).toEqual({ notice: 0, warning: 0 });
      expect(result.converted).toBe(false);
      expect(result.stage).toBe(PenaltyStageEnum.SECOND);
      expect(result.restrictionDays).toBe(90);
    });

    it('NOTICE on {1,1} converts into a warning that then triggers a 90-day restriction', () => {
      const result = PenaltyUtils.applyPenalty({ notice: 1, warning: 1 }, PenaltyKindEnum.NOTICE);
      expect(result.next).toEqual({ notice: 0, warning: 0 });
      expect(result.converted).toBe(true);
      expect(result.stage).toBe(PenaltyStageEnum.SECOND);
      expect(result.restrictionDays).toBe(90);
    });

    it('WARNING on {1,0} keeps the existing notice', () => {
      const result = PenaltyUtils.applyPenalty({ notice: 1, warning: 0 }, PenaltyKindEnum.WARNING);
      expect(result.next).toEqual({ notice: 1, warning: 1 });
      expect(result.converted).toBe(false);
      expect(result.stage).toBe(PenaltyStageEnum.FIRST);
      expect(result.restrictionDays).toBe(30);
    });
  });

  describe('replayPenalties', () => {
    it('replays a sequence of kinds from {0,0} and reports each stage', () => {
      const results = PenaltyUtils.replayPenalties([
        PenaltyKindEnum.NOTICE,
        PenaltyKindEnum.WARNING,
        PenaltyKindEnum.WARNING,
        PenaltyKindEnum.NOTICE,
      ]);
      expect(results.map((r) => r.stage)).toEqual([
        PenaltyStageEnum.NONE,
        PenaltyStageEnum.FIRST,
        PenaltyStageEnum.SECOND,
        PenaltyStageEnum.FIRST,
      ]);
      expect(results[results.length - 1].next).toEqual({ notice: 0, warning: 1 });
    });
  });

  describe('getCycleRange', () => {
    const cycleStart = PenaltyUtils.toLegacyDate({ year: 2027, month: 3, day: 2 });

    it('is still in the previous cycle right before the registered start', () => {
      const beforeStart = (((2027 * 12 + 2) * 32 + 1) * 24 + 23) * 60 + 59; // 2027-03-01 23:59
      expect(PenaltyUtils.getCycleRange(beforeStart)).toEqual({ start: 0, end: cycleStart });
    });

    it('enters the new cycle exactly at the registered start', () => {
      expect(PenaltyUtils.getCycleRange(cycleStart)).toEqual({ start: cycleStart, end: null });
    });
  });

  describe('toLegacyDate', () => {
    it('encodes 00:00 of the given date using the legacy time formula', () => {
      expect(PenaltyUtils.toLegacyDate({ year: 2027, month: 3, day: 2 })).toBe(
        (((2027 * 12 + 2) * 32 + 2) * 24) * 60,
      );
    });
  });

  describe('PENALTY_SPACE_TYPES / PENALTY_SPACE_TYPE_LABEL', () => {
    it('covers every SpaceTypeEnum value exactly once, each with a kr/en label', () => {
      const allTypes = Object.values(SpaceTypeEnum).filter((v): v is SpaceTypeEnum => typeof v === 'number');

      expect(new Set(PENALTY_SPACE_TYPES).size).toBe(PENALTY_SPACE_TYPES.length);
      expect([...PENALTY_SPACE_TYPES].sort((a, b) => a - b)).toEqual([...allTypes].sort((a, b) => a - b));

      for (const type of PENALTY_SPACE_TYPES) {
        expect(PENALTY_SPACE_TYPE_LABEL[type]).toBeDefined();
        expect(typeof PENALTY_SPACE_TYPE_LABEL[type].kr).toBe('string');
        expect(typeof PENALTY_SPACE_TYPE_LABEL[type].en).toBe('string');
      }
    });
  });

  describe('buildSpaceStates', () => {
    it('excludes previous-cycle rows from accumulation but keeps their active restriction', () => {
      const now = PenaltyUtils.toLegacyDate({ year: 2027, month: 4, day: 1 });
      const previousCycleTime = PenaltyUtils.toLegacyDate({ year: 2027, month: 2, day: 1 });
      const activeRestrictionEnd = now + 1000;

      const rows: PenaltyUtils.IPenaltyStateRow[] = [
        {
          id: 1,
          spaceType: SpaceTypeEnum.INDIVIDUAL,
          noticeTotal: 1,
          warningTotal: 0,
          restrictionStage: PenaltyStageEnum.NONE,
          restrictionEnd: 0,
          timeImpose: previousCycleTime,
        },
        {
          id: 2,
          spaceType: SpaceTypeEnum.INDIVIDUAL,
          noticeTotal: 0,
          warningTotal: 1,
          restrictionStage: PenaltyStageEnum.FIRST,
          restrictionEnd: activeRestrictionEnd,
          timeImpose: previousCycleTime,
        },
      ];

      const [state] = PenaltyUtils.buildSpaceStates(rows, now, [SpaceTypeEnum.INDIVIDUAL]);

      expect(state).toEqual({
        spaceType: SpaceTypeEnum.INDIVIDUAL,
        notice: 0,
        warning: 0,
        restrictionStage: PenaltyStageEnum.FIRST,
        restrictionEnd: activeRestrictionEnd,
      });
    });
  });

  describe('isRestrictionActive', () => {
    const end = 123456;

    it('is active exactly at the restriction end', () => {
      expect(PenaltyUtils.isRestrictionActive(end, end)).toBe(true);
    });

    it('is no longer active right after the restriction end', () => {
      expect(PenaltyUtils.isRestrictionActive(end, end + 1)).toBe(false);
    });

    it('is never active when restrictionEnd is 0', () => {
      expect(PenaltyUtils.isRestrictionActive(0, end)).toBe(false);
    });
  });
});
