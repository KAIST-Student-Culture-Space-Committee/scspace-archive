import { mysqlTable, int, varchar, timestamp, index, boolean } from 'drizzle-orm/mysql-core';
import { User } from './user'; // 기존 프로젝트의 User 스키마 경로에 맞게 임포트

// 1. 경기 정보 테이블
export const MatchInfo = mysqlTable('match_info', {
  id: int('id').autoincrement().primaryKey(),
  matchName: varchar('match_name', { length: 255 }).notNull(),
  allowSubmission: boolean('allow_submission').notNull().default(false),
  teamA: varchar('team_a', { length: 100 }).notNull(),
  teamB: varchar('team_b', { length: 100 }).notNull(),
  firstScoreA: int('first_score_a'),
  firstScoreB: int('first_score_b'),
  secondScoreA: int('second_score_a'),
  secondScoreB: int('second_score_b'),
});

// 2. 유저의 경기 예측 테이블
export const MatchPrediction = mysqlTable('match_prediction', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade' }),  
  matchId: int('match_id')
    .notNull()
    .references(() => MatchInfo.id, { onDelete: 'cascade' }), 
  firstScoreA: int('first_score_a').notNull(),
  firstScoreB: int('first_score_b').notNull(),
  secondScoreA: int('second_score_a').notNull(),
  secondScoreB: int('second_score_b').notNull(),
  timeSubmit: timestamp('time_submit').defaultNow(),
  phoneNumber: varchar('phone', { length: 32 }),
  predictionResult: int('prediction_result'),
  correctScoreCount: int('correct_score_count'),
  scoreDiffAbs: int('score_diff_abs'),
}, (table) => [
  index('match_prediction_user_id_idx').on(table.userId),
  index('match_prediction_match_id_idx').on(table.matchId),
]);
