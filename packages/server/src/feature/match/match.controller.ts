import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Logger,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/jwt/jwt.guard';
import { IUser } from '@scspace-depot/types/user';
import { Request } from 'express';
import { MatchPredictionRepository } from './match.prediction.repository';
import { IMatchPredictionCreate, IMatchPredictionUpdate } from './match.model';
import { IMatchInfoUpdate } from '@scspace-depot/types/match';

type AuthenticatedRequest = Request & { user: IUser };
type ScoreField = keyof IMatchPredictionUpdate;

const SCORE_FIELDS: ScoreField[] = ['firstScoreA', 'firstScoreB', 'secondScoreA', 'secondScoreB'];

@Controller('match')
export class MatchController {
    private readonly logger = new Logger(MatchController.name);

    constructor(private readonly matchRepo: MatchPredictionRepository) {}

    private parseMatchInfoUpdate(body: unknown): IMatchInfoUpdate {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestException('수정할 경기 정보를 입력해주세요.');
        }
        const input = body as Record<string, unknown>;
        const textLimits = { matchName: 255, teamA: 100, teamB: 100 } as const;
        const allowed = new Set([...Object.keys(textLimits), ...SCORE_FIELDS]);
        if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.has(key))) {
            throw new BadRequestException('수정 가능한 경기 정보만 입력해주세요.');
        }
        const update: IMatchInfoUpdate = {};
        for (const field of Object.keys(textLimits) as (keyof typeof textLimits)[]) {
            if (!(field in input)) continue;
            const value = input[field];
            if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > textLimits[field]) {
                throw new BadRequestException(`${field}는 1~${textLimits[field]}자의 문자열이어야 합니다.`);
            }
            update[field] = value.trim();
        }
        for (const field of SCORE_FIELDS) {
            if (!(field in input)) continue;
            const value = input[field];
            if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99)) {
                throw new BadRequestException('실제 점수는 0~99 정수 또는 null이어야 합니다.');
            }
            update[field] = value as number | null;
        }
        return update;
    }

    private parseScores(body: Partial<IMatchPredictionUpdate>): IMatchPredictionUpdate {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('예측 점수를 입력해주세요.');
        }

        const scores = {} as IMatchPredictionUpdate;
        for (const field of SCORE_FIELDS) {
            const value = body[field];
            if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99) {
                throw new BadRequestException('점수는 0~99 사이의 정수여야 합니다.');
            }
            scores[field] = value;
        }

        return scores;
    }

    private parseCreateBody(body: Partial<IMatchPredictionCreate>): IMatchPredictionCreate {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('예측 정보를 입력해주세요.');
        }
        if (typeof body.matchId !== 'number' || !Number.isInteger(body.matchId) || body.matchId <= 0) {
            throw new BadRequestException('유효한 경기 ID가 필요합니다.');
        }

        return {
            matchId: body.matchId,
            ...this.parseScores(body),
        };
    }

    @Post('predictions/test')
    @UseGuards(AdminGuard)
    async createTestPrediction(@Body() body: IMatchPredictionCreate & { userId: number }) {
        const prediction = this.parseCreateBody(body);
        if (!Number.isInteger(body.userId) || body.userId <= 0 || body.userId > 2147483647 || body.matchId > 2147483647) {
            throw new BadRequestException('사용자 ID와 경기 ID는 유효한 양의 정수여야 합니다.');
        }
        await this.matchRepo.insertTestPrediction({ ...prediction, userId: body.userId });
        return { success: true };
    }

    @Post('prediction')
    @UseGuards(AuthGuard('jwt'))
    async createPrediction(
        @Req() req: AuthenticatedRequest,
        @Body() body: IMatchPredictionCreate,
    ) { 
        try{
            const prediction = this.parseCreateBody(body);
            await this.matchRepo.insert({
                userId: req.user.id,
                ...prediction,
            });
            return {
                success: true,
            };
        } catch (error) {
            this.logger.error('Error creating match prediction:', error);
            throw error;
        }
        
    }

    @Patch('prediction/:id')
    @UseGuards(AuthGuard('jwt'))
    async appendPredictionFromPatch(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: IMatchPredictionUpdate,
    ) {
        try {
            const prediction = await this.matchRepo.fetchPredictionById(id);
            if (prediction.userId !== req.user.id) {
                throw new ForbiddenException('본인의 예측만 수정할 수 있습니다.');
            }

            await this.matchRepo.insert({
                userId: req.user.id,
                matchId: prediction.matchId,
                ...this.parseScores(body),
            });
            return { success: true };
        } catch (error) {
            this.logger.error('Error updating match prediction:', error);
            throw error;
        }
    }

    @Get('prediction/:userId')
    @UseGuards(AuthGuard('jwt'))
    async getPredictionsByUserId(
        @Req() req: AuthenticatedRequest,
        @Param('userId', ParseIntPipe) userId: number,
    ) {
        try {
            if (userId !== req.user.id) {
                throw new ForbiddenException('본인의 예측만 조회할 수 있습니다.');
            }

            const data = await this.matchRepo.fetchByUserId(userId);
            return {
                status: 'success',
                data: data,
            };
        } catch (error) {
            this.logger.error('Error fetching match predictions:', error);
            throw error;
        }
    }


    
    @Get()
    async getAllMatches() {
        try{
            const data = await this.matchRepo.fetchAll();
            return {
            status: 'success',
            data: data,
            };
        }
        catch (error) {
            this.logger.error('Error fetching all matches:', error);
            throw error;
        }
    }

    @Patch(':matchId')
    @UseGuards(AdminGuard)
    async updateMatchInfo(
        @Param('matchId', ParseIntPipe) matchId: number,
        @Body() body: unknown,
    ) {
        await this.matchRepo.updateMatchInfo(matchId, this.parseMatchInfoUpdate(body));
        return { success: true };
    }

    @Patch(':matchId/submission')
    @UseGuards(AdminGuard)
    async updateAllowSubmission(
        @Param('matchId', ParseIntPipe) matchId: number,
        @Body() body: { allowSubmission: boolean },
    ) {
        if (!body || typeof body.allowSubmission !== 'boolean') {
            throw new BadRequestException('allowSubmission은 boolean 값이어야 합니다.');
        }
        await this.matchRepo.updateAllowSubmission(matchId, body.allowSubmission);
        return { success: true };
    }

    @Get('predictions')
    async getAllPredictions() {
        try {
            const data = await this.matchRepo.fetchAllPredictions();
            return { status: 'success', data };
        } catch (error) {
            this.logger.error('Error fetching all match predictions:', error);
            throw error;
        }
    }

    @Get(':matchId')
    async getMatchById(@Param('matchId', ParseIntPipe) matchId: number) {
        try{
            const data = await this.matchRepo.fetchByMatchId(matchId);
            return {
            status: 'success',
            data: data,
            };
        }
        catch (error) {
            this.logger.error('Error fetching match by ID:', error);
            throw error;
        }
    }
};
