import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DBAsyncProvider } from 'src/db/db.provider';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { Penalty, schema, User, Organization } from '@schema';
import { and, asc, desc, eq, gte, lt, or, SQL } from 'drizzle-orm';
import { IPenalty, IPenaltyTarget } from '@scspace-depot/types/penalty';
import { PenaltyStageEnum, PenaltyTargetEnum } from '@scspace-depot/enums/penalty.enum';
import { SpaceTypeEnum } from '@scspace-depot/enums/space.enum';
import { MPenalty } from './penalty.model';

export type PenaltyExecutor = Pick<
    MySql2Database<typeof schema>,
    'select' | 'insert' | 'update' | 'delete'
>;

export type IPenaltyInsert = Omit<IPenalty, 'id'>;

export interface IPenaltyComputedUpdate {
    noticeTotal: number;
    warningTotal: number;
    converted: boolean;
    restrictionStage: PenaltyStageEnum;
    restrictionEnd: number;
}

@Injectable()
export class PenaltyRepository {
    constructor(
        @Inject(DBAsyncProvider) private readonly db: MySql2Database<typeof schema>,
    ) { }

    async transaction<T>(fn: (tx: PenaltyExecutor) => Promise<T>): Promise<T> {
        return this.db.transaction(fn);
    }

    private targetCondition(target: IPenaltyTarget) {
        return target.targetType === PenaltyTargetEnum.USER
            ? and(eq(Penalty.targetType, PenaltyTargetEnum.USER), eq(Penalty.userId, target.targetId))
            : and(eq(Penalty.targetType, PenaltyTargetEnum.ORGANIZATION), eq(Penalty.organizationId, target.targetId));
    }

    async lockTarget(tx: PenaltyExecutor, target: IPenaltyTarget): Promise<void> {
        if (target.targetType === PenaltyTargetEnum.USER) {
            const [user] = await tx
                .select({ id: User.id })
                .from(User)
                .where(eq(User.id, target.targetId))
                .for('update');
            if (!user) {
                throw new NotFoundException('User not found');
            }
        } else {
            const [organization] = await tx
                .select({ id: Organization.id })
                .from(Organization)
                .where(eq(Organization.id, target.targetId))
                .for('update');
            if (!organization) {
                throw new NotFoundException('Organization not found');
            }
        }
    }

    async fetchById(id: number): Promise<IPenalty | null> {
        const [row] = await this.db.select().from(Penalty).where(eq(Penalty.id, id));
        return row ? MPenalty.fromDB(row) : null;
    }

    async fetchByTarget(target: IPenaltyTarget, executor: PenaltyExecutor = this.db): Promise<IPenalty[]> {
        const rows = await executor
            .select()
            .from(Penalty)
            .where(this.targetCondition(target))
            .orderBy(asc(Penalty.timeImpose), asc(Penalty.id));
        return rows.map(MPenalty.fromDB);
    }

    async fetchRange(
        tx: PenaltyExecutor,
        target: IPenaltyTarget,
        spaceType: SpaceTypeEnum,
        start: number,
        end: number | null,
    ): Promise<IPenalty[]> {
        const conditions: SQL[] = [
            this.targetCondition(target),
            eq(Penalty.spaceType, spaceType),
            gte(Penalty.timeImpose, start),
        ];
        if (end !== null) {
            conditions.push(lt(Penalty.timeImpose, end));
        }

        const rows = await tx
            .select()
            .from(Penalty)
            .where(and(...conditions))
            .orderBy(asc(Penalty.timeImpose), asc(Penalty.id));
        return rows.map(MPenalty.fromDB);
    }

    async fetchLatestInCycle(
        tx: PenaltyExecutor,
        target: IPenaltyTarget,
        spaceType: SpaceTypeEnum,
        cycleStart: number,
    ): Promise<IPenalty | null> {
        const [row] = await tx
            .select()
            .from(Penalty)
            .where(and(
                this.targetCondition(target),
                eq(Penalty.spaceType, spaceType),
                gte(Penalty.timeImpose, cycleStart),
            ))
            .orderBy(desc(Penalty.timeImpose), desc(Penalty.id))
            .limit(1);
        return row ? MPenalty.fromDB(row) : null;
    }

    async insert(tx: PenaltyExecutor, values: IPenaltyInsert): Promise<IPenalty> {
        const [result] = await tx.insert(Penalty).values(values);
        const [row] = await tx.select().from(Penalty).where(eq(Penalty.id, result.insertId));
        if (!row) {
            throw new Error('Failed to insert penalty record');
        }
        return MPenalty.fromDB(row);
    }

    async deleteById(tx: PenaltyExecutor, id: number): Promise<void> {
        const [result] = await tx.delete(Penalty).where(eq(Penalty.id, id));
        if (result.affectedRows === 0) {
            throw new NotFoundException('Penalty record not found');
        }
    }

    async updateComputed(tx: PenaltyExecutor, id: number, values: IPenaltyComputedUpdate): Promise<void> {
        await tx.update(Penalty).set(values).where(eq(Penalty.id, id));
    }

    async fetchMaxActiveRestriction(
        target: IPenaltyTarget,
        spaceType: SpaceTypeEnum,
        now: number,
    ): Promise<number | null> {
        const [row] = await this.db
            .select({ restrictionEnd: Penalty.restrictionEnd })
            .from(Penalty)
            .where(and(
                this.targetCondition(target),
                eq(Penalty.spaceType, spaceType),
                gte(Penalty.restrictionEnd, now),
            ))
            .orderBy(desc(Penalty.restrictionEnd))
            .limit(1);
        return row ? row.restrictionEnd : null;
    }

    async fetchForSummary(targetType: PenaltyTargetEnum, cycleStart: number, now: number): Promise<IPenalty[]> {
        const rows = await this.db
            .select()
            .from(Penalty)
            .where(and(
                eq(Penalty.targetType, targetType),
                or(
                    gte(Penalty.timeImpose, cycleStart),
                    gte(Penalty.restrictionEnd, now),
                ),
            ))
            .orderBy(asc(Penalty.timeImpose), asc(Penalty.id));
        return rows.map(MPenalty.fromDB);
    }
}
