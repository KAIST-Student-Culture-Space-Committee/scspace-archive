import { BadRequestException, Injectable } from '@nestjs/common';
import { IPenaltyTarget } from '@scspace-depot/types/penalty';
import { PenaltyTargetEnum } from '@scspace-depot/enums/penalty.enum';
import { SpaceTypeEnum } from '@scspace-depot/enums/space.enum';
import { PENALTY_SPACE_TYPE_LABEL } from '@scspace-depot/consts/penalty.const';
import { IndividualOrganizationId } from '@scspace-depot/consts/organization.const';
import { getNow, getString } from '@scspace-server/common/utils';
import { PenaltyRepository } from './penalty.repository';

@Injectable()
export class PenaltyPublicService {
    constructor(private readonly penaltyRepository: PenaltyRepository) { }

    async assertNotRestricted(target: IPenaltyTarget, spaceType: SpaceTypeEnum): Promise<void> {
        const now = getNow();
        const end = await this.penaltyRepository.fetchMaxActiveRestriction(target, spaceType, now);
        if (end !== null) {
            throw new BadRequestException(
                `Reservation for ${PENALTY_SPACE_TYPE_LABEL[spaceType].en} is restricted until ${getString(end)} due to a penalty.`,
            );
        }
    }

    async assertReservable(userId: number, organizationId: number, spaceType: SpaceTypeEnum): Promise<void> {
        const target: IPenaltyTarget =
            organizationId === IndividualOrganizationId
                ? { targetType: PenaltyTargetEnum.USER, targetId: userId }
                : { targetType: PenaltyTargetEnum.ORGANIZATION, targetId: organizationId };
        await this.assertNotRestricted(target, spaceType);
    }
}
