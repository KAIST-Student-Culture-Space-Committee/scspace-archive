-- Apply before deploying the updated server. Configure existing matches in Administration.
ALTER TABLE `match_info` ADD COLUMN `start_time` bigint NULL;
