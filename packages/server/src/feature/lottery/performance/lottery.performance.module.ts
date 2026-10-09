import { forwardRef, Module } from "@nestjs/common";
import { DBModule } from "@scspace-server/db/db.module";
import { SpaceModule } from "../../space/space.module";
import { UserModule } from "../../user/user.module";
import { OrganizationModule } from "../../organization/organization.module";
import { LotteryPerformanceController } from "./lottery.performance.controller";
import { LotteryPerformanceRepository } from "./lottery.performance.repository";
import { LotteryPerformanceService } from "./lottery.performance.service";
import { LotteryPerformanceInfoRepository } from "./lottery.performance.info.repository";
import { MailModule } from "@scspace-server/tools/mailer/mail.module";
import { ReservationModule } from "@scspace-server/feature/reservation/reservation.module";
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
    controllers: [LotteryPerformanceController],
    providers: [
        LotteryPerformanceRepository,
        LotteryPerformanceInfoRepository,
        LotteryPerformanceService
    ],
    exports: [LotteryPerformanceService],
})

export class LotteryPerformanceModule { }
