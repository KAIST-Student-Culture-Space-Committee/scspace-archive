import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { DBAsyncProvider } from 'src/db/db.provider';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { Passpin, schema, Reservation, Space, OrganizationMember } from "@schema";
import { and, between, count, desc, eq, or, ne, lte, gte } from "drizzle-orm";
import { PasspinEnum } from '@scspace-depot/enums/passpin.enum';
import { IPasspin, IPasspinSpace, IPasspinWithSpace } from "@scspace-depot/types/passpin";
import { MPasspin, MPasspinSpace } from "@scspace-server/feature/passpin/passpin.model";
import { getNow } from "@scspace-server/common/utils";
import { PasspinUtils } from "./passpin.utils";
import { MSpace } from "../space/space.model";
import { IndividualOrganizationId } from "@scspace-depot/consts/organization.const";

@Injectable()
export class PasspinRepository {
    constructor(
        @Inject(DBAsyncProvider) private readonly db: MySql2Database<typeof schema>,
        private readonly passpinUtils: PasspinUtils,
    ) { }

    async fetch(id: number): Promise<IPasspin> {
        const pin = await this.db
            .select()
            .from(Passpin)
            .where(eq(Passpin.id, id))
            .then((pins) => pins[0]);

        if (!pin) {
            throw new NotFoundException(`Passpin with id ${id} not found`);
        }

        return MPasspin.fromDB(pin);
    }

    async fetchSpacepin(spaceId: number): Promise<IPasspinSpace> {
        Logger.log('fetchSpacepin spaceId : ' + spaceId + ' called');
        const current_pin = await this.db
            .select()
            .from(Passpin)
            .where(and(eq(Passpin.spaceId, spaceId), eq(Passpin.status, PasspinEnum.USING)))
            .then((pins) => pins[pins.length - 1]);

        if (!current_pin) {
            throw new NotFoundException(`Passpin with spaceId ${spaceId} & Stauts = 0 not found`);
        }

        Logger.log('fetchSpacepin spaceId : ' + spaceId + ' current_pin : ' + JSON.stringify(current_pin));

        const previous_pin = await this.db
            .select()
            .from(Passpin)
            .where(and(eq(Passpin.spaceId, spaceId), eq(Passpin.status, PasspinEnum.OUTDATED)))
            .orderBy(desc(Passpin.id))
            .limit(1)
            .then((pins) => pins[0]);

        Logger.log('fetchSpacepin spaceId : ' + spaceId + ' previous_pin : ' + JSON.stringify(previous_pin));

        if (!previous_pin) {
            Logger.log('fetchSpacepin spaceId : ' + spaceId + ' previous_pin is null');
            return MPasspinSpace.fromDB(current_pin);
        }
        return MPasspinSpace.fromDB(current_pin, previous_pin);
    }

    async fetchActivePins(): Promise<IPasspinWithSpace[]> {
        return await this.db
            .select()
            .from(Passpin)
            .innerJoin(Space, eq(Passpin.spaceId, Space.id))
            .where(eq(Passpin.status, PasspinEnum.USING))
            .then((pins) => pins.map(pin => ({
                ...MPasspin.fromDB(pin.passpin),
                space: MSpace.fromDB(pin.space),
            })));
    }

    async fetchActivePinsByUserId(userId: number): Promise<IPasspinWithSpace[]> {
        const now = getNow();

        return await this.db
            .selectDistinct({
                passpin: Passpin,
                space: Space,
            })
            .from(Passpin)
            .innerJoin(
                Space,
                eq(Passpin.spaceId, Space.id)
            )
            .innerJoin(
                Reservation,
                and(
                    eq(Passpin.spaceId, Reservation.spaceId),
                    lte(Reservation.timeFrom, now + 60),
                    gte(Reservation.timeTo, now - 60)
                )
            )
            .leftJoin(
                OrganizationMember,
                and(
                    ne(Reservation.organizationId, IndividualOrganizationId),
                    eq(Reservation.organizationId, OrganizationMember.organizationId),
                )
            )
            .where(
                and(
                    eq(Passpin.status, PasspinEnum.USING),
                    or(
                        and(
                            eq(Reservation.organizationId, IndividualOrganizationId),
                            eq(Reservation.userId, userId)
                        ),
                        and(
                            ne(Reservation.organizationId, IndividualOrganizationId),
                            eq(OrganizationMember.userId, userId)
                        )
                    ),
                )
            )
            .then((pins) => pins.map(pin => ({
                ...MPasspin.fromDB(pin.passpin),
                space: MSpace.fromDB(pin.space),
            })));
    }

    async fetchDetailed(spaceId: number, status: number): Promise<IPasspin> {
        const pin = await this.db
            .select()
            .from(Passpin)
            .where(and(eq(Passpin.spaceId, spaceId), eq(Passpin.status, status)))
            .then((pins) => pins);
        if (!pin) {
            throw new NotFoundException(`Passpin with spaceId ${spaceId} & Stauts = ${status} not found`);
        }

        if (pin[1]) {
            throw new BadRequestException(`Passpin with spaceId ${spaceId} & Stauts = ${status} is not unique`);
        }

        return MPasspin.fromDB(pin[0]);
    }

    async updateStatus(id: number, status: number): Promise<boolean> {
        const [result] = await this.db
            .update(Passpin)
            .set({ status: status })
            .where(eq(Passpin.id, id));

        return result.affectedRows > 0;
    }

    async checkAvail(spaceId: number): Promise<boolean> {
        const results = await this.db
            .select({
                status: Passpin.status,
                cnt: count(),
            })
            .from(Passpin)
            .where(eq(Passpin.spaceId, spaceId))
            .groupBy(Passpin.status);

        const currentCount = results.find(r => r.status === PasspinEnum.USING)?.cnt ?? 0;

        if (currentCount !== 1) {
            throw new BadRequestException(
                `Invalid passpin state: expected exactly 1 USING pin, got ${currentCount}`
            );
        }

        return true; // 정상
    }

    /**
     *
     * @param spaceId
     * @param pin
     * @param status
     */
    async createPin(spaceId: number, pin: string, status?: number): Promise<IPasspin> {
        if (!this.passpinUtils.isValidString(pin)) {
            throw new BadRequestException(`Invalid String for Passpin : ${pin}`);
        }

        if (status !== PasspinEnum.OUTDATED && status !== PasspinEnum.USING) {
            throw new BadRequestException(`Invalid pin status : ${status}`)
        }

        const [res] = await this.db
            .insert(Passpin)
            .values({
                spaceId: spaceId,
                pin: pin,
                status: status ?? PasspinEnum.USING,
                timeCreated: getNow(),
            });

        if (!res.insertId) {
            throw new Error("something went wrong : new password generation")
        }

        const inserted = await this.fetch(res.insertId);
        if (!inserted) throw new Error("something went wrong : new password generation")

        return await this.fetch(res.insertId)
    }

    async fetchOlderPins(spaceId: number, limit: number, includeCurrent?: boolean): Promise<IPasspin[]> {
        const pins = await this.db
            .select()
            .from(Passpin)
            .where(and(eq(Passpin.spaceId, spaceId), eq(Passpin.status, PasspinEnum.OUTDATED)))
            .orderBy(desc(Passpin.id))
            .limit(limit)
        const res: IPasspin[] = pins.map(pin => MPasspin.fromDB(pin));
        if (includeCurrent) {
            const currentPin = await this.fetchDetailed(spaceId, PasspinEnum.USING);
            res.unshift(currentPin);
            res.pop(); //then the total length = limit !
        }
        return res;
    }

    async deletePin(id: number): Promise<void> {
        const [result] = await this.db
            .update(Passpin)
            .set({ status: PasspinEnum.OUTDATED })
            .where(eq(Passpin.id, id));

        if (result.affectedRows === 0) {
            throw new NotFoundException(`Passpin with id ${id} not found`);
        }
    }


    /** OUTDATED
     *     async createPin(spaceId: number, pin: string, status?: number) : Promise<IPasspin> {
     *         if (!this.fetchDetailed(spaceId, PasspinEnum.NEXT).then(pin => pin[0])) {
     *             throw new BadRequestException(`Pin already exists`);
     *         }
     *
     *         // !!!! getNow() 사용하는게 맞는지 확인 필요함 !!!
     *
     *         const [result] = await this.db
     *             .update(Passpin)
     *             .set({
     *                 status : status ?? PasspinEnum.NEXT,
     *                 pin : pin.toString(),
     *                 timeCreated : getNow(),
     *             })
     *             .where(eq(Passpin.spaceId, spaceId));
     *
     *         const generatedPin = await this.fetch(result.insertId);
     *         if (!generatedPin) {
     *             throw new Error ("something went wrong : new password generation")
     *         }
     *
     *         return generatedPin;
     *     }
     */


}
