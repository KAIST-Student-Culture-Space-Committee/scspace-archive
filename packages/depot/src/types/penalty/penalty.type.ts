import { PenaltyKindEnum, PenaltyStageEnum, PenaltyTargetEnum } from '../../enums/penalty.enum';
import { SpaceTypeEnum } from '../../enums/space.enum';
import { IOrganization } from '../organization';

export interface IPenaltyTarget {
    targetType: PenaltyTargetEnum;
    targetId: number;
}

export interface IPenaltyCount {
    notice: number;
    warning: number;
}

// Table: penalty
export interface IPenalty {
    id: number;
    targetType: PenaltyTargetEnum;
    userId: number | null;
    organizationId: number | null;
    spaceType: SpaceTypeEnum;
    notice: number;
    warning: number;
    noticeTotal: number;
    warningTotal: number;
    converted: boolean;
    restrictionStage: PenaltyStageEnum;
    restrictionEnd: number;
    reason: string;
    issuerId: number | null;
    timeImpose: number;
}

export interface IPenaltyRecord extends IPenalty {
    issuerName: string | null;
}

export interface IPenaltyCreate {
    targetType: PenaltyTargetEnum;
    targetId: number;
    spaceType: SpaceTypeEnum;
    kind: PenaltyKindEnum;
    reason: string;
}

// Current-cycle count + currently active restriction (0 when none).
export interface IPenaltySpaceState extends IPenaltyCount {
    spaceType: SpaceTypeEnum;
    restrictionStage: PenaltyStageEnum;
    restrictionEnd: number;
}

export interface IPenaltyDetail {
    target: IPenaltyTarget;
    cycleStart: number;
    spaces: IPenaltySpaceState[]; // always all PENALTY_SPACE_TYPES, in order
    history: IPenaltyRecord[]; // all cycles, newest first
}

export interface IPenaltyTargetSummary {
    target: IPenaltyTarget;
    name: string; // user nameKr or organization name
    studentNumber: number | null; // null for organizations
    spaces: IPenaltySpaceState[]; // only non-empty entries
}

export interface IPenaltyMy {
    user: IPenaltyDetail;
    organizations: { organization: IOrganization; detail: IPenaltyDetail }[];
}

export interface IPenaltyApplyResult {
    next: IPenaltyCount; // after conversion and stage-2 reset
    converted: boolean;
    stage: PenaltyStageEnum;
    restrictionDays: number; // 0, 30 or 90
}
