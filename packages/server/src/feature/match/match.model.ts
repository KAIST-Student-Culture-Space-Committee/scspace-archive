export interface IMatchPredictionCreate {
  matchId: number;
  firstScoreA: number;
  firstScoreB: number;
  secondScoreA: number;
  secondScoreB: number;
}

export interface IMatchPredictionInsert extends IMatchPredictionCreate {
  userId: number;
}

export interface IMatchPredictionUpdate {
  firstScoreA: number;
  firstScoreB: number;
  secondScoreA: number;
  secondScoreB: number;
}
