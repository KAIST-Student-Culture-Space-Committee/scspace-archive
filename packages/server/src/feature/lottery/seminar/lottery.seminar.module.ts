import { forwardRef, Module } from "@nestjs/common";
import { DBModule } from "@scspace-server/db/db.module";
import { SpaceModule } from "../../space/space.module";
import { UserModule } from "../../user/user.module";
import { OrganizationModule } from "../../organization/organization.module";
import { LotterySeminarController } from "./lottery.seminar.controller";
import { LotterySeminarRepository } from "./lottery.seminar.repository";
import { LotterySeminarService } from "./lottery.seminar.service";
import { LotterySeminarInfoRepository } from "./lottery.seminar.info.repository";
import { ReservationModule } from "@scspace-server/feature/reservation/reservation.module";
import { MailModule } from "src/tools/mailer/mail.module";
import { PenaltyModule } from "@scspace-server/feature/penalty/penalty.module";

@Module({
    imports: [
        DBModule,
        SpaceModule,
        UserModule,
        OrganizationModule,
        MailModule,
        PenaltyModule,
        forwardRef(() => ReservationModule)
    ],
    controllers: [LotterySeminarController],
    providers: [
        LotterySeminarRepository,
        LotterySeminarInfoRepository,
        LotterySeminarService
    ],
    exports: [LotterySeminarService],
})

export class LotterySeminarModule { }