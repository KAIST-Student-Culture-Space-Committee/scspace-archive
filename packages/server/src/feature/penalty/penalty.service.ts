import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IUser } from '@scspace-depot/types/user';
import { ISuccessResponse } from '@scspace-depot/types/common';
import {
    IPenalty,
    IPenaltyCount,
    IPenaltyCreate,
    IPenaltyDetail,
    IPenaltyMy,
    IPenaltyRecord,
    IPenaltyTarget,
    IPenaltyTargetSummary,
} from '@scspace-depot/types/penalty';
import { PenaltyKindEnum, PenaltyStageEnum, PenaltyTargetEnum } from '@scspace-depot/enums/penalty.enum';
import { SpaceTypeEnum } from '@scspace-depot/enums/space.enum';
import { PenaltyMeta } from '@scspace-depot/enums/mail.enum';
import {
    PENALTY_KIND_LABEL,
    PENALTY_REASON_MAX_LENGTH,
    PENALTY_SPACE_TYPES,
    PENALTY_SPACE_TYPE_LABEL,
} from '@scspace-depot/consts/penalty.const';
import { IndividualOrganizationId } from '@scspace-depot/consts/organization.const';
import { applyPenalty, buildSpaceStates, getCycleRange, getPenaltyKind } from '@scspace-depot/utils/penalty.utils';
import { addLegacyTimeDays, getLegacyTimeAtEndOfDay, getNow, getString } from '@scspace-server/common/utils';
import { MailService } from '@scspace-server/tools/mailer/mail.service';
import { UserPublicService } from '@scspace-server/feature/user/user.public.service';
import { OrganizationPublicService } from '@scspace-server/feature/organization/organization.public.service';
import { PenaltyRepository } from './penalty.repository';

@Injectable()
export class PenaltyService {
    private readonly logger = new Logger(PenaltyService.name);

    constructor(
        private readonly penaltyRepository: PenaltyRepository,
        private readonly userPublicService: UserPublicService,
        private readonly organizationPublicService: OrganizationPublicService,
        private readonly mailService: MailService,
    ) { }

    async impose(input: IPenaltyCreate, actor: IUser): Promise<IPenaltyRecord> {
        if (input.targetType !== PenaltyTargetEnum.USER && input.targetType !== PenaltyTargetEnum.ORGANIZATION) {
            throw new BadRequestException(`Invalid target type: ${input.targetType}`);
        }
        if (input.kind !== PenaltyKindEnum.NOTICE && input.kind !== PenaltyKindEnum.WARNING) {
            throw new BadRequestException(`Invalid penalty kind: ${input.kind}`);
        }
        if (!PENALTY_SPACE_TYPES.includes(input.spaceType)) {
            throw new BadRequestException(`Invalid space type: ${input.spaceType}`);
        }
        if (!Number.isInteger(input.targetId) || input.targetId <= 0) {
            throw new BadRequestException(`Invalid target id: ${input.targetId}`);
        }
        if (input.targetType === PenaltyTargetEnum.ORGANIZATION && input.targetId === IndividualOrganizationId) {
            throw new BadRequestException('Cannot impose a penalty on the individual organization');
        }

        const reason = input.reason?.trim() ?? '';
        if (reason.length < 1 || reason.length > PENALTY_REASON_MAX_LENGTH) {
            throw new BadRequestException(`Reason must be between 1 and ${PENALTY_REASON_MAX_LENGTH} characters`);
        }

        const target: IPenaltyTarget = { targetType: input.targetType, targetId: input.targetId };

        const targetExists =
            input.targetType === PenaltyTargetEnum.USER
                ? await this.userPublicService.fetchById(input.targetId)
                : await this.organizationPublicService.fetchById(input.targetId);
        if (!targetExists) {
            throw new NotFoundException(
                `${input.targetType === PenaltyTargetEnum.USER ? 'User' : 'Organization'} not found`,
            );
        }

        const now = getNow();
        const cycleStart = getCycleRange(now).start;

        const inserted = await this.penaltyRepository.transaction(async (tx) => {
            await this.penaltyRepository.lockTarget(tx, target);

            const latest = await this.penaltyRepository.fetchLatestInCycle(tx, target, input.spaceType, cycleStart);
            const current: IPenaltyCount = latest
                ? { notice: latest.noticeTotal, warning: latest.warningTotal }
                : { notice: 0, warning: 0 };

            const result = applyPenalty(current, input.kind);
            const restrictionEnd =
                result.stage === PenaltyStageEnum.NONE
                    ? 0
                    : getLegacyTimeAtEndOfDay(addLegacyTimeDays(now, result.restrictionDays));

            return this.penaltyRepository.insert(tx, {
                targetType: input.targetType,
                userId: input.targetType === PenaltyTargetEnum.USER ? input.targetId : null,
                organizationId: input.targetType === PenaltyTargetEnum.ORGANIZATION ? input.targetId : null,
                spaceType: input.spaceType,
                notice: input.kind === PenaltyKindEnum.NOTICE ? 1 : 0,
                warning: input.kind === PenaltyKindEnum.WARNING ? 1 : 0,
                noticeTotal: result.next.notice,
                warningTotal: result.next.warning,
                converted: result.converted,
                restrictionStage: result.stage,
                restrictionEnd,
                reason,
                issuerId: actor.id,
                timeImpose: now,
            });
        });

        await this.sendPenaltyMail({
            meta: PenaltyMeta.Imposed,
            target,
            spaceType: inserted.spaceType,
            kind: input.kind,
            reason: inserted.reason,
            time: inserted.timeImpose,
            noticeTotal: inserted.noticeTotal,
            warningTotal: inserted.warningTotal,
            converted: inserted.converted,
            restrictionStage: inserted.restrictionStage,
            restrictionEnd: inserted.restrictionEnd,
            errorContext: 'Penalty Impose - Mail Sector',
        });

        return {
            ...inserted,
            issuerName: actor.nameKr,
        };
    }

    async remove(id: number): Promise<ISuccessResponse> {
        const row = await this.penaltyRepository.fetchById(id);
        if (!row) {
            throw new NotFoundException('Penalty record not found');
        }

        const target = this.targetOf(row);
        const { start, end } = getCycleRange(row.timeImpose);

        await this.penaltyRepository.transaction(async (tx) => {
            await this.penaltyRepository.lockTarget(tx, target);
            await this.penaltyRepository.deleteById(tx, id);

            const remaining = await this.penaltyRepository.fetchRange(tx, target, row.spaceType, start, end);

            let current: IPenaltyCount = { notice: 0, warning: 0 };
            for (const remainingRow of remaining) {
                const kind = getPenaltyKind(remainingRow);
                const result = applyPenalty(current, kind);
                current = result.next;

                const restrictionEnd =
                    result.stage === PenaltyStageEnum.NONE
                        ? 0
                        : getLegacyTimeAtEndOfDay(addLegacyTimeDays(remainingRow.timeImpose, result.restrictionDays));

                const changed =
                    remainingRow.noticeTotal !== result.next.notice ||
                    remainingRow.warningTotal !== result.next.warning ||
                    remainingRow.converted !== result.converted ||
                    remainingRow.restrictionStage !== result.stage ||
                    remainingRow.restrictionEnd !== restrictionEnd;

                if (changed) {
                    await this.penaltyRepository.updateComputed(tx, remainingRow.id, {
                        noticeTotal: result.next.notice,
                        warningTotal: result.next.warning,
                        converted: result.converted,
                        restrictionStage: result.stage,
                        restrictionEnd,
                    });
                }
            }
        });

        const now = getNow();
        const rows = await this.penaltyRepository.fetchByTarget(target);
        const [state] = buildSpaceStates(rows, now, [row.spaceType]);

        await this.sendPenaltyMail({
            meta: PenaltyMeta.Cancelled,
            target,
            spaceType: row.spaceType,
            kind: getPenaltyKind(row),
            reason: row.reason,
            time: row.timeImpose,
            noticeTotal: state.notice,
            warningTotal: state.warning,
            converted: false,
            restrictionStage: state.restrictionStage,
            restrictionEnd: state.restrictionEnd,
            errorContext: 'Penalty Remove - Mail Sector',
        });

        return { success: true };
    }

    async getDetail(target: IPenaltyTarget, options?: { hideIssuer?: boolean }): Promise<IPenaltyDetail> {
        const rows = await this.penaltyRepository.fetchByTarget(target);
        const now = getNow();
        const spaces = buildSpaceStates(rows, now);

        const issuerIds = [...new Set(rows.map((row) => row.issuerId).filter((id): id is number => id !== null))];
        const issuers =
            !options?.hideIssuer && issuerIds.length > 0
                ? await this.userPublicService.fetchAllByIds(issuerIds)
                : [];

        const history: IPenaltyRecord[] = [...rows]
            .sort((a, b) => b.timeImpose - a.timeImpose || b.id - a.id)
            .map((row) => ({
                ...row,
                issuerName:
                    options?.hideIssuer || row.issuerId === null
                        ? null
                        : issuers.find((issuer) => issuer.id === row.issuerId)?.nameKr ?? null,
            }));

        return {
            target,
            cycleStart: getCycleRange(now).start,
            spaces,
            history,
        };
    }

    async getTargets(targetType: PenaltyTargetEnum): Promise<IPenaltyTargetSummary[]> {
        const now = getNow();
        const cycleStart = getCycleRange(now).start;
        const rows = await this.penaltyRepository.fetchForSummary(targetType, cycleStart, now);

        const idKey: 'userId' | 'organizationId' = targetType === PenaltyTargetEnum.USER ? 'userId' : 'organizationId';
        const grouped = new Map<number, IPenalty[]>();
        for (const row of rows) {
            const id = row[idKey];
            if (id === null) continue;
            const list = grouped.get(id) ?? [];
            list.push(row);
            grouped.set(id, list);
        }

        const ids = [...grouped.keys()];
        if (ids.length === 0) {
            return [];
        }

        const summaries: IPenaltyTargetSummary[] = [];

        if (targetType === PenaltyTargetEnum.USER) {
            const users = await this.userPublicService.fetchAllByIds(ids);
            for (const id of ids) {
                const spaces = buildSpaceStates(grouped.get(id) ?? [], now).filter(
                    (state) => state.notice > 0 || state.warning > 0 || state.restrictionEnd > 0,
                );
                if (spaces.length === 0) continue;
                const user = users.find((u) => u.id === id);
                summaries.push({
                    target: { targetType, targetId: id },
                    name: user?.nameKr ?? '',
                    studentNumber: user?.studentNumber ?? null,
                    spaces,
                });
            }
        } else {
            const organizations = await this.organizationPublicService.fetchByIds(ids);
            for (const id of ids) {
                const spaces = buildSpaceStates(grouped.get(id) ?? [], now).filter(
                    (state) => state.notice > 0 || state.warning > 0 || state.restrictionEnd > 0,
                );
                if (spaces.length === 0) continue;
                const organization = organizations.find((o) => o.id === id);
                summaries.push({
                    target: { targetType, targetId: id },
                    name: organization?.name ?? '',
                    studentNumber: null,
                    spaces,
                });
            }
        }

        return summaries;
    }

    async getMine(user: IUser): Promise<IPenaltyMy> {
        const userDetail = await this.getDetail(
            { targetType: PenaltyTargetEnum.USER, targetId: user.id },
            { hideIssuer: true },
        );

        const organizations = await this.organizationPublicService.fetchByUserId(user.id);
        const organizationDetails = await Promise.all(
            organizations
                .filter((organization) => organization.id !== IndividualOrganizationId)
                .map(async (organization) => ({
                    organization,
                    detail: await this.getDetail(
                        { targetType: PenaltyTargetEnum.ORGANIZATION, targetId: organization.id },
                        { hideIssuer: true },
                    ),
                })),
        );

        return { user: userDetail, organizations: organizationDetails };
    }

    private targetOf(row: IPenalty): IPenaltyTarget {
        return row.targetType === PenaltyTargetEnum.USER
            ? { targetType: PenaltyTargetEnum.USER, targetId: row.userId as number }
            : { targetType: PenaltyTargetEnum.ORGANIZATION, targetId: row.organizationId as number };
    }

    private async resolveTargetInfo(target: IPenaltyTarget): Promise<{ name: string; recipients: string[] }> {
        if (target.targetType === PenaltyTargetEnum.USER) {
            const user = await this.userPublicService.fetchById(target.targetId);
            return {
                name: user?.nameKr ?? '',
                recipients: user?.email ? [user.email] : [],
            };
        }

        const organization = await this.organizationPublicService.fetchDeepById(target.targetId);
        const emails = [organization.delegator.email, ...organization.members.map((member) => member.user.email)];
        return {
            name: organization.name,
            recipients: [...new Set(emails.filter((email): email is string => Boolean(email)))],
        };
    }

    private buildRestrictionText(stage: PenaltyStageEnum, end: number): string {
        if (stage === PenaltyStageEnum.NONE || end === 0) {
            return '없음 / None';
        }
        return `${getString(end)}까지 예약 제한 / Restricted until ${getString(end)}`;
    }

    private async sendPenaltyMail(params: {
        meta: typeof PenaltyMeta.Imposed | typeof PenaltyMeta.Cancelled;
        target: IPenaltyTarget;
        spaceType: SpaceTypeEnum;
        kind: PenaltyKindEnum;
        reason: string;
        time: number;
        noticeTotal: number;
        warningTotal: number;
        converted: boolean;
        restrictionStage: PenaltyStageEnum;
        restrictionEnd: number;
        errorContext: string;
    }): Promise<void> {
        try {
            const { name: targetName, recipients } = await this.resolveTargetInfo(params.target);
            if (recipients.length === 0) {
                return;
            }

            const spaceLabel = PENALTY_SPACE_TYPE_LABEL[params.spaceType];
            const kindLabel =
                params.kind === PenaltyKindEnum.NOTICE ? PENALTY_KIND_LABEL.NOTICE : PENALTY_KIND_LABEL.WARNING;

            await this.mailService.sendMail({
                to: recipients,
                subject: `[SCSpace] ${params.meta.header.kr} / ${params.meta.header.en} - ${spaceLabel.kr}`,
                template: 'penaltyNotice',
                context: {
                    meta: params.meta,
                    penalty: {
                        targetName,
                        spaceName: `${spaceLabel.kr} / ${spaceLabel.en}`,
                        kindName: `${kindLabel.kr} / ${kindLabel.en}`,
                        reason: params.reason,
                        time: getString(params.time),
                        noticeTotal: params.noticeTotal,
                        warningTotal: params.warningTotal,
                        converted: params.converted,
                        restriction: this.buildRestrictionText(params.restrictionStage, params.restrictionEnd),
                    },
                },
            });
        } catch (error) {
            await this.reportMailError(error, params.errorContext);
        }
    }

    private async reportMailError(error: unknown, context: string): Promise<void> {
        try {
            await this.mailService.reportError(
                error instanceof Error ? error : new Error(String(error)),
                context,
            );
        } catch (reportError) {
            this.logger.error('Failed to report penalty mail error', reportError);
        }
    }
}
