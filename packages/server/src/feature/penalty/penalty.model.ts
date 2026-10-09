import { Penalty } from '@schema';
import { InferSelectModel } from 'drizzle-orm';
import { IPenalty } from '@scspace-depot/types/penalty';
import { PenaltyStageEnum, PenaltyTargetEnum } from '@scspace-depot/enums/penalty.enum';
import { SpaceTypeEnum } from '@scspace-depot/enums/space.enum';

type PenaltyDBResult = InferSelectModel<typeof Penalty>;

export class MPenalty implements IPenalty {
    id: IPenalty['id'];
    targetType: IPenalty['targetType'];
    userId: IPenalty['userId'];
    organizationId: IPenalty['organizationId'];
    spaceType: IPenalty['spaceType'];
    notice: IPenalty['notice'];
    warning: IPenalty['warning'];
    noticeTotal: IPenalty['noticeTotal'];
    warningTotal: IPenalty['warningTotal'];
    converted: IPenalty['converted'];
    restrictionStage: IPenalty['restrictionStage'];
    restrictionEnd: IPenalty['restrictionEnd'];
    reason: IPenalty['reason'];
    issuerId: IPenalty['issuerId'];
    timeImpose: IPenalty['timeImpose'];

    constructor(penalty: IPenalty) {
        this.id = penalty.id;
        this.targetType = penalty.targetType;
        this.userId = penalty.userId;
        this.organizationId = penalty.organizationId;
        this.spaceType = penalty.spaceType;
        this.notice = penalty.notice;
        this.warning = penalty.warning;
        this.noticeTotal = penalty.noticeTotal;
        this.warningTotal = penalty.warningTotal;
        this.converted = penalty.converted;
        this.restrictionStage = penalty.restrictionStage;
        this.restrictionEnd = penalty.restrictionEnd;
        this.reason = penalty.reason;
        this.issuerId = penalty.issuerId;
        this.timeImpose = penalty.timeImpose;
    }

    static fromDB(penalty: PenaltyDBResult): IPenalty {
        return {
            id: penalty.id,
            targetType: penalty.targetType as PenaltyTargetEnum,
            userId: penalty.userId,
            organizationId: penalty.organizationId,
            spaceType: penalty.spaceType as SpaceTypeEnum,
            notice: penalty.notice,
            warning: penalty.warning,
            noticeTotal: penalty.noticeTotal,
            warningTotal: penalty.warningTotal,
            converted: penalty.converted,
            restrictionStage: penalty.restrictionStage as PenaltyStageEnum,
            restrictionEnd: penalty.restrictionEnd,
            reason: penalty.reason,
            issuerId: penalty.issuerId,
            timeImpose: penalty.timeImpose,
        };
    }
}
