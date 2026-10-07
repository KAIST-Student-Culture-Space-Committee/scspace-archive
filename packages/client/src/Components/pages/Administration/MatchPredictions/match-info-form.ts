import type { IMatchInfo, IMatchInfoUpdate } from '@scspace-depot/types/match';

export const scoreFields = ['firstScoreA', 'firstScoreB', 'secondScoreA', 'secondScoreB'] as const;
export type MatchInfoDraft = Record<'matchName' | 'teamA' | 'teamB' | typeof scoreFields[number], string>;

export function createMatchInfoDraft(match: IMatchInfo): MatchInfoDraft {
    return {
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
