import { Module } from '@nestjs/common';
import { DBModule } from 'src/db/db.module';
import { MatchController } from './match.controller';
import { MatchPredictionRepository } from './match.prediction.repository'
import { MatchEventController } from './match.event.controller';
import { MatchEventRepository } from './match.event.repository';
import { FileModule } from '@scspace-server/tools/file/file.module';

@Module({
    imports: [
        DBModule,
        FileModule,
    ],
    controllers: [MatchController, MatchEventController],
    providers: [
        MatchPredictionRepository,
        MatchEventRepository,
    ],
})
export class MatchModule { }