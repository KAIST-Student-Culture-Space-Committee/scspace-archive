import {
    BadRequestException,
    Injectable, Logger,
    NotFoundException,
} from "@nestjs/common";
import {
    IRentalUpdate,
    IRentalAll,
    IGoodsCreate,
    IGoodsUpdate,
    IGoods,
    IUserRentalStatus,
    IRentalCreateClient,
} from '@scspace-depot/types/rental';
import { IDataResponse, ISuccessResponse } from '@scspace-depot/types/common';
import { checkContainAllId, takeAll, getNow, getDate, getTime, getDateDiffInMinute, getDateString, getDateBegin } from '@scspace-server/common/utils';
import { RentalRepository } from './rental.repository';
import { RentalPublicService } from './rental.public.service';
import { UserPublicService } from '../user/user.public.service';
import { IUser } from '@scspace-depot/types/user';
import { MAX_RENTAL_LIMIT } from '@scspace-depot/consts/rental.const';
import { FileService } from '@scspace-server/tools/file/file.service';
import { PdfService } from "@scspace-server/tools/pdf/pdf.service";
import { ICertificatePdf } from "@scspace-depot/types/pdf/pdf.type";
import { MailService } from "@scspace-server/tools/mailer/mail.service";
import { RentalMeta } from "@scspace-depot/enums/mail.enum";
import { OrganizationPublicService } from "@scspace-server/feature/organization/organization.public.service";
import { IOrganization } from "@scspace-depot/types/organization";
import { RentalStatusEnum } from "@scspace-depot/enums/rental.enum";

@Injectable()
export class RentalService {
    constructor(
        private readonly rentalRepository: RentalRepository,
        private readonly rentalPublicService: RentalPublicService,
        private readonly userPublicService: UserPublicService,
        private readonly fileService: FileService,
        private readonly pdfService: PdfService,
        private readonly mailService: MailService,
        private readonly organizationPublicService: OrganizationPublicService
    ) { }

    private async ensureIndividualOrganizationIfNeeded(organizationIds: number[]): Promise<void> {
        if (organizationIds.includes(1)) {
            await this.organizationPublicService.ensureIndividualOrganization();
        }
    }

    private async runCreateRentalSideEffects(
        id: number,
        meta: ICertificatePdf,
        user: IUser,
        organizationId: number,
    ): Promise<void> {
        try {
            const res = await this.pdfService.createAndStoreRentalCert(meta)
            await this.rentalRepository.updateRentalCert(id, res.filename);
        } catch (error) {
            const err = error instanceof Error
                ? error
                : new Error(String(error))

            Logger.error(`Rental certificate generation failed for rental ${id}: ${err.message}`, err.stack, RentalService.name);
            await this.mailService.reportError(err,
                "rental.service.ts > createRental > createAndStoreRentalCert")
                .catch(() => null);
        }

        try {
            await this.mailService.sendMail({
                to: "scspace.kaist@gmail.com",
                bcc: "jhlee012@kaist.ac.kr",
                template: "rentalNotif",
                subject: "[SCSpace] 새로운 대여가 있습니다.",
                context: {
                    meta: meta,
                }
            })
        } catch (error) {
            const err = error instanceof Error
                ? error
                : new Error(String(error))

            Logger.error(`Rental notification mail failed for rental ${id}: ${err.message}`, err.stack, RentalService.name);
            await this.mailService.reportError(err,
                "rental.service.ts > createRental > sendMail")
                .catch(() => null);
        }

        try {
            await this.mailService.sendMail({
                to: user.email,
                template: "rentalSuccess",
                subject: "[SCSpace] 대여 신청이 등록되었습니다.",
                context: {
                    meta: RentalMeta.createdSuccess,
                    rental: {
                        id,
                        goodsName: meta.goods.name,
                        quantity: meta.rentalQuantity,
                        borrowerName: user.nameKr,
                        organizationName: organizationId === 1 ? '개인' : '단체',
                        timeFrom: meta.rentalFrom,
                        timeTo: meta.rentalTo,
                    },
                }
            })
        } catch (error) {
            const err = error instanceof Error
                ? error
                : new Error(String(error))

            Logger.error(`Borrower rental success mail failed for rental ${id}: ${err.message}`, err.stack, RentalService.name);
            await this.mailService.reportError(err,
                "rental.service.ts > createRental > sendBorrowerMail")
                .catch(() => null);
        }
    }

    // Rental 관련 서비스 메서드들
    async createRental(rentalData: IRentalCreateClient & { rentalWorkerId : number} ): Promise<{ success: boolean; data: { id: number } }> {
        await this.ensureIndividualOrganizationIfNeeded([rentalData.organizationId]);

        // 1. 대여 개수 제한 확인
        const limitOk = await this.rentalPublicService.checkRentalLimit(rentalData.userId);
        if (!limitOk) {
            throw new BadRequestException(`User has reached the maximum rental limit: ${MAX_RENTAL_LIMIT}`);
        }

        if (rentalData.organizationId !== 1) {
            const limitOk2 = await this.rentalPublicService.checkRentalLimitOrganization(rentalData.organizationId);
            if (!limitOk2) {
                throw new BadRequestException(`Organization has reached the maximum rental limit: ${MAX_RENTAL_LIMIT}`)
            }
        }

        // 2. 현재 연체된 대여 확인
        const overdueOk = await this.rentalPublicService.checkCurrentOverdue(rentalData.userId, rentalData.organizationId);
        if (!overdueOk) {
            throw new BadRequestException('Cannot create new rental: user has overdue rentals that must be returned first');
        }

        // 3. 반납 기한 유효성 확인
        const now = getNow();
        const timeDue = rentalData.timeDue;
        if (!Number.isFinite(timeDue) || timeDue <= now) {
            throw new BadRequestException('Return due date must be after the rental start time');
        }


        // 물품 재고 확인
        const goods = await this.rentalPublicService.getGoodsById(rentalData.goodsId);
        if (!goods) {
            throw new NotFoundException('Goods not found');
        }

        if (goods.countNow < rentalData.count) {
            throw new BadRequestException('Insufficient stock');
        }

        const id = await this.rentalRepository.createRental({
            ...rentalData,
            timeBorrow: now,
            timeDue,
        });

        // 재고 업데이트
        await this.rentalRepository.updateGoodsStock(
            rentalData.goodsId,
            goods.countNow - rentalData.count
        );

        const user = await this.userPublicService.fetchById(rentalData.userId);

        // 3.4: 대여 성공 시 timeOverdue 초기화
        // if (user && user.timeOverdue !== 0) {
        //     await this.userPublicService.updateOverdue(rentalData.userId, {
        //         timeOverdue: 0
        //     });
        // }

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const rentalDuration = Math.max(
            1,
            Math.round(getDateDiffInMinute(getDateBegin(now), getDateBegin(timeDue)) / (60 * 24))
        );

        const meta: ICertificatePdf = {
            id: id,
            user: user,
            goods: goods,
            contact: user.email,
            rentalFrom: getDateString(now),
            rentalTo: getDateString(timeDue),
            rentalDuration,
            rentalQuantity: rentalData.count,
        }

        void this.runCreateRentalSideEffects(id, meta, user, rentalData.organizationId);

        return {
            success: true,
            data: { id }
        };
    }

    async getRentalById(id: number): Promise<IRentalAll> {
        const rental = await this.rentalPublicService.getRentalById(id);
        if (!rental) {
            throw new NotFoundException('Rental not found');
        }

        await this.ensureIndividualOrganizationIfNeeded([rental.organizationId]);

        const [user, organization, goods] = await Promise.all([
            this.userPublicService.fetchById(rental.userId),
            this.organizationPublicService.fetchById(rental.organizationId),
            this.rentalPublicService.getGoodsById(rental.goodsId),
        ]);

        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (!organization) {
            throw new NotFoundException('Organization not found');
        }
        if (!goods) {
            throw new NotFoundException('Goods not found');
        }

        return {
            ...rental,
            user,
            organization,
            goods,
        };
    }

    async getRentalList(
        limit: number = 50,
        offset: number = 0
    ): Promise<IDataResponse<IRentalAll[]>> {
        const { data: rentals, count } = await this.rentalRepository.fetchAllRentals(limit, offset);

        if (rentals.length === 0) {
            return { data: [], count };
        }

        const userIds = [...new Set(rentals.map(r => r.userId))];
        const organizationIds = [...new Set(rentals.map(r => r.organizationId))];
        const goodsIds = [...new Set(rentals.map(r => r.goodsId))];

        await this.ensureIndividualOrganizationIfNeeded(organizationIds);

        const [users, organizations, goods] = await Promise.all([
            this.userPublicService.fetchAllByIds(userIds).then(takeAll(userIds, 'users')),
            this.organizationPublicService.fetchByIds(organizationIds),
            this.rentalPublicService.getGoodsByIds(goodsIds),
        ]) as [IUser[], IOrganization[], IGoods[]];

        checkContainAllId(userIds, users, 'users');
        checkContainAllId(organizationIds, organizations, 'organizations');
        checkContainAllId(goodsIds, goods, 'goods');

        const rentalsWithDetails = rentals.map(rental => ({
            ...rental,
            user: users.find(u => u.id === rental.userId)!,
            organization : organizations.find(o => o.id === rental.organizationId),
            goods: goods.find(g => g.id === rental.goodsId)!,
        }));

        return {
            data: rentalsWithDetails,
            count
        };
    }

    // 만약 onlyIndividual == true 일 경우 개인 렌탈만 fetch
    // 만약 onlyIndividual == false 일 경우 개인 렌탈 + 개인이 속한 모든 조직의 렌탈까지 fetch
    async getUserRentals(params: IUserRentalStatus): Promise<IRentalAll[]> {
        const { userId, onlyIndividual, isActive } = params;

        //only 개인 렌탈
        if (onlyIndividual) {
            const { data: rentals, count } = await this.rentalPublicService.getRentalsByUserId(
                userId,
                isActive,
                50,
                0
            );

            if (rentals.length === 0) {
                return [];
            }

            const goodsIds = [...new Set(rentals.map(r => r.goodsId))];
            const organizationIds = [...new Set(rentals.map(r => r.organizationId))];

            await this.ensureIndividualOrganizationIfNeeded(organizationIds);

            const [user, organizations, goods] = await Promise.all([
                this.userPublicService.fetchById(userId),
                this.organizationPublicService.fetchByIds(organizationIds),
                this.rentalPublicService.getGoodsByIds(goodsIds),
            ]);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            checkContainAllId(organizationIds, organizations, 'organizations');
            checkContainAllId(goodsIds, goods, 'goods');

            return rentals.map(rental => ({
                ...rental,
                user,
                organization: organizations.find(o => o.id === rental.organizationId)!,
                goods: goods.find(g => g.id === rental.goodsId)!,
            }));
        }

        //개인렌탈 + 모든 개인 조직의 렌탈 (getRentalsFull)
        else {
            const { data: rentals, count } = await this.rentalPublicService.getRentalsFull(
                userId,
                isActive,
                50,
                0
            )

            if (rentals.length === 0) {
                return [];
            }

            const userIds = [...new Set(rentals.map(r => r.userId))];
            const organizationIds = [...new Set(rentals.map(r => r.organizationId))];
            const goodsIds = [...new Set(rentals.map(r => r.goodsId))];

            await this.ensureIndividualOrganizationIfNeeded(organizationIds);

            const [users, organizations, goods] = await Promise.all([
                this.userPublicService.fetchAllByIds(userIds),
                this.organizationPublicService.fetchByIds(organizationIds),
                this.rentalPublicService.getGoodsByIds(goodsIds)
            ])

            checkContainAllId(userIds, users, 'users');
            checkContainAllId(organizationIds, organizations, 'organizations');
            checkContainAllId(goodsIds, goods, 'goods');

            return rentals.map(rental => ({
                ...rental,
                user: users.find(u => u.id === rental.userId)!,
                organization : organizations.find(o => o.id === rental.organizationId)!,
                goods: goods.find(g => g.id === rental.goodsId)!,
            }))
        }
    }

    async getOrganizationRentals(params : { organizationId : number, isActive : boolean}): Promise<IRentalAll[]> {
        const { organizationId, isActive } = params;
        const { data: rentals, count } = await this.rentalPublicService.getRentalsByOrganizationId(organizationId, isActive, 50, 0);
        if (rentals.length === 0) {
            return [];
        }

        const userIds = [...new Set(rentals.map(r => r.userId))];
        const goodsIds = [...new Set(rentals.map(r => r.goodsId))];

        await this.ensureIndividualOrganizationIfNeeded([organizationId]);

        const [users, organization, goods] = await Promise.all([
            this.userPublicService.fetchAllByIds(userIds),
            this.organizationPublicService.fetchById(organizationId),
            this.rentalPublicService.getGoodsByIds(goodsIds),
        ])

        checkContainAllId(userIds, users, 'users');
        checkContainAllId(goodsIds, goods, 'goods');

        return rentals.map(rental => ({
            ...rental,
            user : users.find(u => u.id === rental.userId),
            organization,
            goods : goods.find(g => g.id === rental.goodsId)
        }))

    }

    async updateRental(id: number, updates: IRentalUpdate): Promise<ISuccessResponse> {
        const existingRental = await this.rentalPublicService.getRentalById(id);
        if (!existingRental) {
            throw new NotFoundException('Rental not found');
        }

        const nextGoodsId = updates.goodsId ?? existingRental.goodsId;
        const nextCount = updates.count ?? existingRental.count;

        if (nextCount <= 0) {
            throw new BadRequestException('Rental count must be greater than 0');
        }

        if (nextGoodsId !== existingRental.goodsId || nextCount !== existingRental.count) {
            const existingGoods = await this.rentalPublicService.getGoodsById(existingRental.goodsId);
            const nextGoods = await this.rentalPublicService.getGoodsById(nextGoodsId);

            if (!existingGoods || !nextGoods) {
                throw new NotFoundException('Goods not found');
            }

            if (existingRental.timeReturn === 0 && existingRental.status === RentalStatusEnum.RENTED) {
                if (nextGoodsId === existingRental.goodsId) {
                    const adjustedCountNow = existingGoods.countNow + existingRental.count - nextCount;
                    if (adjustedCountNow < 0) {
                        throw new BadRequestException('Insufficient stock');
                    }

                    await this.rentalRepository.updateGoodsStock(existingRental.goodsId, adjustedCountNow);
                } else {
                    await this.rentalRepository.updateGoodsStock(existingRental.goodsId, existingGoods.countNow + existingRental.count);

                    if (nextGoods.countNow < nextCount) {
                        throw new BadRequestException('Insufficient stock');
                    }

                    await this.rentalRepository.updateGoodsStock(nextGoodsId, nextGoods.countNow - nextCount);
                }
            }
        }

        await this.rentalRepository.updateRental(id, updates);

        return { success: true };
    }

    async returnRental(id: number, returnWorkerId : number): Promise<ISuccessResponse> {

        const rental = await this.rentalPublicService.getRentalById(id);
        if (!rental) {
            throw new NotFoundException('Rental not found');
        }

        if (rental.timeReturn !== 0) {
            throw new BadRequestException('This rental has already been returned');
        }

        await this.rentalRepository.returnRental(id, getNow(), returnWorkerId);

        //재고 복구
        const goods = await this.rentalPublicService.getGoodsById(rental.goodsId);
        if (goods) {
            await this.rentalRepository.updateGoodsStock(
                rental.goodsId,
                goods.countNow + rental.count
            );
        }

        //대여확인서 삭제 - 사실 이건 지금 필요없을것 같음, 기록 보관의 기능도 수행해야 할 필요가 있음.
        //생각 중인 것은 대여 반납 완료 시
        //      => 공간위 계정 & 사용자 이메일로 대여확인서를 발송 => 이후 데이터베이스 상 삭제 절차가 좋을 것으로 생각됨.
        await this.fileService.deletePrivateFile(rental.certName)

        return { success: true };
    }

    async confirmReturn(id: number): Promise<ISuccessResponse> {
        const rental = await this.rentalPublicService.getRentalById(id);
        if (!rental) {
            throw new NotFoundException('Rental not found');
        }

        if (rental.timeReturn === 0) {
            throw new BadRequestException('This rental has not been returned yet');
        }

        if (rental.status === RentalStatusEnum.RETURNED) {
            throw new BadRequestException('This return has already been confirmed');
        }

        const isOverdue = rental.timeDue < rental.timeReturn;

        if (isOverdue) {
            const overdueDays = Math.ceil(
                getDateDiffInMinute(rental.timeReturn, rental.timeDue) / (60 * 24)
            );

            const user = await this.userPublicService.fetchById(rental.userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            let newTimeOverdue: number;

            if (user.timeOverdue === 0) {
                const overdueEndDate = getDate(rental.timeReturn);
                overdueEndDate.setDate(overdueEndDate.getDate() + overdueDays);
                overdueEndDate.setHours(23, 59, 59, 999);
                newTimeOverdue = getTime(overdueEndDate);
            } else {
                const existingOverdueEndDate = getDate(user.timeOverdue);
                existingOverdueEndDate.setDate(existingOverdueEndDate.getDate() + overdueDays);
                newTimeOverdue = getTime(existingOverdueEndDate);
            }

            await this.userPublicService.updateOverdue(rental.userId, {
                timeOverdue: newTimeOverdue,
            });
        }

        await this.rentalRepository.confirmReturn(id);

        return { success: true };
    }

    async deleteRental(id: number): Promise<ISuccessResponse> {
        const rental = await this.rentalPublicService.getRentalById(id);
        if (!rental) {
            throw new NotFoundException('Rental not found');
        }

        // 반납되지 않은 대여는 삭제 시 재고 복구
        if (rental.status === RentalStatusEnum.RENTED) {
            const goods = await this.rentalPublicService.getGoodsById(rental.goodsId);
            if (goods) {
                await this.rentalRepository.updateGoodsStock(
                    rental.goodsId,
                    goods.countNow + rental.count
                );
            }
        }

        await this.fileService.deletePrivateFile(rental.certName)
        await this.rentalRepository.deleteRental(id);

        return { success: true };
    }

    // Goods 관련 서비스 메서드들
    async createGoods(goodsData: IGoodsCreate): Promise<{ success: boolean; data: { id: number } }> {
        const id = await this.rentalRepository.createGoods(goodsData);
        return {
            success: true,
            data: { id }
        };
    }

    async getGoodsById(id: number): Promise<IGoods> {
        const goods = await this.rentalPublicService.getGoodsById(id);
        if (!goods) {
            throw new NotFoundException('Goods not found');
        }
        return goods;
    }

    async getGoodsList(): Promise<IGoods[]> {
        return await this.rentalPublicService.getAllGoods();
    }

    async updateGoods(id: number, updates: IGoodsUpdate): Promise<ISuccessResponse> {
        const existingGoods = await this.rentalPublicService.getGoodsById(id);
        if (!existingGoods) {
            throw new NotFoundException('Goods not found');
        }

        const countNow = existingGoods.countNow + updates.countAll - existingGoods.countAll;

        if (countNow < 0) {
            throw new BadRequestException('Insufficient stock');
        }

        if (updates.imageURI) {
            await this.fileService.deletePublicFile(existingGoods.imageURI);
        }

        await this.rentalRepository.updateGoods(id, {
            ...updates,
            countNow
        });

        return { success: true };
    }

    async deleteGoods(id: number): Promise<ISuccessResponse> {
        const goods = await this.rentalPublicService.getGoodsById(id);
        if (!goods) {
            throw new NotFoundException('Goods not found');
        }

        // 해당 물품에 대한 활성 대여가 있는지 확인
        const activeRentals = await this.rentalPublicService.getRentalsByUserId(0, true, 1000, 0);
        const hasActiveRentals = activeRentals.data.some(rental => rental.goodsId === id);

        if (hasActiveRentals) {
            throw new BadRequestException('Cannot delete goods with active rentals');
        }

        await this.fileService.deletePublicFile(goods.imageURI);

        await this.rentalRepository.deleteGoods(id);


        return { success: true };
    }
    async getOverdueRentals(): Promise<IRentalAll[]> {
        const overdueRentals = await this.rentalPublicService.getOverdueRentals();

        if (overdueRentals.length === 0) {
            return [];
        }

        const userIds = [...new Set(overdueRentals.map(r => r.userId))];
        const organizationIds = [...new Set(overdueRentals.map(r => r.organizationId))];
        const goodsIds = [...new Set(overdueRentals.map(r => r.goodsId))];

        const [users, organizations, goods] = await Promise.all([
            this.userPublicService.fetchAllByIds(userIds).then(takeAll(userIds, 'users')),
            this.organizationPublicService.fetchByIds(organizationIds),
            this.rentalPublicService.getGoodsByIds(goodsIds),
        ]) as [IUser[], IOrganization[], IGoods[]];

        checkContainAllId(userIds, users, 'users');
        checkContainAllId(goodsIds, goods, 'goods');

        return overdueRentals.map(rental => ({
            ...rental,
            user: users.find(u => u.id === rental.userId)!,
            organization: organizations.find(o => o.id === rental.organizationId)!,
            goods: goods.find(g => g.id === rental.goodsId)!,
        }));
    }

    //send return request mail to specific rental (FYI : overdue not required)
    async rentalReturnRequest(id: number): Promise<{
        success: boolean,
        id: number,
    }> {
        const rental = await this.rentalPublicService.getRentalById(id);
        if (!rental) {
            throw new NotFoundException('Rental not found');
        }
        const goods = await this.rentalPublicService.getGoodsById(rental.goodsId);
        if (!goods) {
            throw new NotFoundException('Goods not found');
        }
        const user = await this.userPublicService.fetchById(rental.userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const meta = RentalMeta.requestReturn

        const dates = {
            timeFrom: getDateString(rental.timeBorrow),
            timeTo: getDateString(rental.timeDue),
            overdue: rental.timeDue < getNow() ? String(Math.ceil(getDateDiffInMinute(getNow(), rental.timeDue)) / (60 * 24)) : '0'
        }

        const rentalMeta = {
            title: goods.name,
            user: user,
            timeFrom: dates.timeFrom,
            timeTo: dates.timeTo,
            overdue: dates.overdue,
        }

        try {
            Logger.log('Sending Return Request mail for Rental ID : ' + id + ' by User : ' + user.nameKr + '')
            Logger.log(meta)
            Logger.log(rentalMeta)
            await this.mailService.sendMail({
                to: user.email,
                bcc: "jhlee012@kaist.ac.kr",
                template: "rentalReturnReq",
                subject: "[SCSpace] 대여 기한 만료 안내 및 반납 요청",
                context: {
                    meta: meta,
                    rental: rentalMeta,
                }
            });
        } catch (error) {
            console.log(error)
            await this.mailService.reportError(
                error instanceof Error
                    ? error
                    : new Error(String(error)),
                "Rental Return Request - Mail Sector")
        }


        return {
            success: true,
            id: id,
        };
    }

    //send request return mail to all overdue rentals
    async rentalReturnRequestAll(): Promise<{
        success: boolean,
        id: number,
    }[]> {
        const rentals = await this.rentalPublicService.getOverdueRentals();
        const res = await Promise.allSettled(
            rentals.map(r => this.rentalReturnRequest(r.id))
        )
        return res.filter(r => r.status === 'fulfilled').map(r => r.value)
    }
}
