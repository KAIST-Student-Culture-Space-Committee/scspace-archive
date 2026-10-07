import type { IMatchActualScores, IMatchPredictionUpdate } from '@scspace-depot/types/match';

export const scoreFields = ['firstScoreA', 'firstScoreB', 'secondScoreA', 'secondScoreB'] as const;

export function comparedScoreCount(actual: IMatchActualScores): number {
  return scoreFields.filter((field) => actual[field] != null).length;
}

export function gradePrediction(prediction: IMatchPredictionUpdate, actual: IMatchActualScores) {
  const fields = scoreFields.filter((field) => actual[field] != null);
  if (!fields.length) return { correctScoreCount: null, scoreDiffAbs: null };
  const pairs = [['firstScoreA', 'firstScoreB'], ['secondScoreA', 'secondScoreB']] as const;
  return {
    // Each complete A:B scoreline earns one hit, never one hit per team.
    correctScoreCount: pairs.filter(([a, b]) =>
      actual[a] != null && actual[b] != null &&
      prediction[a] === actual[a] && prediction[b] === actual[b],
    ).length,
    scoreDiffAbs: fields.reduce((sum, field) => sum + Math.abs(prediction[field] - actual[field]!), 0),
  };
}

// Prefer final cumulative scores. If unavailable, use a complete first-half pair.
function outcomePair(actual: IMatchActualScores) {
  return actual.secondScoreA != null && actual.secondScoreB != null
    ? ['secondScoreA', 'secondScoreB'] as const
    : actual.firstScoreA != null && actual.firstScoreB != null
      ? ['firstScoreA', 'firstScoreB'] as const : null;
}

export function isOutcomeCorrect(prediction: IMatchPredictionUpdate, actual: IMatchActualScores): boolean | null {
  const pair = outcomePair(actual);
  if (!pair) return null;
  return Math.sign(prediction[pair[0]] - prediction[pair[1]]) === Math.sign(actual[pair[0]]! - actual[pair[1]]!);
}

export function goalDiffError(prediction: IMatchPredictionUpdate, actual: IMatchActualScores): number | null {
  const pair = outcomePair(actual);
  if (!pair) return null;
  return Math.abs((prediction[pair[0]] - prediction[pair[1]]) - (actual[pair[0]]! - actual[pair[1]]!));
}

function isExactPair(prediction: IMatchPredictionUpdate, actual: IMatchActualScores, a: typeof scoreFields[number], b: typeof scoreFields[number]) {
  if (actual[a] == null || actual[b] == null) return null;
  return prediction[a] === actual[a] && prediction[b] === actual[b];
}

export const emptyRankingFields = {
  finalScoreCorrect: null, firstHalfScoreCorrect: null, isOutcomeCorrect: null, goalDiffError: null,
};

// Derived from current actual scores at read time, so changing the ranking needs no stored regrade.
export function rankingFields(prediction: IMatchPredictionUpdate & { correctScoreCount: number | null; scoreDiffAbs: number | null }, actual: IMatchActualScores | null) {
  if (!actual || prediction.correctScoreCount == null || prediction.scoreDiffAbs == null) return emptyRankingFields;
  return {
    finalScoreCorrect: isExactPair(prediction, actual, 'secondScoreA', 'secondScoreB'),
    firstHalfScoreCorrect: isExactPair(prediction, actual, 'firstScoreA', 'firstScoreB'),
    isOutcomeCorrect: isOutcomeCorrect(prediction, actual),
    goalDiffError: goalDiffError(prediction, actual),
  };
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
