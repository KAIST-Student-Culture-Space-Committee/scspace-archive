import { Module } from '@nestjs/common';
import { DBModule } from 'src/db/db.module';
import { UserModule } from 'src/feature/user/user.module';
import { OrganizationModule } from 'src/feature/organization/organization.module';
import { MailModule } from 'src/tools/mailer/mail.module';
import { PenaltyController } from './penalty.controller';
import { PenaltyService } from './penalty.service';
import { PenaltyPublicService } from './penalty.public.service';
import { PenaltyRepository } from './penalty.repository';

@Module({
    imports: [DBModule, UserModule, OrganizationModule, MailModule],
    controllers: [PenaltyController],
    providers: [PenaltyService, PenaltyPublicService, PenaltyRepository],
    exports: [PenaltyPublicService],
})
export class PenaltyModule { }
