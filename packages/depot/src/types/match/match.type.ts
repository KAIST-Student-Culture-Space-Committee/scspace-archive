export interface IMatchInfo {
    id: number;
    matchName: string;
    allowSubmission: boolean;
    startTime: number | null;
    teamA: string;
    teamB: string;
    firstScoreA: number | null;
    firstScoreB: number | null;
    secondScoreA: number | null;
    secondScoreB: number | null;
}

export type IMatchInfoUpdate = Partial<Omit<IMatchInfo, 'id' | 'allowSubmission'>>;
export type IMatchInfoCreate = Pick<IMatchInfo, 'matchName' | 'teamA' | 'teamB'> & { startTime: number };

export interface IMatchPrediction {
    id: number;
    userId: number;
    matchId: number;
    firstScoreA: number;
    firstScoreB: number;
    secondScoreA: number;
    secondScoreB: number;
    timeSubmit: Date;
    phoneNumber: string;
    predictionResult: number | null;
    correctScoreCount: number | null;
    scoreDiffAbs: number | null;
}

export type IMatchPredictionCreate = Omit<IMatchPrediction, 'id' | 'userId' | 'timeSubmit' | 'predictionResult' | 'correctScoreCount' | 'scoreDiffAbs'> & { privacyConsent: true };

export type IMatchPredictionUpdate = Pick<IMatchPrediction, 'firstScoreA' | 'firstScoreB' | 'secondScoreA' | 'secondScoreB'>;

export interface IMatchPredictionWithInfo {
    prediction: IMatchPrediction;
    matchInfo: IMatchInfo | null;
}

// secondScore is the cumulative final score; keep existing API/DB names compatible.
export type IMatchActualScores = Pick<IMatchInfo, 'firstScoreA' | 'firstScoreB' | 'secondScoreA' | 'secondScoreB'>;

export interface IMatchLeaderboardPrediction extends IMatchPredictionUpdate {
    id: number;
    userId: number;
    userName: string;
    timeSubmit: string | Date | null;
    correctScoreCount: number | null;
    scoreDiffAbs: number | null;
    isOutcomeCorrect: boolean | null;
}
export interface IMatchRankGroup {
    positions: number[];
    predictions: IMatchLeaderboardPrediction[];
}
export interface IMatchLeaderboard {
    participantCount: number;
    groups: IMatchRankGroup[];
}
