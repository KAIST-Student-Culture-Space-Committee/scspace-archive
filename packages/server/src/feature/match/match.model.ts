export interface IMatchPredictionScores {
  matchId: number;
  firstScoreA: number;
  firstScoreB: number;
  secondScoreA: number;
  secondScoreB: number;
}

export interface IMatchPredictionCreate extends IMatchPredictionScores {
  phoneNumber: string;
  privacyConsent: true;
}

export interface IMatchPredictionInsert extends IMatchPredictionScores {
  phoneNumber: string;
  userId: number;
}

export interface IMatchPredictionUpdate {
  firstScoreA: number;
  firstScoreB: number;
  secondScoreA: number;
  secondScoreB: number;
}
