import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { DBAsyncProvider } from 'src/db/db.provider';
import { MySql2Database } from 'drizzle-orm/mysql2';
import {
  schema,
  Reservation,
  OrganizationMember,
  ReservationContent,
} from '@schema';
import {
  eq,
  and,
  SQL,
  inArray,
  InferInsertModel,
  gt,
  lt,
  desc,
  or,
  gte,
  lte,
  count,
  ne,
  isNotNull,
  getTableColumns,
} from 'drizzle-orm';
import {
  IReservationCreate,
  // IReservation,
  // IReservationSimple,
  IReservationUpdate,
} from '@scspace-depot/types/reservation';
import {
  ReservationStateEnum,
} from '@scspace-depot/enums/reservation.enum';
import { MReservationContent, MReservationSimple } from '@scspace-server/feature/reservation/reservation.model';
import { getNow } from '@scspace-server/common/utils';
import { IDataResponse } from '@scspace-depot/types/common/common.type';

@Injectable()
export class ReservationRepository {
  constructor(
    @Inject(DBAsyncProvider) private readonly db: MySql2Database<typeof schema>
  ) { }

  sqlGenerator(params: {
    id?: number;
    userId?: number;
    spaceId?: number;
    spaceIds?: number[];
    organizationId?: number;
    state?: ReservationStateEnum;
    states?: ReservationStateEnum[];
    limit?: number;
    offset?: number;
    timeRange?: {
      timeFrom?: number;
      timeTo?: number;
    };
  }): SQL[] {
    const whereClause: SQL[] = [];

    if (params.id) {
      whereClause.push(eq(Reservation.id, params.id));
    }
    if (params.userId) {
      whereClause.push(eq(Reservation.userId, params.userId));
    }
    if (params.spaceId) {
      whereClause.push(eq(Reservation.spaceId, params.spaceId));
    }
    if (params.spaceIds) {
      whereClause.push(inArray(Reservation.spaceId, params.spaceIds));
    }
    if (params.organizationId) {
      whereClause.push(eq(Reservation.organizationId, params.organizationId));
    }
    if (params.state) {
      whereClause.push(eq(Reservation.state, params.state));
    }
    if (params.states) {
      if (params.states.length === 0) return [];
      whereClause.push(inArray(Reservation.state, params.states));
    }
    if (params.timeRange) {
      const timeFrom = params.timeRange.timeFrom;
      const timeTo = params.timeRange.timeTo;
      if (timeFrom && timeTo) {
        whereClause.push(
          or(
            and(
              gt(Reservation.timeFrom, timeFrom),
              lt(Reservation.timeFrom, timeTo)
            ),
            and(
              gt(Reservation.timeTo, timeFrom),
              lt(Reservation.timeTo, timeTo)
            ),
            and(
              lte(Reservation.timeFrom, timeFrom),
              gte(Reservation.timeTo, timeTo)
            )
          )
        );
      }
    }

    return whereClause;
  }

  async fetch(params: {
    id?: number;
    userId?: number;
    spaceId?: number;
    spaceIds?: number[];
    organizationId?: number;
    state?: ReservationStateEnum;
    states?: ReservationStateEnum[];
    limit?: number;
    offset?: number;
    timeRange?: {
      timeFrom?: number;
      timeTo?: number;
    };
  }): Promise<IDataResponse<MReservationSimple[]>> {
    const whereClause: SQL[] = this.sqlGenerator(params);

    const reservations = this.db
      .select()
      .from(Reservation)
      .where(and(...whereClause))
      .orderBy(desc(Reservation.id));

    let query;
    if (params.limit && params.offset)
      query = reservations.limit(params.limit).offset(params.offset);
    else if (params.limit)
      query = reservations.limit(params.limit);
    else if (params.offset)
      query = reservations.offset(params.offset);
    else
      query = reservations;

    const [data, totalCount] = await Promise.all([
      query,
      this.db
        .select({ count: count() })
        .from(Reservation)
        .where(and(...whereClause))
    ]);

    return {
      data,
      count: totalCount[0]?.count || 0
    };
  }

  userSqlGenerator(userId: number, organizationId: number): { needsJoin: boolean, where: SQL } {
    if (userId === -1) {
      if (organizationId === 0) {
        return { needsJoin: false, where: null };
      }
      return {
        needsJoin: false,
        where: eq(Reservation.organizationId, organizationId)
      };
    }

    switch (organizationId) {
      case 0: // All
        return {
          needsJoin: true,
          where: or(
            and(
              eq(Reservation.organizationId, 1),
              eq(Reservation.userId, userId)
            ),
            and(
              ne(Reservation.organizationId, 1),
            )
          )
        };
      case 1: // Individual
        return {
          needsJoin: false,
          where: and(
            eq(Reservation.organizationId, 1),
            eq(Reservation.userId, userId)
          )
        };
      default: // Organization
        return {
          needsJoin: false,
          where: and(
            ne(Reservation.organizationId, 1),
            isNotNull(Reservation.organizationId),
            eq(Reservation.organizationId, organizationId),
          )
        };
    }
  }

  async fetchByUserId(
    userId: number,
    organizationId: number,
    limit: number,
    offset: number
  ): Promise<IDataResponse<MReservationSimple[]>> {
    const { needsJoin, where } = this.userSqlGenerator(userId, organizationId);

    let query;
    if (needsJoin) {
      query = this.db
        .select(getTableColumns(Reservation))
        .from(Reservation)
        .innerJoin(
          OrganizationMember,
          and(
            eq(OrganizationMember.organizationId, Reservation.organizationId),
            eq(OrganizationMember.userId, userId)
          )
        )
        .where(where)
        .orderBy(desc(Reservation.id))
        .limit(limit)
        .offset(offset);
    } else {
      query = this.db
        .select()
        .from(Reservation)
        .where(where)
        .orderBy(desc(Reservation.id))
        .limit(limit)
        .offset(offset);
    }

    let countQuery;
    if (needsJoin) {
      countQuery = this.db
        .select({ count: count() })
        .from(Reservation)
        .innerJoin(
          OrganizationMember,
          and(
            eq(OrganizationMember.organizationId, Reservation.organizationId),
            eq(OrganizationMember.userId, userId)
          )
        )
        .where(where);
    } else {
      countQuery = this.db
        .select({ count: count() })
        .from(Reservation)
        .where(where);
    }

    const [data, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      data,
      count: countResult[0]?.count || 0
    }
  }

  async fetchContent(id: number): Promise<MReservationContent> {
    const reservationContent = await this.db
      .select()
      .from(ReservationContent)
      .where(eq(ReservationContent.id, id));

      // need to refine the logic
    if (reservationContent.length == 0) {
        const errorContent = await this.db
            .select()
            .from(ReservationContent)
            .where(eq(ReservationContent.id, 1));
        return errorContent[0];
    }
    else return reservationContent[0];
  }

  async fetchByWorkerId(workerId: number): Promise<MReservationSimple[]> {
    return this.db.select(getTableColumns(Reservation))
      .from(Reservation)
      .innerJoin(ReservationContent, eq(ReservationContent.id, Reservation.id))
      .where(eq(ReservationContent.workerId, workerId))
      .limit(100);
  }

  async fetchWorkNeeds(): Promise<MReservationSimple[]> {
    return this.db.select(getTableColumns(Reservation))
      .from(Reservation)
      .innerJoin(ReservationContent, eq(ReservationContent.id, Reservation.id))
      .where(eq(ReservationContent.workerNeed, true))
      .limit(100);
  }

  async insert(
    reservationInput: IReservationCreate,
  ): Promise<[MReservationSimple, MReservationContent]> {
    const insertData = {
      userId: reservationInput.userId,
      organizationId: reservationInput.organizationId,
      spaceId: reservationInput.spaceId,
      title: reservationInput.title,
      timeFrom: reservationInput.timeFrom,
      timeTo: reservationInput.timeTo,
      timePost: getNow(),
      timeUpdate: getNow(),
      state: ReservationStateEnum.GRANT,
    } as InferInsertModel<typeof Reservation>;

    const [result] = await this.db.insert(Reservation).values(insertData);
    if (!result.insertId) {
      throw new Error('Failed to get inserted ID');
    }

    const { data: reservationCreated } = await this.fetch({ id: result.insertId });
    if (reservationCreated.length === 0) {
      throw new NotFoundException('Reservation not found after creation');
    }
    const insertContentData = {
      id: result.insertId,
      description: reservationInput.content.description,
      innerParticipantNumber: reservationInput.content.innerParticipantNumber,
      outerParticipantNumber: reservationInput.content.outerParticipantNumber,
      food: reservationInput.content.food,
      busking: reservationInput.content.busking,
      workerNeed: reservationInput.content.workerNeed,
      performance: reservationInput.content.performance ?? false,
    } as InferInsertModel<typeof ReservationContent>;

    await this.db.insert(ReservationContent).values(insertContentData);
    const reservationContentCreated = await this.fetchContent(result.insertId);
    if (!reservationContentCreated) {
      throw new Error('Failed to create reservation content');
    }

    return [reservationCreated[0], reservationContentCreated];
  }

  async update(data: IReservationUpdate): Promise<[MReservationSimple, MReservationContent]> {
    const updateData = {
      ...data,
      timeUpdate: getNow(),
    } as Partial<InferInsertModel<typeof Reservation>>;

    const [result] = await this.db
      .update(Reservation)
      .set(updateData)
      .where(eq(Reservation.id, data.id));
    if (!result.affectedRows) {
      throw new Error('Failed to update reservation');
    }
    const { data: reservationUpdated } = await this.fetch({ id: data.id! });
    if (reservationUpdated.length === 0) {
      throw new NotFoundException('Reservation not found after update');
    }

    if (data.content) {
      const updateContentData = {
        id: data.id!,
        ...data.content
      } as InferInsertModel<typeof ReservationContent>;

      const [resultContent] = await this.db
        .update(ReservationContent)
        .set(updateContentData)
        .where(eq(ReservationContent.id, data.id!));
      if (!resultContent.affectedRows) {
        throw new Error('Failed to update reservation content');
      }
    }

    const reservationContentUpdated = await this.fetchContent(data.id!);
    if (!reservationContentUpdated) {
      throw new NotFoundException('Reservation content not found after update');
    }

    return [reservationUpdated[0], reservationContentUpdated];
  }


  async delete(id: number): Promise<boolean> {
    const [result] = await this.db
      .delete(Reservation)
      .where(eq(Reservation.id, id));
    return result.affectedRows > 0;
  }
}
