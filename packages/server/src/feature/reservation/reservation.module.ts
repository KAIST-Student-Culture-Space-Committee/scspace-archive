import { forwardRef, Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationRepository } from './reservation.repository';
import { DBModule } from 'src/db/db.module';
import { ReservationController } from './reservation.controller';
import { SpaceModule } from 'src/feature/space/space.module';
import { UserModule } from 'src/feature/user/user.module';
import { ReservationPublicService } from './reservation.public.service';
import { OrganizationModule } from 'src/feature/organization/organization.module';
import { MailModule } from 'src/tools/mailer/mail.module';
import { PenaltyModule } from 'src/feature/penalty/penalty.module';
import { LotterySeminarModule } from '../lottery/seminar/lottery.seminar.module';
import { LotteryPerformanceModule } from '../lottery/performance/lottery.performance.module';

@Module({
  imports: [
    DBModule,
    SpaceModule,
    UserModule,
    OrganizationModule,
    MailModule,
    PenaltyModule,
    forwardRef(() => LotterySeminarModule),
    forwardRef(() => LotteryPerformanceModule)
  ],
  controllers: [ReservationController],
  providers: [
    ReservationRepository,
    ReservationPublicService,
    ReservationService,
  ],
  exports: [ReservationPublicService],
})
export class ReservationModule { }
