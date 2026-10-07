-- Apply once to the target database before deploying the updated server.
-- Existing matches also start with submissions disabled.
ALTER TABLE `match_info`
  ADD COLUMN `allow_submission` BOOLEAN NOT NULL DEFAULT FALSE;
