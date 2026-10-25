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
    Put,
    Req,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/jwt/jwt.guard';
import { IUser } from '@scspace-depot/types/user';
import { Request } from 'express';
import { MatchPredictionRepository } from './match.prediction.repository';
import { IMatchPredictionCreate, IMatchPredictionUpdate } from './match.model';
import { parseContact, parseStartTime } from './match.submission';
import { IMatchInfoUpdate } from '@scspace-depot/types/match';
import { FileService } from '@scspace-server/tools/file/file.service';
import { MatchLogoFiles, allLogoFilenames, logoFilenames } from './match.logo';
import { MatchLogoInterceptor } from './match.logo.interceptor';

type AuthenticatedRequest = Request & { user: IUser };
type ScoreField = keyof IMatchPredictionUpdate;

const SCORE_FIELDS: ScoreField[] = ['firstScoreA', 'firstScoreB', 'secondScoreA', 'secondScoreB'];

@Controller('match')
export class MatchController {
    private readonly logger = new Logger(MatchController.name);

    constructor(
        private readonly matchRepo: MatchPredictionRepository,
        private readonly fileService: FileService,
    ) {}

    private parseMatchInfoUpdate(body: unknown): IMatchInfoUpdate {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestException('수정할 경기 정보를 입력해주세요.');
        }
        const input = body as Record<string, unknown>;
        const textLimits = { matchName: 255, teamA: 100, teamB: 100 } as const;
        const allowed = new Set([...Object.keys(textLimits), ...SCORE_FIELDS, 'startTime']);
        if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.has(key))) {
            throw new BadRequestException('수정 가능한 경기 정보만 입력해주세요.');
        }
        const update: IMatchInfoUpdate = {};
        if ('startTime' in input) update.startTime = parseStartTime(input.startTime);
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

        if (scores.secondScoreA < scores.firstScoreA || scores.secondScoreB < scores.firstScoreB) {
            throw new BadRequestException('최종 누적 점수는 전반 점수 이상이어야 합니다.');
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
            ...parseContact(body),
        };
    }

    @Post('predictions/test')
    @UseGuards(AdminGuard)
    async createTestPrediction(@Body() body: Omit<IMatchPredictionCreate, 'phoneNumber' | 'privacyConsent'> & { userId: number }) {
        const prediction = { matchId: body.matchId, ...this.parseScores(body) };
        if (!Number.isInteger(body.userId) || body.userId <= 0 || body.userId > 2147483647 || !Number.isInteger(body.matchId) || body.matchId <= 0 || body.matchId > 2147483647) {
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

    @Post()
    @UseGuards(AdminGuard)
    @UseInterceptors(MatchLogoInterceptor)
    async createMatchInfo(@Body() body: unknown, @UploadedFiles() files?: MatchLogoFiles) {
        try {
            // multipart fields arrive as strings
            const input = body && typeof body === 'object' ? { ...body } as Record<string, unknown> : body;
            if (input && typeof input === 'object' && typeof (input as Record<string, unknown>).startTime === 'string') {
                (input as Record<string, unknown>).startTime = Number((input as Record<string, unknown>).startTime);
            }
            const data = this.parseMatchInfoUpdate(input);
            const { teamALogo, teamBLogo } = logoFilenames(files);
            if (!data.matchName || !data.teamA || !data.teamB || data.startTime == null ||
                Object.keys(data).some((key) => !['matchName', 'teamA', 'teamB', 'startTime'].includes(key))) {
                throw new BadRequestException('경기명, 팀 A, 팀 B를 입력해주세요.');
            }
            if (!teamALogo || !teamBLogo) {
                throw new BadRequestException('팀 A, 팀 B 로고 이미지를 모두 업로드해주세요.');
            }
            const id = await this.matchRepo.createMatchInfo({
                matchName: data.matchName, teamA: data.teamA, teamB: data.teamB, startTime: data.startTime,
                teamALogo, teamBLogo,
            });
            return { success: true, id };
        } catch (error) {
            await this.deleteFiles(allLogoFilenames(files));
            throw error;
        }
    }

    @Put(':matchId/logos')
    @UseGuards(AdminGuard)
    @UseInterceptors(MatchLogoInterceptor)
    async updateMatchLogos(
        @Param('matchId', ParseIntPipe) matchId: number,
        @UploadedFiles() files?: MatchLogoFiles,
    ) {
        try {
            const logos = logoFilenames(files);
            if (!logos.teamALogo && !logos.teamBLogo) {
                throw new BadRequestException('교체할 로고 이미지를 선택해주세요.');
            }
            const replaced = await this.matchRepo.updateMatchLogos(matchId, {
                ...(logos.teamALogo && { teamALogo: logos.teamALogo }),
                ...(logos.teamBLogo && { teamBLogo: logos.teamBLogo }),
            });
            await this.deleteFiles(replaced);
            return { success: true };
        } catch (error) {
            await this.deleteFiles(allLogoFilenames(files));
            throw error;
        }
    }

    private async deleteFiles(filenames: string[]) {
        await Promise.all(filenames.map((name) => this.fileService.deletePublicFile(name)));
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

    @Post(':matchId/grade')
    @UseGuards(AdminGuard)
    async regradeMatch(@Param('matchId', ParseIntPipe) matchId: number) {
        await this.matchRepo.regradeMatch(matchId);
        return { success: true };
    }

    @Get('predictions/all')
    @UseGuards(AuthGuard('jwt'))
    async getAllPredictionsForUsers() {
        const data = await this.matchRepo.fetchAllPredictionsForUsers();
        return { status: 'success', data };
    }

    @Get('predictions/admin')
    @UseGuards(AdminGuard)
    async getAdminPredictions() {
        return { status: 'success', data: await this.matchRepo.fetchAllPredictions() };
    }

    @Get('predictions')
    @UseGuards(AdminGuard)
    async getAllPredictions() {
        try {
            const data = await this.matchRepo.fetchAllPredictions();
            return { status: 'success', data: data.map(({ phoneNumber, ...prediction }) => prediction) };
        } catch (error) {
            this.logger.error('Error fetching all match predictions:', error);
            throw error;
        }
    }

    @Get(':matchId/leaderboard')
    async getLeaderboard(@Param('matchId', ParseIntPipe) matchId: number) {
        return { status: 'success', data: await this.matchRepo.fetchLeaderboard(matchId) };
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
