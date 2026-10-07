import type { IMatchInfo, IMatchInfoUpdate } from '@scspace-depot/types/match';

export const scoreFields = ['firstScoreA', 'firstScoreB', 'secondScoreA', 'secondScoreB'] as const;
export type MatchInfoDraft = Record<'matchName' | 'teamA' | 'teamB' | typeof scoreFields[number], string> & { startTime: number | null };

export function createMatchInfoDraft(match: IMatchInfo): MatchInfoDraft {
    return {
        startTime: match.startTime,
        matchName: match.matchName,
        teamA: match.teamA, teamB: match.teamB,
        firstScoreA: match.firstScoreA?.toString() ?? '',
        firstScoreB: match.firstScoreB?.toString() ?? '',
        secondScoreA: match.secondScoreA?.toString() ?? '',
        secondScoreB: match.secondScoreB?.toString() ?? '',
    };
}

export function buildMatchInfoUpdate(initial: MatchInfoDraft, draft: MatchInfoDraft): IMatchInfoUpdate {
    const update: IMatchInfoUpdate = {};
    if (initial.startTime !== draft.startTime && draft.startTime != null) update.startTime = draft.startTime;
    for (const [first, final] of [['firstScoreA', 'secondScoreA'], ['firstScoreB', 'secondScoreB']] as const) {
        if (draft[first] !== '' && draft[final] !== '' && Number(draft[final]) < Number(draft[first])) {
            throw new Error('최종 누적 점수는 전반 점수 이상이어야 합니다.');
        }
    }
    for (const field of ['matchName', 'teamA', 'teamB'] as const) {
        if (initial[field] === draft[field]) continue;
        if (!draft[field].trim()) throw new Error('경기명과 팀 이름을 입력해주세요.');
        update[field] = draft[field].trim();
    }
    for (const field of scoreFields) {
        if (initial[field] === draft[field]) continue;
        if (draft[field] !== '' && !/^\d{1,2}$/.test(draft[field])) {
            throw new Error('실제 점수는 0~99 정수로 입력하거나 비워두세요.');
        }
        update[field] = draft[field] === '' ? null : Number(draft[field]);
    }
    return update;
}
