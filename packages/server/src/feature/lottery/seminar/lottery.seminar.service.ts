import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { OrganizationPublicService } from '@scspace-server/feature/organization/organization.public.service';
import { LotterySeminarRepository } from './lottery.seminar.repository';
import { LotterySeminarInfoRepository } from './lottery.seminar.info.repository';
import { MSeminarLottery } from './lottery.seminar.model';
import { MSeminarLotteryInfo } from './lottery.seminar.info.model';
import { OrganizationStatusEnum } from '@scspace-depot/enums/organization.enum';
import {
    ILotteryInfoCreate,
    ILotteryInfoUpdate,
    ISeminarLotteryCreate,
} from '@scspace-depot/types/lottery';
import {
    getDate,
    getDateBegin,
    getDateEnd,
    getNow,
    getRandomIndex,
    getTime,
} from '@scspace-server/common/utils';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SpacePublicService } from '@scspace-server/feature/space/space.public.service';
import { SpaceTypeEnum } from '@scspace-depot/enums/space.enum';
import { ReservationPublicService } from '@scspace-server/feature/reservation/reservation.public.service';
import { IReservationMultipleCreateResurt } from '@scspace-depot/types/reservation';
import { MailService } from '@scspace-server/tools/mailer/mail.service';
import { UserPublicService } from '@scspace-server/feature/user/user.public.service';
import { LotteryMeta } from "@scspace-depot/enums/mail.enum";
import { PenaltyPublicService } from "@scspace-server/feature/penalty/penalty.public.service";
import { PenaltyTargetEnum } from "@scspace-depot/enums/penalty.enum";

const weekDays = [
    { key: "sunday", label: "Sun", index: 0 },
    { key: "monday", label: "Mon", index: 1 },
    { key: "tuesday", label: "Tue", index: 2 },
    { key: "wednesday", label: "Wed", index: 3 },
    { key: "thursday", label: "Thu", index: 4 },
    { key: "friday", label: "Fri", index: 5 },
    { key: "saturday", label: "Sat", index: 6 },
];

@Injectable()
export class LotterySeminarService {
    // This service will handle the data access for seminar lottery-related operations
    // Currently, no specific methods are defined
    constructor(
        private readonly organizationPublicService: OrganizationPublicService,
        private readonly spacePublicService: SpacePublicService,
        @Inject(forwardRef(() => ReservationPublicService))
        private readonly reservationPublicService: ReservationPublicService,
        private readonly lotterySeminarRepository: LotterySeminarRepository,
        private readonly lotterySeminarInfoRepository: LotterySeminarInfoRepository,
        private readonly mailService: MailService,
        private readonly userPublicService: UserPublicService,
        private readonly penaltyPublicService: PenaltyPublicService,
    ) { }

    async getAllSeminarLotteryInfo(): Promise<MSeminarLotteryInfo[]> {
        // 자동 정렬된 모든 세미나 추첨 정보 조회
        return await this.lotterySeminarInfoRepository.fetchAll();
    }

    async getActiveSeminarLotteryInfo(): Promise<MSeminarLotteryInfo[]> {
        // 현재 진행 중인 추첨 정보들 조회 (시간 순 정렬)
        const now = getNow();
        return await this.lotterySeminarInfoRepository.fetchActiveLotteries(now);
    }

    async getUpcomingSeminarLotteryInfo(): Promise<MSeminarLotteryInfo[]> {
        // 예정된 추첨 정보들 조회 (시간 순 정렬)
        const now = getNow();
        return await this.lotterySeminarInfoRepository.fetchUpcomingLotteries(now);
    }

    /**
     * 시간 겹침 검증 - 추첨 시작 시간부터 행사 끝 시간까지 겹치는지 확인
     */
    private async validateTimeConflict(
        lotteryInfo: { timeLotteryStart: number; timeEnd: number },
        excludeId?: number,
    ): Promise<void> {
        const allLotteries = await this.lotterySeminarInfoRepository.fetchAll();

        // 현재 수정 중인 항목은 제외
        const otherLotteries = excludeId
            ? allLotteries.filter((lottery) => lottery.id !== excludeId)
            : allLotteries;

        const newStartTime = lotteryInfo.timeLotteryStart;
        const newEndTime = lotteryInfo.timeEnd;

        for (const existingLottery of otherLotteries) {
            const existingStartTime = existingLottery.timeLotteryStart;
            const existingEndTime = existingLottery.timeEnd;

            // 시간 겹침 검사: 새로운 기간과 기존 기간이 겹치는지 확인
            // A: [newStartTime ---- newEndTime]
            // B: [existingStartTime ---- existingEndTime]
            // 겹치지 않는 조건: newEndTime <= existingStartTime OR newStartTime >= existingEndTime
            // 겹치는 조건: !(겹치지 않는 조건)
            const isOverlapping = !(
                newEndTime <= existingStartTime || newStartTime >= existingEndTime
            );

            if (isOverlapping) {
                throw new BadRequestException(
                    `Time conflict detected. The period from lottery start to event end overlaps with existing lottery (ID: ${existingLottery.id})`,
                );
            }
        }
    }

    async postSeminarLotteryInfo(params: {
        lotteryInfo: ILotteryInfoCreate;
    }): Promise<MSeminarLotteryInfo> {
        const now = getNow();

        // 시간 유효성 검증
        if (params.lotteryInfo.timeLotteryStart < now) {
            throw new BadRequestException('Lottery time cannot be in the past');
        }
        if (
            params.lotteryInfo.timeLotteryEnd < params.lotteryInfo.timeLotteryStart
        ) {
            throw new BadRequestException(
                'Lottery end time cannot be before start time',
            );
        }
        if (params.lotteryInfo.timeStart < params.lotteryInfo.timeLotteryEnd) {
            throw new BadRequestException(
                'Start time cannot be before lottery end time',
            );
        }
        if (params.lotteryInfo.timeEnd < params.lotteryInfo.timeStart) {
            throw new BadRequestException('Start time cannot be after end time');
        }

        // 시간 겹침 검증
        await this.validateTimeConflict({
            timeLotteryStart: params.lotteryInfo.timeLotteryStart,
            timeEnd: params.lotteryInfo.timeEnd,
        });

        // 추첨 정보 생성 (자동 정렬됨)
        return await this.lotterySeminarInfoRepository.insert({
            timeStart: getDateBegin(params.lotteryInfo.timeStart),
            timeEnd: getDateEnd(params.lotteryInfo.timeEnd),
            timeLotteryStart: getDateBegin(params.lotteryInfo.timeLotteryStart),
            timeLotteryEnd: getDateEnd(params.lotteryInfo.timeLotteryEnd),
        });
    }

    async updateSeminarLotteryInfo(params: {
        id: number;
        updateLotteryInfo: ILotteryInfoUpdate;
    }): Promise<MSeminarLotteryInfo> {
        const seminarLotteryInfo = await this.lotterySeminarInfoRepository.fetch({
            id: params.id,
        });
        if (!seminarLotteryInfo) {
            throw new BadRequestException('Seminar lottery info not found');
        }

        const now = getNow();

        // 업데이트할 값들을 기존 값과 병합
        const mergedLotteryInfo = {
            timeLotteryStart:
                params.updateLotteryInfo.timeLotteryStart ??
                seminarLotteryInfo.timeLotteryStart,
            timeLotteryEnd:
                params.updateLotteryInfo.timeLotteryEnd ??
                seminarLotteryInfo.timeLotteryEnd,
            timeStart:
                params.updateLotteryInfo.timeStart ?? seminarLotteryInfo.timeStart,
            timeEnd: params.updateLotteryInfo.timeEnd ?? seminarLotteryInfo.timeEnd,
        };

        // 시간 유효성 검증
        if (mergedLotteryInfo.timeLotteryStart < now) {
            throw new BadRequestException('Lottery time cannot be in the past');
        }
        if (mergedLotteryInfo.timeLotteryEnd < mergedLotteryInfo.timeLotteryStart) {
            throw new BadRequestException("Lottery end time cannot be before start time");
        }
        if (mergedLotteryInfo.timeStart < mergedLotteryInfo.timeLotteryEnd) {
            throw new BadRequestException("Start time cannot be before lottery end time");
        }
        if (mergedLotteryInfo.timeEnd < mergedLotteryInfo.timeStart) {
            throw new BadRequestException("Start time cannot be after end time");
        }

        // 시간 겹침 검증 (현재 수정 중인 항목 제외)
        await this.validateTimeConflict({
            timeLotteryStart: mergedLotteryInfo.timeLotteryStart,
            timeEnd: mergedLotteryInfo.timeEnd
        }, params.id);

        // 추첨 정보 업데이트 (자동 정렬됨)
        return await this.lotterySeminarInfoRepository.update(params);
    }

    async deleteSeminarLotteryInfo(id: number): Promise<boolean> {
        const seminarLotteryInfo = await this.lotterySeminarInfoRepository.fetch({ id });
        if (!seminarLotteryInfo) {
            throw new BadRequestException("Seminar lottery info not found");
        }
        // Implementation for deleting seminar lottery info
        return await this.lotterySeminarInfoRepository.delete(id);
    }

    async getSeminarLotteryByOrganization(params: {
        organizationId: number;
        spaceId: number;
        infoId: number;
    }): Promise<MSeminarLottery[]> {
        // Implementation for fetching organization lottery data
        // This is a placeholder implementation
        return this.lotterySeminarRepository.fetch(params);
    }

    async getSeminarLotteryByTime(params: {
        time: number;
        spaceId: number;
        infoId: number;
    }): Promise<MSeminarLottery[]> {
        // Implementation for fetching seminar lottery data by time
        return this.lotterySeminarRepository.fetch(params);
    }

    async postSeminarLottery(params: {
        lottery: ISeminarLotteryCreate
    }): Promise<MSeminarLottery> {
        const organization = await this.organizationPublicService.fetchById(params.lottery.organizationId);
        if (!organization) {
            throw new BadRequestException("Organization not found");
        }
        if (organization.status !== OrganizationStatusEnum.VERIFIED) {
            throw new BadRequestException("Only verified organizations can create seminar lotteries");
        }

        const activeLottery = await this.lotterySeminarInfoRepository.fetchActiveLotteries(getNow());
        if (activeLottery.length === 0 || activeLottery[0].id !== params.lottery.infoId) {
            throw new BadRequestException("Active lottery not found");
        }

        const drawnLotteries = await this.lotterySeminarRepository.fetch({
            spaceId: params.lottery.spaceId,
            time: params.lottery.time,
            infoId: params.lottery.infoId,
            lotteryWin: 1
        });
        if (drawnLotteries.length > 0) {
            throw new BadRequestException("A seminar lottery with the same time has already been drawn.");
        }

        const pastLotteries = await this.lotterySeminarRepository.fetch({
            organizationId: params.lottery.organizationId,
            infoId: params.lottery.infoId
        });
        if (pastLotteries.find(lottery => lottery.time === params.lottery.time)) {
            throw new BadRequestException("A seminar lottery with the same time already exists.");
        }
        if (pastLotteries.length >= 2) {
            throw new BadRequestException("Maximum number of seminar lotteries is 2. Cannot create more.");
        }

        const space = await this.spacePublicService.fetchById(params.lottery.spaceId);
        if (!space) {
            throw new BadRequestException("Space not found");
        }
        await this.penaltyPublicService.assertNotRestricted(
            {
                targetType: PenaltyTargetEnum.ORGANIZATION,
                targetId: params.lottery.organizationId,
            },
            space.spaceType,
        );
        // Implementation for inserting a new seminar lottery
        return await this.lotterySeminarRepository.insert(params.lottery);
    }


    async getSeminarLotteryTimeSlotCounts(param: { spaceId: number; infoId: number }): Promise<{ time: number; count: number }[]> {
        // 모든 시간대에 대해 신청한 조직 수 반환
        return await this.lotterySeminarRepository.fetchTimeSlotCounts(param.spaceId, param.infoId);
    }

    async getDrawnSeminarLottery(param: { spaceId: number; infoId: number }): Promise<MSeminarLottery[]> {
        return await this.lotterySeminarRepository.fetch({
            spaceId: param.spaceId,
            infoId: param.infoId,
            lotteryWin: 1
        });
    }



    //currently non-usage
    private async timeDecode(time: number): Promise<{ dayIndex: number, hour: number }> {
        const dayIndex = Math.floor(time / 24);
        const hour = time % 24;
        return { dayIndex, hour };
    }

    private async timeDecodeString(time: number): Promise<{ dayString: string, hourString: string }> {
        const dayIndex: number = Math.floor(time / 24);
        const hour: number = time % 24;

        const dayString: string = await this.weekDayDecode(dayIndex);
        const hourString: string = String(hour).padStart(2, '0');

        return {
            dayString,
            hourString,
        }
    }

    private async timeRangeDecodeString(time: number): Promise<{ dayString: string, timeFromString: string, timeToString: string }> {
        const timeDecoded = await this.timeDecodeString(time);

        return {
            dayString: timeDecoded.dayString,
            timeFromString: timeDecoded.hourString,
            timeToString: String(parseInt(timeDecoded.hourString) + 1).padStart(2, '0')
        }

    }

    private async weekDayDecode(weekDay: number): Promise<string> {
        return weekDays.find(s => s.index == weekDay).label;
    }

    /**
     * @description "LOST"
     * @param byDraw Check if the action executed by the official draw [optional]
     * @param id Lottery's ID
     * */
    async deleteSeminarLottery(id: number, byDraw?: boolean): Promise<boolean> {
        const seminarLotteryArr = await this.lotterySeminarRepository.fetch({ id });
        if (!seminarLotteryArr) {
            throw new BadRequestException('Seminar lottery not found');
        }
        const seminarLottery = seminarLotteryArr[0];

        let res = await this.lotterySeminarRepository.delete(id);

        //send mail
        if (byDraw) {
            try {
                const [organization, space] = await Promise.all([
                    this.organizationPublicService.fetchById(
                        seminarLottery.organizationId,
                    ),
                    this.spacePublicService.fetchById(seminarLottery.spaceId),
                ]);

                const delegator = await this.userPublicService.fetchById(
                    organization.delegatorId,
                );

                let timeObj = await this.timeRangeDecodeString(seminarLottery.time)
                const timeStr = `${timeObj.dayString}, ${timeObj.timeFromString}:00 ~ ${timeObj.timeToString}:00`;

                const seminarMeta = { ...LotteryMeta.Seminar.Lost, timeRange: timeStr };

                await this.mailService.sendMail({
                    to: delegator.email,
                    subject: `[SCSpace] 세미나실 정기예약 추첨 결과 안내`,
                    bcc: 'scspace.kaist@gmail.com', //need to check
                    template: 'lotteryResult',
                    replyTo: 'scspace@kaist.ac.kr',
                    context: {
                        meta: seminarMeta,
                        lottery: seminarLottery,
                        space: space,
                        organization: organization,
                    },
                });
            } catch (error) {
                console.log(error);
                await this.mailService.reportError(
                    error instanceof Error ? error : new Error(String(error)),
                    'deleteSemniarLottery - Mail Sector',
                );
            }
        }

        return res;
    }

    /**
     * @description "WIN"
     * @param byDraw Check if the action executed by the official draw [optional]
     * @param id Lottery's ID
     * */
    async drawSeminarLottery(id: number, byDraw?: boolean): Promise<void> {
        const seminarLotteryArr = await this.lotterySeminarRepository.fetch({ id });
        if (!seminarLotteryArr) {
            throw new BadRequestException('Seminar lottery not found');
        }

        const seminarLottery = seminarLotteryArr[0];
        // Implementation for drawing seminar lottery
        await this.lotterySeminarRepository.update(id, { lotteryWin: 1 });

        Logger.log(`Seminar lottery drawn: ${id}`);

        //send mail
        if (byDraw) {
            try {
                const [organization, space] = await Promise.all([
                    this.organizationPublicService.fetchById(
                        seminarLottery.organizationId,
                    ),
                    this.spacePublicService.fetchById(seminarLottery.spaceId),
                ]);

                const delegator = await this.userPublicService.fetchById(
                    organization.delegatorId,
                );

                const timeObj = await this.timeRangeDecodeString(seminarLottery.time);
                const timeStr = `${timeObj.dayString}, ${timeObj.timeFromString}:00 ~ ${timeObj.timeToString}:00`;

                const seminarMeta = { ...LotteryMeta.Seminar.Win, timeRange: timeStr };

                await this.mailService.sendMail({
                    to: delegator.email,
                    subject: `[SCSpace] 세미나실 정기예약 추첨 결과 안내`,
                    bcc: 'scspace.kaist@gmail.com', //deprecated
                    template: 'lotteryResult',
                    replyTo: 'scspace@kaist.ac.kr',
                    context: {
                        meta: seminarMeta,
                        lottery: seminarLottery,
                        space: space,
                        organization: organization,
                    },
                });
            } catch (error) {
                Logger.log(error);
                await this.mailService.reportError(
                    error instanceof Error ? error : new Error(String(error)),
                    'drawSemniarLottery - Mail Sector',
                );
            }
        }
    }

    async applySeminarLottery(): Promise<IReservationMultipleCreateResurt[]> {
        const activeLottery = await this.lotterySeminarInfoRepository.fetchActiveLotteries(getNow());
        if (!activeLottery || activeLottery.length === 0) {
            throw new BadRequestException("No active lottery found");
        }
        if (activeLottery[0].applied) {
            throw new BadRequestException("You have already applied for this lottery");
        }

        const dateStart = getDate(activeLottery[0].timeStart);

        const verifiedOrganizations = await this.organizationPublicService.fetchVerified();

        const logs: IReservationMultipleCreateResurt[] = [];

        const seminarRooms = await this.spacePublicService.fetchAllBySpaceType(SpaceTypeEnum.SEMINAR);
        for (const space of seminarRooms) {
            for (const org of verifiedOrganizations) {
                const drawnLotteries = await this.lotterySeminarRepository.fetch({
                    organizationId: org.id,
                    spaceId: space.id,
                    infoId: activeLottery[0].id,
                    lotteryWin: 1
                });

                if (!drawnLotteries || drawnLotteries.length === 0) continue;

                const time: { timeFrom: number; timeTo: number }[] = [];
                let week = 0;
                const MAX_LOOP = 100;
                while (week < MAX_LOOP) {
                    let periodEnd = false;
                    for (const lottery of drawnLotteries) {
                        const day = Math.floor(lottery.time / 24);
                        const hour = lottery.time % 24;

                        if (dateStart.getDay() > day && week === 0) {
                            continue;
                        }

                        const timeFrom = getTime(new Date(
                            dateStart.getFullYear(),
                            dateStart.getMonth(),
                            dateStart.getDate() - dateStart.getDay() + day + 7 * week,
                            hour,
                        ));

                        const timeTo = getTime(new Date(
                            dateStart.getFullYear(),
                            dateStart.getMonth(),
                            dateStart.getDate() - dateStart.getDay() + day + 7 * week,
                            hour + 1,
                        ));

                        if (timeTo > activeLottery[0].timeEnd + 1) {
                            periodEnd = true;
                            break;
                        }

                        time.push({ timeFrom, timeTo });
                    }
                    if (periodEnd) break;
                    week++;
                }
                if (time.length === 0) continue;

                const log = await this.reservationPublicService.postMultipleReservation({
                    title: `세미나실 정기예약 [${org.name}]`,
                    spaceId: space.id,
                    userId: 1,
                    organizationId: org.id,
                    time,
                    content: {
                        description: `세미나실 정기예약 [${org.name}]`,
                        innerParticipantNumber: 20,
                        outerParticipantNumber: 0,
                        food: "",
                        busking: false,
                        workerNeed: false,
                        performance: false,
                    }
                })

                logs.push(log);
            }
        }

        await this.lotterySeminarInfoRepository.update({
            id: activeLottery[0].id,
            updateLotteryInfo: { applied: true }
        })

        return logs;
    }

    @Cron(CronExpression.EVERY_DAY_AT_6PM, { name: "drawing" })
    async drawing(): Promise<boolean> {
        Logger.log("Drawing seminar lottery...");

        const activeLottery = await this.lotterySeminarInfoRepository.fetchActiveLotteries(getNow());
        if (!activeLottery || activeLottery.length === 0) {
            throw new BadRequestException("No active lottery found");
        }
        if (activeLottery[0].applied) {
            throw new BadRequestException("You have already applied for this lottery");
        }

        const seminarRooms = await this.spacePublicService.fetchAllBySpaceType(SpaceTypeEnum.SEMINAR);
        const verifiedOrganizations = await this.organizationPublicService.fetchVerified();

        seminarRooms.map((s) => s.id).forEach(async (spaceId) => {
            Array.from({ length: 168 }).forEach(async (_, j) => {
                const drawnLotteries = await this.lotterySeminarRepository.fetch({
                    spaceId,
                    infoId: activeLottery[0].id,
                    time: j,
                    lotteryWin: 1,
                });
                if (drawnLotteries.length === 1) return;

                const lotteries = await this.lotterySeminarRepository.fetch({
                    spaceId,
                    infoId: activeLottery[0].id,
                    time: j,
                    lotteryWin: 0,
                });

                // Implementation for drawing the lottery
                if (lotteries.length === 0) {
                    return;
                }

                if (lotteries.length === 1) {
                    await this.drawSeminarLottery(lotteries[0].id, true);
                    return;
                }

                const lotteriesWithOrg = lotteries.map(lottery => ({
                    ...lottery,
                    organization: verifiedOrganizations.find(org => org.id === lottery.organizationId)
                }));

                const hasRoomLotteries = lotteriesWithOrg.filter(lottery => lottery.organization!.hasRoom);
                const hasNoRoomLotteries = lotteriesWithOrg.filter(lottery => !lottery.organization!.hasRoom);

                let winner = 0;
                if (hasRoomLotteries.length > 0) {
                    winner = hasRoomLotteries[getRandomIndex(hasRoomLotteries.length)].id;
                    await this.drawSeminarLottery(winner, true);
                } else {
                    winner = hasNoRoomLotteries[getRandomIndex(hasNoRoomLotteries.length)].id;
                    await this.drawSeminarLottery(winner, true);
                }
                Logger.log(`Winner drawn: ${winner}`);

                for (const lottery of lotteries) {
                    if (lottery.id !== winner) {
                        await this.deleteSeminarLottery(lottery.id, true);
                    }
                }
            });
        });

        return true;
    }
}
