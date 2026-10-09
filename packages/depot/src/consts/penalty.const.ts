import { SpaceTypeEnum } from '../enums/space.enum';
import { PenaltyStageEnum } from '../enums/penalty.enum';

export const NOTICES_PER_WARNING = 2;

export const PENALTY_RESTRICTION_DAYS: Record<PenaltyStageEnum.FIRST | PenaltyStageEnum.SECOND, number> = {
    [PenaltyStageEnum.FIRST]: 30,
    [PenaltyStageEnum.SECOND]: 90,
};

export const PENALTY_REASON_MAX_LENGTH = 1000;

// Display order for penalty space units (not the SpaceTypeEnum numeric order).
export const PENALTY_SPACE_TYPES: SpaceTypeEnum[] = [
    SpaceTypeEnum.INDIVIDUAL,
    SpaceTypeEnum.PIANO,
    SpaceTypeEnum.SEMINAR,
    SpaceTypeEnum.DANCE,
    SpaceTypeEnum.GROUP,
    SpaceTypeEnum.MIRAE,
    SpaceTypeEnum.SUMI,
    SpaceTypeEnum.WORK,
    SpaceTypeEnum.OPEN,
];

export const PENALTY_SPACE_TYPE_LABEL: Record<SpaceTypeEnum, { kr: string; en: string }> = {
    [SpaceTypeEnum.INDIVIDUAL]: { kr: '개인연습실', en: 'Individual Practice Room' },
    [SpaceTypeEnum.PIANO]: { kr: '피아노실', en: 'Piano Room' },
    [SpaceTypeEnum.SEMINAR]: { kr: '세미나실', en: 'Seminar Room' },
    [SpaceTypeEnum.DANCE]: { kr: '무예실', en: 'Dance Studio' },
    [SpaceTypeEnum.GROUP]: { kr: '합주실', en: 'Group Practice Room' },
    [SpaceTypeEnum.MIRAE]: { kr: '미래홀', en: 'Mirae Hall' },
    [SpaceTypeEnum.SUMI]: { kr: '조수미홀', en: 'Sumi Jo Hall' },
    [SpaceTypeEnum.OPEN]: { kr: '오픈스페이스', en: 'Open-Space' },
    [SpaceTypeEnum.WORK]: { kr: '창작공방', en: 'Workshop' },
};

export const PENALTY_KIND_LABEL = {
    NOTICE: { kr: '주의', en: 'Notice' },
    WARNING: { kr: '경고', en: 'Warning' },
} as const;

export interface ISpringSemesterStartDate {
    year: number;
    month: number; // 1-based
    day: number;
}

export const SPRING_SEMESTER_START_DATES: ISpringSemesterStartDate[] = [
    { year: 2027, month: 3, day: 2 },
];
