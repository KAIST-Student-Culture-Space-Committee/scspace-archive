-- Apply once to the intended database BEFORE deploying the updated server.
-- Additive only: preserves predictions, existing score names and prediction_result.
ALTER TABLE `match_prediction`
  ADD COLUMN `correct_score_count` INT NULL,
  ADD COLUMN `score_diff_abs` INT NULL;

-- After deployment, close submissions and use the dashboard's regrade action
-- for matches with actual scores already entered. No grading-stage column is used.
-- second_score_a/b must contain cumulative FINAL scores, not second-half goals.
