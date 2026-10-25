-- Apply once to the target database before deploying the updated server.
-- Stores the uploaded logo filename (served from /api/uploads/<filename>).
-- Existing matches keep NULL logos; upload them in Administration.
ALTER TABLE `match_info`
  ADD COLUMN `team_a_logo` varchar(255) NULL,
  ADD COLUMN `team_b_logo` varchar(255) NULL;
