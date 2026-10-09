import {
  IReservationCreate,
  IReservationUpdate,
  IReservationAll,
  IReservationContent,
  IReservation,
  IReservationApplyWorker,
} from '@scspace-depot/types/reservation';
import { IOrganization } from '@scspace-depot/types/organization';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { checkContainAllId, takeAll } from '@scspace-server/common/utils';
import { ReservationStateEnum } from '@scspace-depot/enums/reservation.enum';
import { IUser } from '@scspace-depot/types/user';
import { ISpace } from '@scspace-depot/types/space';
import { MReservation, MReservationSimple } from '@scspace-server/feature/reservation/reservation.model';
import { IDataResponse, ISuccessResponse } from '@scspace-depot/types/common';
import { MailService } from '@scspace-server/tools/mailer/mail.service';
import { ReservationMeta, WorkerMeta } from '@scspace-depot/enums/mail.enum';
import { getString } from '@scspace-server/common/utils'
import { ReservationRepository } from '@scspace-server/feature/reservation/reservation.repository';
import { ReservationPublicService } from '@scspace-server/feature/reservation/reservation.public.service';
import { SpacePublicService } from '@scspace-server/feature/space/space.public.service';
import { UserPublicService } from '@scspace-server/feature/user/user.public.service';
import { OrganizationPublicService } from '@scspace-server/feature/organization/organization.public.service';
import { UserUtils } from '@scspace-depot/utils/user.utils';
import { PenaltyPublicService } from '@scspace-server/feature/penalty/penalty.public.service';

@Injectable()
export class ReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly reservationPublicService: ReservationPublicService,
    private readonly spacePublicService: SpacePublicService,
    private readonly userPublicService: UserPublicService,
    private readonly organizationPublicService: OrganizationPublicService,
    private readonly mailService: MailService,
    private readonly penaltyPublicService: PenaltyPublicService,
  ) { }

  async getReservationListByUserId(
    userId: number,
    organizationId: number,
    limit: number,
    offset: number,
  ): Promise<IDataResponse<IReservationAll[]>> {
    let { data: reservations, count } = await this.reservationRepository.fetchByUserId(userId, organizationId, limit, offset);

    const userIds = reservations.map((r) => r.userId);
    const organizationIds = reservations.map((r) => r.organizationId);
    const spaceIds = reservations.map((r) => r.spaceId);

    const [users, organizations, spaces, reservationContents] = await Promise.all([
      this.userPublicService.fetchAllByIds(userIds).then(takeAll(userIds, 'users')),
      this.organizationPublicService.fetchByIds(organizationIds),
      this.spacePublicService.fetchAllByIds(spaceIds),
      this.reservationPublicService.getReservationContentByIds(reservations.map((reservation) => reservation.id)),
    ]) as [IUser[], IOrganization[], ISpace[], IReservationContent[]];

    const workerIds = reservationContents.map(content => content.workerId).filter(id => id !== 0);
    const workers = await this.userPublicService.fetchAllByIds(workerIds)
      .then(takeAll(workerIds, 'workers'));

    checkContainAllId(userIds, users, 'users');
    checkContainAllId(organizationIds, organizations, 'organizations');
    checkContainAllId(spaceIds, spaces, 'spaces');
    checkContainAllId(workerIds, workers, 'workers');

    return {
      data: reservations.map((reservation) => {
        let content = reservationContents.find(content => content.id === reservation.id)!;
        if (!content) content = reservationContents.find(c => c.id === 1);
        return {
          ...reservation,
          user: users.find(user => user.id === reservation.userId)!,
          organization: organizations.find(org => org.id === reservation.organizationId)!,
          space: spaces.find(space => space.id === reservation.spaceId)!,
          worker: (content.workerId === 0) ? null : workers.find(worker => worker.id === content.workerId)!,
          content
        };
      }),
      count
    };
  }

  async getReservationList(
    organizationId: number,
    limit: number,
    offset: number,
  ): Promise<IDataResponse<IReservationAll[]>> {
    const { data: reservations, count } = await this.reservationRepository.fetch({
      organizationId,
      limit,
      offset,
    });

    const userIds = reservations.map((reservation) => reservation.userId);
    const organizationIds = reservations.map((reservation) => reservation.organizationId);
    const spaceIds = reservations.map((reservation) => reservation.spaceId);

    const [users, organizations, spaces, reservationContents] = await Promise.all([
      this.userPublicService.fetchAllByIds(userIds).then(takeAll(userIds, 'users')),
      this.organizationPublicService.fetchByIds(organizationIds),
      this.spacePublicService.fetchAllByIds(spaceIds),
      this.reservationPublicService.getReservationContentByIds(reservations.map((reservation) => reservation.id)),
    ]) as [IUser[], IOrganization[], ISpace[], IReservationContent[]];


    const workerIds = reservationContents.map(content => content.workerId).filter(id => id !== 0);
    const workers = await this.userPublicService.fetchAllByIds(workerIds)
      .then(takeAll(workerIds, 'workers'));

    checkContainAllId(userIds, users, 'users');
    checkContainAllId(organizationIds, organizations, 'organizations');
    checkContainAllId(spaceIds, spaces, 'spaces');
    checkContainAllId(workerIds, workers, 'workers');

    return {
      data: reservations.map((reservation) => {
        const content = reservationContents.find(content => content.id === reservation.id)!;
        return {
          ...reservation,
          user: users.find(user => user.id === reservation.userId)!,
          organization: organizations.find(org => org.id === reservation.organizationId)!,
          space: spaces.find(space => space.id === reservation.spaceId)!,
          worker: (content.workerId === 0) ? null : workers.find(worker => worker.id === content.workerId)!,
          content
        };
      }),
      count
    };
  }
  // 사용안함
  // private getDefaultStatus(spaceType: SpaceTypeEnum): ReservationStateEnum {
  //   switch (spaceType) {
  //     // 기본적으로 GRANT 상태로 예약
  //     case SpaceTypeEnum.INDIVIDUAL:
  //     case SpaceTypeEnum.PIANO:
  //     case SpaceTypeEnum.SEMINAR:
  //     case SpaceTypeEnum.DANCE:
  //     case SpaceTypeEnum.GROUP:
  //     case SpaceTypeEnum.OPEN:
  //     case SpaceTypeEnum.WORK:
  //       return ReservationStateEnum.GRANT;
  //     // WAIT 상태로 예약
  //     case SpaceTypeEnum.MIRAE:
  //     case SpaceTypeEnum.SUMI:
  //       return ReservationStateEnum.WAIT;
  //   }
  // }

  async getWorkHistory(userId: number) {
    const reservations = await this.reservationRepository.fetchByWorkerId(userId);

    const userIds = reservations.map((reservation) => reservation.userId);
    const organizationIds = reservations.map((reservation) => reservation.organizationId);
    const spaceIds = reservations.map((reservation) => reservation.spaceId);

    const [users, organizations, spaces, reservationContents] = await Promise.all([
      this.userPublicService.fetchAllByIds(userIds).then(takeAll(userIds, 'users')),
      this.organizationPublicService.fetchByIds(organizationIds),
      this.spacePublicService.fetchAllByIds(spaceIds),
      this.reservationPublicService.getReservationContentByIds(reservations.map((reservation) => reservation.id)),
    ]) as [IUser[], IOrganization[], ISpace[], IReservationContent[]];

    const workerIds = reservationContents.map(content => content.workerId).filter(id => id !== 0);
    const workers = await this.userPublicService.fetchAllByIds(workerIds)
      .then(takeAll(workerIds, 'workers'));

    checkContainAllId(userIds, users, 'users');
    checkContainAllId(organizationIds, organizations, 'organizations');
    checkContainAllId(spaceIds, spaces, 'spaces');
    checkContainAllId(workerIds, workers, 'workers');

    return reservations.map((reservation) => {
      const content = reservationContents.find(content => content.id === reservation.id)!;
      return {
        ...reservation,
        user: users.find(user => user.id === reservation.userId)!,
        organization: organizations.find(org => org.id === reservation.organizationId)!,
        space: spaces.find(space => space.id === reservation.spaceId)!,
        worker: (content.workerId === 0) ? null : workers.find(worker => worker.id === content.workerId)!,
        content
      };
    });
  }

  async getWorkNeeds() {
    const reservations = await this.reservationRepository.fetchWorkNeeds();

    const userIds = reservations.map((reservation) => reservation.userId);
    const organizationIds = reservations.map((reservation) => reservation.organizationId);
    const spaceIds = reservations.map((reservation) => reservation.spaceId);

    const [users, organizations, spaces, reservationContents] = await Promise.all([
      this.userPublicService.fetchAllByIds(userIds).then(takeAll(userIds, 'users')),
      this.organizationPublicService.fetchByIds(organizationIds),
      this.spacePublicService.fetchAllByIds(spaceIds),
      this.reservationPublicService.getReservationContentByIds(reservations.map((reservation) => reservation.id)),
    ]) as [IUser[], IOrganization[], ISpace[], IReservationContent[]];

    const workerIds = reservationContents.map(content => content.workerId).filter(id => id !== 0);
    const workers = await this.userPublicService.fetchAllByIds(workerIds)
      .then(takeAll(workerIds, 'workers'));

    checkContainAllId(userIds, users, 'users');
    checkContainAllId(organizationIds, organizations, 'organizations');
    checkContainAllId(spaceIds, spaces, 'spaces');
    checkContainAllId(workerIds, workers, 'workers');

    return reservations.map((reservation) => {
      const content = reservationContents.find(content => content.id === reservation.id)!;
      return {
        ...reservation,
        user: users.find(user => user.id === reservation.userId)!,
        organization: organizations.find(org => org.id === reservation.organizationId)!,
        space: spaces.find(space => space.id === reservation.spaceId)!,
        worker: (content.workerId === 0) ? null : workers.find(worker => worker.id === content.workerId)!,
        content
      };
    });
  }

  async postReservation(
    reservationInput: IReservationCreate,
    actor: IUser,
  ): Promise<IReservation> {

    await this.reservationPublicService.checkWholeTime(
      reservationInput.userId,
      reservationInput.organizationId,
      reservationInput.spaceId,
      reservationInput.timeFrom,
      reservationInput.timeTo
    );


    const [user, organization, space] = await Promise.all([
      this.userPublicService.fetchById(reservationInput.userId),
      this.organizationPublicService.fetchById(reservationInput.organizationId),
      this.spacePublicService.fetchById(reservationInput.spaceId),
    ]);

    if (!user) throw new BadRequestException('User not found');
    if (!organization) throw new BadRequestException('Organization not found');
    if (!space) throw new BadRequestException('Space not found');

    if (!UserUtils.isManager(actor.type)) {
      await this.penaltyPublicService.assertReservable(
        reservationInput.userId,
        reservationInput.organizationId,
        space.spaceType,
      );
    }

    if (!UserUtils.isManager(user.type)) {
      const userOrganizations = await this.organizationPublicService.fetchByUserId(reservationInput.userId);
      if (!userOrganizations.some(org => org.id === reservationInput.organizationId)) {
        throw new BadRequestException('User does not belong to the specified organization');
      }
    }

    await this.reservationPublicService.validateSpaceTimeConstraints(
      reservationInput.userId,
      reservationInput.organizationId,
      space,
      reservationInput.timeFrom,
      reservationInput.timeTo
    )

    // 세미나실 추첨 기간 겹침 검증
    await this.reservationPublicService.validateSeminarLotteryConflict(
      reservationInput.userId,
      space,
      reservationInput.timeFrom,
      reservationInput.timeTo
    );

    await this.reservationPublicService.validatePerformanceLotteryConflict(
      reservationInput.userId,
      space,
      reservationInput.timeFrom,
      reservationInput.timeTo
    );

    const [reservation, reservationContent] = await this.reservationRepository.insert(reservationInput);

    const timeFrom = getString(reservation.timeFrom)
    const timeTo = getString(reservation.timeTo)
    const workerNeed: boolean = reservationContent.workerNeed

    const templateFooter: string = organization.id === 1 ? "문의사항이 있으시면 언제든 연락해 주세요." : "이 메일은 예약자 본인 및 조직에 등록된 모든 구성원에게 발송되었습니다."
    const templateFooterEn: string = organization.id === 1 ? "Please feel free to contact us if you have any questions." : "This email has been sent to the reservation holder and all members registered with the organization."
    const meta = { ...ReservationMeta.ReservationCompleted, timeFrom, timeTo, templateFooter, templateFooterEn }
    const organizationWithMembers = organization.id !== 1 ? await this.organizationPublicService.fetchDeepById(organization.id) : undefined

    if (!organizationWithMembers && organization.id !== 1) {
      throw new BadRequestException('Organization fetch error : Please Contact by Email.')
    }

    try {
      await this.mailService.sendMail({
        to: organization.id === 1 ? user.email : organizationWithMembers.members.map(member => member.user.email),
        subject: `[SCSpace] Reservation Confirmed - ${reservation.title}`,
        // bcc: 'scspace.kaist@gmail.com',
        template: "reservationPosted",
        replyTo: "scspace@kaist.ac.kr",
        context: {
          reservation: {
            ...reservation,
            user,
            space,
            organization,
            workerNeed
          },
          meta
        }
      })

      if (workerNeed) {
        const workers = await this.userPublicService.fetchAllWorker()

        const workerMeta = {
          ...ReservationMeta.WorkerNotif,
          timeTo,
          timeFrom,
        }

        await this.mailService.sendMail({
          to: workers.map(worker => worker.email),
          subject: `[SCSpace] New Work-Request Reservation Created`,
          cc: 'scspace.kaist@gmail.com', // for scspace workers
          bcc: 'jhlee012@kaist.ac.kr',
          template: "reservationPosted",
          replyTo: "scspace@kaist.ac.kr",
          context: {
            reservation: {
              ...reservation,
              user,
              space,
              organization,
              workerNeed
            },
            workerMail: true,
            meta: workerMeta
          }
        })
      }
    } catch (error) {
      console.log(error)
      await this.mailService.reportError(
        error instanceof Error
          ? error
          : new Error(String(error)),
        "Post New Reservation - Mail Sector")
    }

    return MReservation.fromDB(
      reservation,
      reservationContent,
    )
  }

  async assignWorker(param: IReservationApplyWorker) {
    const { id, workerId } = param;
    const { data: reservation } = await this.reservationRepository.fetch({ id, });

    if (reservation.length === 0) {
      throw new NotFoundException('Reservation not found');
    }


    const worker = await this.userPublicService.fetchById(workerId);

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const reservationContent = await this.reservationRepository.fetchContent(reservation[0].id);

    const [reservationUpdated, reservationContentUpdated] = await this.reservationRepository.update({
      ...reservation[0],
      content: {
        ...reservationContent,
        workerId
      }
    });

    //MAILER

    try {
      //mail const
      const timeFrom = getString(reservationUpdated.timeFrom)
      const timeTo = getString(reservationUpdated.timeTo)

      const user = await this.userPublicService.fetchById(reservationUpdated.userId)
      const organizationName = reservationUpdated.organizationId === 1 ? 'individual' : await this.organizationPublicService.fetchById(reservationUpdated.organizationId).then(org => org.name)
      const space = await this.spacePublicService.fetchById(reservationUpdated.spaceId)

      const metaWorker = {
        meta: {
          ...WorkerMeta.forWorker,
          timeFrom,
          timeTo,
        },
        reservation: reservationUpdated,
        worker: worker,
        user: user,
        organizationName: organizationName,
        space: space,
      }

      const metaAuthor = {
        meta: {
          ...WorkerMeta.forAuthor,
          timeFrom,
          timeTo,
        },
        reservation: reservationUpdated,
        worker: worker,
        user: user,
        organizationName: organizationName,
        space: space,
      }

      //Send to Author
      await this.mailService.sendMail({
        to: user.email,
        bcc: "scspace.kaist@gmail.com",
        subject: "[SCSpace] 근로장학생 배정 안내",
        context: metaAuthor,
        template: "worker"
      })

      //Send to Worker
      await this.mailService.sendMail({
        to: worker.email,
        bcc: "scspace.kaist@gmail.com",
        subject: "[SCSpace] 근로 할당 확정 안내",
        context: metaWorker,
        template: "worker"
      })
    } catch (error) {
      console.log(error)
      await this.mailService.reportError(
        error instanceof Error
          ? error
          : new Error(String(error)),
        "Worker - Mail Sector")
    }

    return MReservation.fromDB(reservationUpdated, reservationContentUpdated);
  }

  async updateReservation(
    reservationInput: Omit<IReservationUpdate, "workerId">,
    actor: IUser,
  ): Promise<MReservation> {
    const { data: reservation } = await this.reservationRepository.fetch({
      id: reservationInput.id,
    });

    if (reservation.length === 0) {
      throw new NotFoundException('Reservation not found');
    }

    await this.reservationPublicService.checkWholeTime(
      reservation[0].userId,
      reservation[0].organizationId,
      reservation[0].spaceId,
      reservationInput.timeFrom,
      reservationInput.timeTo,
      reservationInput.id,
    );


    const [user, space, organization] = await Promise.all([
      this.userPublicService.fetchById(reservation[0].userId),
      this.spacePublicService.fetchById(reservation[0].spaceId),
      this.organizationPublicService.fetchById(reservation[0].organizationId)
    ]);

    if (!user) throw new BadRequestException('User not found');
    if (!organization) throw new BadRequestException('Organization not found');
    if (!space) throw new BadRequestException('Space not found');

    const isTimeChanged =
      (reservationInput.timeFrom ?? reservation[0].timeFrom) !== reservation[0].timeFrom ||
      (reservationInput.timeTo ?? reservation[0].timeTo) !== reservation[0].timeTo;
    if (isTimeChanged && !UserUtils.isManager(actor.type)) {
      await this.penaltyPublicService.assertReservable(
        reservation[0].userId,
        reservation[0].organizationId,
        space.spaceType,
      );
    }

    await this.reservationPublicService.validateSpaceTimeConstraints(
      reservation[0].userId,
      reservation[0].organizationId,
      space,
      reservationInput.timeFrom,
      reservationInput.timeTo
    )
    // 공간 정보 조회하여 세미나실 추첨 기간 겹침 검증
    await this.reservationPublicService.validateSeminarLotteryConflict(
      reservation[0].userId,
      space,
      reservationInput.timeFrom,
      reservationInput.timeTo
    );

    await this.reservationPublicService.validatePerformanceLotteryConflict(
      reservation[0].userId,
      space,
      reservationInput.timeFrom,
      reservationInput.timeTo
    );

    const [reservationUpdated, reservationContentUpdated] = await this.reservationRepository.update(reservationInput);

    //Mail 관련은 작동하지 않아도 상관없도록 try-catch with await
    try {
      const timeFrom = getString(reservationUpdated.timeFrom)
      const timeTo = getString(reservationUpdated.timeTo)
      const workerNeed: boolean = reservationContentUpdated.workerNeed
      const templateFooter: string =
        organization.id === 1
          ? '문의사항이 있으시면 언제든 연락해 주세요.'
          : '이 메일은 예약자 본인 및 조직에 등록된 모든 구성원에게 발송되었습니다.';
      const templateFooterEn: string =
        organization.id === 1
          ? 'Please feel free to contact us if you have any questions.'
          : 'This email has been sent to the reservation holder and all members registered with the organization.';
      const meta = {
        ...ReservationMeta.ReservationUpdated,
        timeFrom,
        timeTo,
        templateFooter,
        templateFooterEn,
      };

      const organizationWithMembers =
        organization.id !== 1
          ? await this.organizationPublicService.fetchDeepById(organization.id)
          : undefined;

      await this.mailService.sendMail({
        to:
          organization.id === 1
            ? user.email
            : organizationWithMembers.members.map((member) => member.user.email),
        subject: `[SCSpace] Reservation Updated - ${reservation[0].title}`,
        // bcc: 'scspace.kaist@gmail.com',
        template: 'reservationPosted',
        replyTo: 'scspace@kaist.ac.kr',
        context: {
          reservation: {
            ...reservation[0],
            user,
            space,
            organization,
            workerNeed
          },
          meta,
        },
      });
    } catch (error) {
      console.log(error)
      await this.mailService.reportError(
        error instanceof Error
          ? error
          : new Error(String(error)),
        "Update Reservation - Mail Sector")
    }

    return MReservation.fromDB(reservationUpdated, reservationContentUpdated);
  }

  async deleteReservation(id: number, user: IUser): Promise<ISuccessResponse> {
    const { data: reservation } = await this.reservationRepository.fetch({
      id: id,
    });
    if (reservation.length === 0) {
      throw new NotFoundException('Reservation not found');
    }
    // individual
    if (id === 1) {
      if (reservation[0].userId !== user.id) {
        throw new BadRequestException(
          'User does not have permission to delete this reservation',
        );
      }
    }
    const [space, organization] = await Promise.all([
      this.spacePublicService.fetchById(reservation[0].spaceId),
      this.organizationPublicService.fetchById(reservation[0].organizationId),
    ]);
    const result = await this.reservationRepository.delete(id);
    if (!result) {
      throw new NotFoundException('Reservation not found');
    }

    //Mail관련은 전부 try-catch with await for Error Control
    try {
      const timeFrom = getString(reservation[0].timeFrom);
      const timeTo = getString(reservation[0].timeTo);
      const workerNeed: boolean = false

      //조직의 경우 모든 구성원에게 발송함 Notif
      const templateFooter: string =
        organization.id === 1
          ? '문의사항이 있으시면 언제든 연락해 주세요.'
          : '이 메일은 예약자 본인 및 조직에 등록된 모든 구성원에게 발송되었습니다.';
      const templateFooterEn: string =
        organization.id === 1
          ? 'Please feel free to contact us if you have any questions.'
          : 'This email has been sent to the reservation holder and all members registered with the organization.';
      const meta = {
        ...ReservationMeta.ReservationDeleted,
        timeFrom,
        timeTo,
        templateFooter,
        templateFooterEn,
      };

      const organizationWithMembers =
        organization.id !== 1
          ? await this.organizationPublicService.fetchDeepById(organization.id)
          : undefined;

      await this.mailService.sendMail({
        to:
          organization.id === 1
            ? user.email
            : organizationWithMembers.members.map((member) => member.user.email),
        subject: `[SCSpace] Reservation Deleted - ${reservation[0].title}`,
        // bcc: 'scspace.kaist@gmail.com',
        template: 'reservationPosted',
        replyTo: 'scspace@kaist.ac.kr',
        context: {
          reservation: {
            ...reservation[0],
            user,
            space,
            organization,
            workerNeed
          },
          meta,
        },
      });
    } catch (error) {
      console.log(error)
      await this.mailService.reportError(
        error instanceof Error
          ? error
          : new Error(String(error)),
        "Delete Reservation - Mail Sector")
    }
    return {
      success: true,
    };
  }

  async getManageReservation(): Promise<IReservationAll[]> {
    const { data: reservations } = await this.reservationRepository.fetch({
      states: [ReservationStateEnum.RECEIVED, ReservationStateEnum.WAIT],
    });

    return await this.toReservationAll(reservations);
  }

  async getDutyReservation(
    timeFrom: number,
    timeTo: number,
  ): Promise<IReservationAll[]> {
    if (timeFrom >= timeTo)
      throw new BadRequestException('timeFrom must be before timeTo');

    const { data: reservations } = await this.reservationRepository.fetch({
      states: [
        ReservationStateEnum.GRANT,
        ReservationStateEnum.WAIT,
        ReservationStateEnum.RECEIVED,
      ],
      timeRange: { timeFrom, timeTo },
    });

    return (await this.toReservationAll(reservations)).sort(
      (a, b) => a.timeFrom - b.timeFrom,
    );
  }

  private async toReservationAll(
    reservations: MReservationSimple[],
  ): Promise<IReservationAll[]> {
    if (reservations.length === 0) return [];

    const userIds = reservations.map((reservation) => reservation.userId);
    const organizationIds = reservations.map(
      (reservation) => reservation.organizationId,
    );
    const spaceIds = reservations.map((reservation) => reservation.spaceId);

    const [users, organizations, spaces, reservationContents] =
      (await Promise.all([
        this.userPublicService
          .fetchAllByIds(userIds)
          .then(takeAll(userIds, 'users')),
        this.organizationPublicService.fetchByIds(organizationIds),
        this.spacePublicService.fetchAllByIds(spaceIds),
        this.reservationPublicService.getReservationContentByIds(
          reservations.map((reservation) => reservation.id),
        ),
      ])) as [IUser[], IOrganization[], ISpace[], IReservationContent[]];

    const workerIds = reservationContents.map(content => content.workerId).filter(id => id !== 0);
    const workers = await this.userPublicService.fetchAllByIds(workerIds)
      .then(takeAll(workerIds, 'workers'));

    checkContainAllId(userIds, users, 'users');
    checkContainAllId(organizationIds, organizations, 'organizations');
    checkContainAllId(spaceIds, spaces, 'spaces');
    checkContainAllId(workerIds, workers, 'workers');

    return reservations.map((reservation) => {
      const content = reservationContents.find((content) => content.id === reservation.id,)!;
      return {
        ...reservation,
        user: users.find((user) => user.id === reservation.userId)!,
        organization: organizations.find((org) => org.id === reservation.organizationId,)!,
        space: spaces.find((space) => space.id === reservation.spaceId)!,
        content,
        worker: (content.workerId === 0) ? null : workers.find((worker) => worker.id === content.workerId)!,
      };
    });
  }
}
