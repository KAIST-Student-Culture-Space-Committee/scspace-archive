jest.mock('./penalty.repository', () => ({ PenaltyRepository: class {} }));
jest.mock(
  '@scspace-depot/enums/penalty.enum',
  () => jest.requireActual('../../../../depot/src/enums/penalty.enum'),
  { virtual: true },
);
jest.mock(
  '@scspace-depot/enums/space.enum',
  () => jest.requireActual('../../../../depot/src/enums/space.enum'),
  { virtual: true },
);
jest.mock(
  '@scspace-depot/enums/mail.enum',
  () => jest.requireActual('../../../../depot/src/enums/mail.enum'),
  { virtual: true },
);
jest.mock(
  '@scspace-depot/consts/penalty.const',
  () => jest.requireActual('../../../../depot/src/consts/penalty.const'),
  { virtual: true },
);
jest.mock(
  '@scspace-depot/consts/organization.const',
  () => ({ IndividualOrganizationId: 1 }),
  { virtual: true },
);
jest.mock(
  '@scspace-depot/utils/penalty.utils',
  () => jest.requireActual('../../../../depot/src/utils/penalty.utils'),
  { virtual: true },
);
jest.mock(
  '@scspace-server/common/utils',
  () => ({
    getNow: jest.fn(),
    getString: jest.fn((time: number) => `T${time}`),
    addLegacyTimeDays: jest.fn((time: number, days: number) => time + days * 1440),
    getLegacyTimeAtEndOfDay: jest.fn((time: number) => time + 59),
  }),
  { virtual: true },
);
jest.mock(
  '@scspace-server/tools/mailer/mail.service',
  () => ({ MailService: class {} }),
  { virtual: true },
);
jest.mock(
  '@scspace-server/feature/user/user.public.service',
  () => ({ UserPublicService: class {} }),
  { virtual: true },
);
jest.mock(
  '@scspace-server/feature/organization/organization.public.service',
  () => ({ OrganizationPublicService: class {} }),
  { virtual: true },
);

import { BadRequestException } from '@nestjs/common';
import { getNow } from '@scspace-server/common/utils';
import { PenaltyKindEnum, PenaltyStageEnum, PenaltyTargetEnum } from '../../../../depot/src/enums/penalty.enum';
import { SpaceTypeEnum } from '../../../../depot/src/enums/space.enum';
import { PenaltyService } from './penalty.service';

describe('PenaltyService', () => {
  const repository = {
    transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
    lockTarget: jest.fn(),
    fetchById: jest.fn(),
    fetchByTarget: jest.fn(),
    fetchLatestInCycle: jest.fn(),
    fetchRange: jest.fn(),
    insert: jest.fn(),
    deleteById: jest.fn(),
    updateComputed: jest.fn(),
    fetchMaxActiveRestriction: jest.fn(),
    fetchForSummary: jest.fn(),
  };
  const userPublicService = {
    fetchById: jest.fn(),
    fetchAllByIds: jest.fn(),
  };
  const organizationPublicService = {
    fetchById: jest.fn(),
    fetchByIds: jest.fn(),
    fetchDeepById: jest.fn(),
    fetchByUserId: jest.fn(),
  };
  const mailService = {
    sendMail: jest.fn(),
    reportError: jest.fn(),
  };

  function service(): PenaltyService {
    return new PenaltyService(
      repository as never,
      userPublicService as never,
      organizationPublicService as never,
      mailService as never,
    );
  }

  const actor = { id: 42, nameKr: '매니저' };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn({}));
    (getNow as jest.Mock).mockReturnValue(1000);
    userPublicService.fetchById.mockResolvedValue({
      id: 5,
      nameKr: '테스트유저',
      email: 'test@example.com',
    });
    mailService.sendMail.mockResolvedValue(undefined);
    mailService.reportError.mockResolvedValue({ success: true });
  });

  describe('impose', () => {
    it('computes the conversion/stage/restrictionEnd from the latest cycle row and inserts it', async () => {
      repository.fetchLatestInCycle.mockResolvedValue({
        noticeTotal: 1,
        warningTotal: 0,
      });
      repository.insert.mockImplementation(async (_tx: unknown, values: Record<string, unknown>) => ({
        id: 99,
        ...values,
      }));

      const result = await service().impose(
        {
          targetType: PenaltyTargetEnum.USER,
          targetId: 5,
          spaceType: SpaceTypeEnum.PIANO,
          kind: PenaltyKindEnum.NOTICE,
          reason: 'Noisy practice',
        },
        actor as never,
      );

      expect(repository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          targetType: PenaltyTargetEnum.USER,
          userId: 5,
          organizationId: null,
          spaceType: SpaceTypeEnum.PIANO,
          notice: 1,
          warning: 0,
          noticeTotal: 0,
          warningTotal: 1,
          converted: true,
          restrictionStage: PenaltyStageEnum.FIRST,
          restrictionEnd: 1000 + 30 * 1440 + 59,
          reason: 'Noisy practice',
          issuerId: 42,
          timeImpose: 1000,
        }),
      );
      expect(result.id).toBe(99);
      expect(result.issuerName).toBe('매니저');
    });

    it('rejects an organization target of the individual organization', async () => {
      await expect(
        service().impose(
          {
            targetType: PenaltyTargetEnum.ORGANIZATION,
            targetId: 1,
            spaceType: SpaceTypeEnum.PIANO,
            kind: PenaltyKindEnum.NOTICE,
            reason: 'test',
          },
          actor as never,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('rejects a blank reason', async () => {
      await expect(
        service().impose(
          {
            targetType: PenaltyTargetEnum.USER,
            targetId: 5,
            spaceType: SpaceTypeEnum.PIANO,
            kind: PenaltyKindEnum.NOTICE,
            reason: '   ',
          },
          actor as never,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('returns the result even when the notification mail fails, and reports the error', async () => {
      repository.fetchLatestInCycle.mockResolvedValue(null);
      repository.insert.mockImplementation(async (_tx: unknown, values: Record<string, unknown>) => ({
        id: 100,
        ...values,
      }));
      mailService.sendMail.mockRejectedValue(new Error('SMTP down'));

      const result = await service().impose(
        {
          targetType: PenaltyTargetEnum.USER,
          targetId: 5,
          spaceType: SpaceTypeEnum.PIANO,
          kind: PenaltyKindEnum.NOTICE,
          reason: 'test',
        },
        actor as never,
      );

      expect(result.id).toBe(100);
      expect(mailService.reportError).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('recomputes the remaining warning,warning history down to a single FIRST-stage restriction', async () => {
      const deletedRow = {
        id: 1,
        targetType: PenaltyTargetEnum.USER,
        userId: 5,
        organizationId: null,
        spaceType: SpaceTypeEnum.PIANO,
        notice: 0,
        warning: 1,
        noticeTotal: 0,
        warningTotal: 1,
        converted: false,
        restrictionStage: PenaltyStageEnum.FIRST,
        restrictionEnd: 1_030_000,
        reason: 'first warning',
        issuerId: 42,
        timeImpose: 500,
      };
      const remainingRow = {
        id: 2,
        targetType: PenaltyTargetEnum.USER,
        userId: 5,
        organizationId: null,
        spaceType: SpaceTypeEnum.PIANO,
        notice: 0,
        warning: 1,
        noticeTotal: 0,
        warningTotal: 0,
        converted: false,
        restrictionStage: PenaltyStageEnum.SECOND,
        restrictionEnd: 1_090_000,
        reason: 'second warning',
        issuerId: 42,
        timeImpose: 600,
      };

      repository.fetchById.mockResolvedValue(deletedRow);
      repository.fetchRange.mockResolvedValue([remainingRow]);
      repository.fetchByTarget.mockResolvedValue([
        { ...remainingRow, noticeTotal: 0, warningTotal: 1, restrictionStage: PenaltyStageEnum.FIRST, restrictionEnd: 600 + 30 * 1440 + 59 },
      ]);

      await service().remove(1);

      expect(repository.deleteById).toHaveBeenCalledWith(expect.anything(), 1);
      expect(repository.updateComputed).toHaveBeenCalledWith(expect.anything(), 2, {
        noticeTotal: 0,
        warningTotal: 1,
        converted: false,
        restrictionStage: PenaltyStageEnum.FIRST,
        restrictionEnd: 600 + 30 * 1440 + 59,
      });
    });
  });
});
