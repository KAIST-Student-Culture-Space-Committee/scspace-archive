import { Module } from '@nestjs/common';
import { MtController } from './mt.controller';
import { MtAdminController } from './mt.admin.controller';
import { MtService } from './mt.service';

@Module({
    controllers: [MtController, MtAdminController],
    providers: [MtService],
})
export class MtModule { }
