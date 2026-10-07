import { Module } from '@nestjs/common';
import { DBModule } from 'src/db/db.module';
import { MatchController } from './match.controller';
import { MatchPredictionRepository } from './match.prediction.repository'

@Module({
    imports: [
        DBModule, 
    ],
    controllers: [MatchController],
    providers: [
        MatchPredictionRepository,
    ],
})
export class MatchModule { }