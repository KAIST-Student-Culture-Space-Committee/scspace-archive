import type { IMatchActualScores, IMatchPredictionUpdate } from '@scspace-depot/types/match';

export const scoreFields = ['firstScoreA', 'firstScoreB', 'secondScoreA', 'secondScoreB'] as const;

export function comparedScoreCount(actual: IMatchActualScores): number {
  return scoreFields.filter((field) => actual[field] != null).length;
}

export function gradePrediction(prediction: IMatchPredictionUpdate, actual: IMatchActualScores) {
  const fields = scoreFields.filter((field) => actual[field] != null);
  if (!fields.length) return { correctScoreCount: null, scoreDiffAbs: null };
  return {
    correctScoreCount: fields.filter((field) => prediction[field] === actual[field]).length,
    scoreDiffAbs: fields.reduce((sum, field) => sum + Math.abs(prediction[field] - actual[field]!), 0),
  };
}

export function isOutcomeCorrect(prediction: IMatchPredictionUpdate, actual: IMatchActualScores): boolean | null {
  // Prefer final cumulative scores. If unavailable, use a complete first-half pair.
  const pair = actual.secondScoreA != null && actual.secondScoreB != null
    ? ['secondScoreA', 'secondScoreB'] as const
    : actual.firstScoreA != null && actual.firstScoreB != null
      ? ['firstScoreA', 'firstScoreB'] as const : null;
  if (!pair) return null;
  return Math.sign(prediction[pair[0]] - prediction[pair[1]]) === Math.sign(actual[pair[0]]! - actual[pair[1]]!);
}

export function latestPredictions<T extends { id: number; userId: number; matchId: number; timeSubmit: Date | string | null }>(rows: T[]): T[] {
  const timestamp = (value: Date | string | null) => value == null ? -Infinity : new Date(value).getTime();
  const sorted = [...rows].sort((a, b) => (timestamp(b.timeSubmit) - timestamp(a.timeSubmit)) || b.id - a.id);
  const seen = new Set<string>();
  return sorted.filter((row) => {
    const key = `${row.matchId}:${row.userId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
