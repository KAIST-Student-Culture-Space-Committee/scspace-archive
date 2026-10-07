export interface IMatchInfo {
    id: number;
    matchName: string;
    allowSubmission: boolean;
    teamA: string;
    teamB: string;
    firstScoreA: number | null;
    firstScoreB: number | null;
    secondScoreA: number | null;
    secondScoreB: number | null;
}

export type IMatchInfoUpdate = Partial<Omit<IMatchInfo, 'id' | 'allowSubmission'>>;
export type IMatchInfoCreate = Pick<IMatchInfo, 'matchName' | 'teamA' | 'teamB'>;

export interface IMatchPrediction {
    id: number;
    userId: number;
    matchId: number;
    firstScoreA: number;
    firstScoreB: number;
    secondScoreA: number;
    secondScoreB: number;
    timeSubmit: Date;
    predictionResult: number | null;
    correctScoreCount: number | null;
    scoreDiffAbs: number | null;
}

export type IMatchPredictionCreate = Omit<IMatchPrediction, 'id' | 'userId' | 'timeSubmit' | 'predictionResult' | 'correctScoreCount' | 'scoreDiffAbs'>;

export type IMatchPredictionUpdate = Pick<IMatchPrediction, 'firstScoreA' | 'firstScoreB' | 'secondScoreA' | 'secondScoreB'>;

export interface IMatchPredictionWithInfo {
    prediction: IMatchPrediction;
    matchInfo: IMatchInfo | null;
}

// secondScore is the cumulative final score; keep existing API/DB names compatible.
export type IMatchActualScores = Pick<IMatchInfo, 'firstScoreA' | 'firstScoreB' | 'secondScoreA' | 'secondScoreB'>;
