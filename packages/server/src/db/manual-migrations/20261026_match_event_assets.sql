-- Apply once to the target database before deploying the updated server.
-- match_ad: event-wide AD ZONE banners (image = uploaded filename, served from /api/uploads/<filename>).
-- match_prize: 1st~3rd prizes. Seeded so the Prizes page keeps its current wording; upload images in Administration.
CREATE TABLE IF NOT EXISTS `match_ad` (
  `id` int NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `match_prize` (
  `place` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_en` varchar(100) NOT NULL,
  `image` varchar(255) NULL,
  PRIMARY KEY (`place`)
);

INSERT IGNORE INTO `match_prize` (`place`, `name`, `name_en`) VALUES
  (1, '프리미엄 무선 헤드폰', 'Premium Wireless Headphones'),
  (2, '휴대용 블루투스 스피커', 'Portable Bluetooth Speaker'),
  (3, '무선 게이밍 마우스', 'Wireless Gaming Mouse');
