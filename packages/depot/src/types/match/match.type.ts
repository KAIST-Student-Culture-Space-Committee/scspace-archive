export interface IMatchInfo {
    id: number;
    matchName: string;
    matchTime: Date;
    teamA: string;
    teamB: string;
    firstScoreA: number | null;
    firstScoreB: number | null;
    secondScoreA: number | null;
    secondScoreB: number | null;
}

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
}

export type IMatchPredictionCreate = Omit<IMatchPrediction, 'id' | 'userId' | 'timeSubmit' | 'predictionResult'>;

export type IMatchPredictionUpdate = Pick<IMatchPrediction, 'firstScoreA' | 'firstScoreB' | 'secondScoreA' | 'secondScoreB'>;

export interface IMatchPredictionWithInfo {
    prediction: IMatchPrediction;
    matchInfo: IMatchInfo | null;
}
