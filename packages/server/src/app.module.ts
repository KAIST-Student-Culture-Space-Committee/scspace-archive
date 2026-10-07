import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './feature/user/user.module';
import { DBModule } from './db/db.module';
import { AuthModule } from './feature/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { SpaceModule } from './feature/space/space.module';
import { ReservationModule } from './feature/reservation/reservation.module';
import { OrganizationModule } from './feature/organization/organization.module';
import { RentalModule } from './feature/rental/rental.module';
import { ArticleModule } from './feature/article/article.module';
import { join } from 'path';
import { MailModule } from './tools/mailer/mail.module';
import { LotteryModule } from './feature/lottery/lottery.module';
import { ScheduleModule } from "@nestjs/schedule";
import { FileModule } from './tools/file/file.module';
import { PasspinModule } from "./feature/passpin/passpin.module";
import { MatchModule } from './feature/match/match.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../.env')],
    }),
    ScheduleModule.forRoot(),
    UserModule,
    DBModule,
    AuthModule,
    SpaceModule,
    ReservationModule,
    OrganizationModule,
    RentalModule,
    ArticleModule,
    MailModule,
    LotteryModule,
    FileModule,
    PasspinModule,
    MatchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
