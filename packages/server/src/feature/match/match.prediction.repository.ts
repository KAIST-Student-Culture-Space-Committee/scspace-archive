import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DBAsyncProvider } from 'src/db/db.provider'; 
import { MySql2Database } from 'drizzle-orm/mysql2';
import { schema, MatchPrediction, MatchInfo, User } from '@schema';
import { and, eq, desc, InferInsertModel } from 'drizzle-orm';
import { IMatchPredictionInsert } from './match.model';
import { IMatchActualScores, IMatchInfo, IMatchInfoCreate, IMatchInfoUpdate } from '@scspace-depot/types/match';
import { comparedScoreCount, gradePrediction, isOutcomeCorrect, latestPredictions, scoreFields } from './match.grading';

type MatchTransaction = Parameters<Parameters<MySql2Database<typeof schema>['transaction']>[0]>[0];

const emptyGrades = { correctScoreCount: null, scoreDiffAbs: null, predictionResult: null };

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
      if (comparedScoreCount(match)) {
        throw new ForbiddenException('실제 점수가 공개된 경기에는 제출할 수 없습니다.');
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
          ...emptyGrades,
        }).where(eq(MatchPrediction.id, existing.id));
        return result;
      }
      const [result] = await tx.insert(MatchPrediction).values(insertData);
      return result;
    });
  }

  async createMatchInfo(data: IMatchInfoCreate) {
    const [result] = await this.db.insert(MatchInfo).values({
      matchName: data.matchName, teamA: data.teamA, teamB: data.teamB,
      allowSubmission: false,
      firstScoreA: null, firstScoreB: null, secondScoreA: null, secondScoreB: null,
    });
    return result.insertId;
  }

  async updateMatchInfo(matchId: number, data: IMatchInfoUpdate) {
    return this.db.transaction(async (tx) => {
      const [match] = await tx.select().from(MatchInfo)
        .where(eq(MatchInfo.id, matchId)).for('update');
      if (!match) {
        throw new NotFoundException(`경기 ID ${matchId}를 찾을 수 없습니다.`);
      }
      const scoresChanged = scoreFields.some((field) => field in data && data[field] !== match[field]);
      const updated = { ...match, ...data };
      if (scoresChanged) {
        this.assertActualScores(updated);
        if (match.allowSubmission) {
          throw new BadRequestException('접수를 종료한 뒤 실제 점수를 저장해주세요.');
        }
      }
      await tx.update(MatchInfo).set(data).where(eq(MatchInfo.id, matchId));
      if (scoresChanged) {
        await tx.update(MatchPrediction).set(emptyGrades).where(eq(MatchPrediction.matchId, matchId));
      }
    });
  }

  async updateAllowSubmission(matchId: number, allowSubmission: boolean) {
    return this.db.transaction(async (tx) => {
      const [match] = await tx.select().from(MatchInfo)
        .where(eq(MatchInfo.id, matchId)).for('update');
      if (!match) {
        throw new NotFoundException(`경기 ID ${matchId}를 찾을 수 없습니다.`);
      }
      if (allowSubmission && comparedScoreCount(match)) {
        throw new BadRequestException('실제 점수를 모두 비워 결과를 취소한 뒤 접수를 열어주세요.');
      }
      await tx.update(MatchInfo).set({ allowSubmission }).where(eq(MatchInfo.id, matchId));
    });
  }

  private assertActualScores(actual: IMatchActualScores) {
    for (const field of scoreFields) {
      const value = actual[field];
      if (value != null && (!Number.isInteger(value) || value < 0 || value > 99)) {
        throw new BadRequestException('실제 점수는 0~99 정수 또는 미입력이어야 합니다.');
      }
    }
    if ((actual.firstScoreA != null && actual.secondScoreA != null && actual.secondScoreA < actual.firstScoreA) ||
        (actual.firstScoreB != null && actual.secondScoreB != null && actual.secondScoreB < actual.firstScoreB)) {
      throw new BadRequestException('최종 누적 점수는 전반 점수 이상이어야 합니다.');
    }
  }

  private async gradeInTransaction(tx: MatchTransaction, match: IMatchInfo) {
    const rows = await tx.select().from(MatchPrediction)
      .where(eq(MatchPrediction.matchId, match.id)).for('update');
    // Old duplicate rows remain as history but cannot retain stale grading results.
    await tx.update(MatchPrediction).set(emptyGrades).where(eq(MatchPrediction.matchId, match.id));
    if (!comparedScoreCount(match)) return;
    for (const prediction of latestPredictions(rows)) {
      await tx.update(MatchPrediction).set(gradePrediction(prediction, match))
        .where(eq(MatchPrediction.id, prediction.id));
    }
  }

  async regradeMatch(matchId: number) {
    await this.db.transaction(async (tx) => {
      const [match] = await tx.select().from(MatchInfo).where(eq(MatchInfo.id, matchId)).for('update');
      if (!match) throw new NotFoundException(`경기 ID ${matchId}를 찾을 수 없습니다.`);
      if (match.allowSubmission) throw new BadRequestException('접수를 종료한 뒤 재채점해주세요.');
      this.assertActualScores(match);
      if (!comparedScoreCount(match)) throw new BadRequestException('실제 점수를 먼저 입력해주세요.');
      await this.gradeInTransaction(tx, match);
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
    const rows = await this.db
      .select({
        prediction: MatchPrediction, actual: MatchInfo,
        nameKr: User.nameKr, nameEn: User.nameEn, studentNumber: User.studentNumber,
      })
      .from(MatchPrediction)
      .leftJoin(MatchInfo, eq(MatchPrediction.matchId, MatchInfo.id))
      .leftJoin(User, eq(MatchPrediction.userId, User.id))
      .orderBy(desc(MatchPrediction.timeSubmit), desc(MatchPrediction.id));
    return rows.map(({ prediction, actual, nameKr, nameEn, studentNumber }) => ({
      ...prediction,
      userName: nameKr?.trim() || nameEn?.trim() || null,
      studentNumber,
      isOutcomeCorrect: actual && prediction.correctScoreCount != null && prediction.scoreDiffAbs != null
        ? isOutcomeCorrect(prediction, actual) : null,
    }));
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
