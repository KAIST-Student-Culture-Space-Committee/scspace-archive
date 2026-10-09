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
  '@scspace-server/common/utils',
  () => ({
    getNow: jest.fn(() => 1000),
    getString: jest.fn((time: number) => `T${time}`),
  }),
  { virtual: true },
);

import { BadRequestException } from '@nestjs/common';
import { PenaltyTargetEnum } from '../../../../depot/src/enums/penalty.enum';
import { SpaceTypeEnum } from '../../../../depot/src/enums/space.enum';
import { PenaltyPublicService } from './penalty.public.service';

describe('PenaltyPublicService', () => {
  const repository = {
    fetchMaxActiveRestriction: jest.fn(),
  };

  function service(): PenaltyPublicService {
    return new PenaltyPublicService(repository as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks the USER target when organizationId is the individual organization', async () => {
    repository.fetchMaxActiveRestriction.mockResolvedValue(null);

    await service().assertReservable(7, 1, SpaceTypeEnum.PIANO);

    expect(repository.fetchMaxActiveRestriction).toHaveBeenCalledWith(
      { targetType: PenaltyTargetEnum.USER, targetId: 7 },
      SpaceTypeEnum.PIANO,
      1000,
    );
  });

  it('checks the ORGANIZATION target otherwise, using the given organizationId', async () => {
    repository.fetchMaxActiveRestriction.mockResolvedValue(null);

    await service().assertReservable(7, 3, SpaceTypeEnum.SEMINAR);

    expect(repository.fetchMaxActiveRestriction).toHaveBeenCalledWith(
      { targetType: PenaltyTargetEnum.ORGANIZATION, targetId: 3 },
      SpaceTypeEnum.SEMINAR,
      1000,
    );
  });

  it('passes the given spaceType through unchanged', async () => {
    repository.fetchMaxActiveRestriction.mockResolvedValue(null);

    await service().assertNotRestricted({ targetType: PenaltyTargetEnum.USER, targetId: 7 }, SpaceTypeEnum.OPEN);

    expect(repository.fetchMaxActiveRestriction).toHaveBeenCalledWith(
      { targetType: PenaltyTargetEnum.USER, targetId: 7 },
      SpaceTypeEnum.OPEN,
      1000,
    );
  });

  it('throws when an active restriction exists', async () => {
    repository.fetchMaxActiveRestriction.mockResolvedValue(2000);

    await expect(service().assertReservable(7, 1, SpaceTypeEnum.PIANO)).rejects.toThrow(BadRequestException);
  });

  it('does not throw when there is no active restriction', async () => {
    repository.fetchMaxActiveRestriction.mockResolvedValue(null);

    await expect(service().assertReservable(7, 1, SpaceTypeEnum.PIANO)).resolves.toBeUndefined();
  });
});
