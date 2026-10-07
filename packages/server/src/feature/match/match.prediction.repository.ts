import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DBAsyncProvider } from 'src/db/db.provider'; 
import { MySql2Database } from 'drizzle-orm/mysql2';
import { schema, MatchPrediction, MatchInfo, User } from '@schema';
import { and, eq, desc, InferInsertModel } from 'drizzle-orm';
import { IMatchPredictionInsert } from './match.model';
import { IMatchInfoUpdate } from '@scspace-depot/types/match';

@Injectable()
export class MatchPredictionRepository {
  constructor(
    @Inject(DBAsyncProvider) private readonly db: MySql2Database<typeof schema>,
  ) {}

  async insertTestPrediction(data: IMatchPredictionInsert) {
    const [user] = await this.db.select({ id: User.id }).from(User).where(eq(User.id, data.userId));
    if (!user) throw new NotFoundException(`사용자 ID ${data.userId}를 찾을 수 없습니다.`);
    return this.insert({ ...data, phoneNumber: 'TEST' });
  }

  async insert(data: IMatchPredictionInsert & { phoneNumber?: string }) {
    const insertData = {
      userId: data.userId,
      matchId: data.matchId,
      firstScoreA: data.firstScoreA,
      firstScoreB: data.firstScoreB,
      secondScoreA: data.secondScoreA,
      secondScoreB: data.secondScoreB,
      ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
    } as InferInsertModel<typeof MatchPrediction>;

    return this.db.transaction(async (tx) => {
      // Serialize submissions and the admin toggle on the same match row.
      const [match] = await tx.select().from(MatchInfo)
        .where(eq(MatchInfo.id, data.matchId)).for('update');
      if (!match) {
        throw new NotFoundException(`경기 ID ${data.matchId}를 찾을 수 없습니다.`);
      }
      if (!match.allowSubmission) {
        throw new ForbiddenException('현재 이 경기의 예측 제출을 받지 않습니다.');
      }
      // The match lock serializes the lookup and write, including first submissions.
      const [existing] = await tx.select({ id: MatchPrediction.id }).from(MatchPrediction)
        .where(and(eq(MatchPrediction.userId, data.userId), eq(MatchPrediction.matchId, data.matchId)))
        .orderBy(desc(MatchPrediction.timeSubmit), desc(MatchPrediction.id)).limit(1).for('update');
      if (existing) {
        const [result] = await tx.update(MatchPrediction).set({
          firstScoreA: data.firstScoreA,
          firstScoreB: data.firstScoreB,
          secondScoreA: data.secondScoreA,
          secondScoreB: data.secondScoreB,
          timeSubmit: new Date(),
          predictionResult: null,
        }).where(eq(MatchPrediction.id, existing.id));
        return result;
      }
      const [result] = await tx.insert(MatchPrediction).values(insertData);
      return result;
    });
  }

  async updateMatchInfo(matchId: number, data: IMatchInfoUpdate) {
    return this.db.transaction(async (tx) => {
      const [match] = await tx.select().from(MatchInfo)
        .where(eq(MatchInfo.id, matchId)).for('update');
      if (!match) {
        throw new NotFoundException(`경기 ID ${matchId}를 찾을 수 없습니다.`);
      }
      await tx.update(MatchInfo).set(data).where(eq(MatchInfo.id, matchId));
    });
  }

  async updateAllowSubmission(matchId: number, allowSubmission: boolean) {
    return this.db.transaction(async (tx) => {
      const [match] = await tx.select().from(MatchInfo)
        .where(eq(MatchInfo.id, matchId)).for('update');
      if (!match) {
        throw new NotFoundException(`경기 ID ${matchId}를 찾을 수 없습니다.`);
      }
      await tx.update(MatchInfo).set({ allowSubmission }).where(eq(MatchInfo.id, matchId));
    });
  }
  
  async fetchByUserId(userId: number) {
    return this.db
      .select({
        prediction: MatchPrediction,
        matchInfo: MatchInfo,
      })
      .from(MatchPrediction)
      .leftJoin(MatchInfo, eq(MatchPrediction.matchId, MatchInfo.id))
      .where(eq(MatchPrediction.userId, userId))
      .orderBy(desc(MatchPrediction.timeSubmit), desc(MatchPrediction.id));
  }

  async fetchAllPredictions() {
    return this.db
      .select()
      .from(MatchPrediction)
      .orderBy(desc(MatchPrediction.timeSubmit), desc(MatchPrediction.id));
  }

  async fetchAll() {
    return this.db.select().from(MatchInfo).orderBy(desc(MatchInfo.id));
  }

  async fetchPredictionById(predictionId: number) {
    const [result] = await this.db
      .select()
      .from(MatchPrediction)
      .where(eq(MatchPrediction.id, predictionId));

    if (!result) {
      throw new NotFoundException(`예측 ID ${predictionId}를 찾을 수 없습니다.`);
    }

    return result;
  }

  async fetchByMatchId(matchId: number) {
    const [result] = await this.db
      .select()
      .from(MatchInfo)
      .where(eq(MatchInfo.id, matchId));

    if (!result) {
      throw new NotFoundException(`경기 ID ${matchId}를 찾을 수 없습니다.`);
    }

    return result;
  }

}
