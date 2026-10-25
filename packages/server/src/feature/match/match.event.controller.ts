import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AdminGuard } from '../auth/jwt/jwt.guard';
import { MATCH_PRIZE_PLACES } from '@scspace-depot/types/match';
import { FileService } from '@scspace-server/tools/file/file.service';
import { MatchEventRepository } from './match.event.repository';
import { MatchAdInterceptor, MatchPrizeInterceptor } from './match.event.interceptor';

const NAME_MAX = 100;

function parseName(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > NAME_MAX) {
        throw new BadRequestException(`${label}은(는) 1~${NAME_MAX}자의 문자열이어야 합니다.`);
    }
    return value.trim();
}

/** Event-wide assets shown on the match-prediction pages: AD ZONE banners and 1st~3rd prizes. */
@Controller('match-event')
export class MatchEventController {
    constructor(
        private readonly eventRepo: MatchEventRepository,
        private readonly fileService: FileService,
    ) {}

    @Get('ads')
    async getAds() {
        return { status: 'success', data: await this.eventRepo.fetchAds() };
    }

    @Post('ads')
    @UseGuards(AdminGuard)
    @UseInterceptors(MatchAdInterceptor)
    async createAd(@UploadedFile() file?: Express.Multer.File) {
        try {
            if (!file) throw new BadRequestException('배너 이미지를 선택해주세요.');
            const id = await this.eventRepo.createAd(file.filename);
            return { success: true, id };
        } catch (error) {
            if (file) await this.fileService.deletePublicFile(file.filename);
            throw error;
        }
    }

    @Delete('ads/:id')
    @UseGuards(AdminGuard)
    async deleteAd(@Param('id', ParseIntPipe) id: number) {
        const image = await this.eventRepo.deleteAd(id);
        await this.fileService.deletePublicFile(image);
        return { success: true };
    }

    @Get('prizes')
    async getPrizes() {
        return { status: 'success', data: await this.eventRepo.fetchPrizes() };
    }

    @Put('prizes/:place')
    @UseGuards(AdminGuard)
    @UseInterceptors(MatchPrizeInterceptor)
    async updatePrize(
        @Param('place', ParseIntPipe) place: number,
        @Body() body: Record<string, unknown>,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        try {
            if (!(MATCH_PRIZE_PLACES as readonly number[]).includes(place)) {
                throw new BadRequestException('상품 순위는 1~3등만 설정할 수 있습니다.');
            }
            const replaced = await this.eventRepo.updatePrize(place, {
                name: parseName(body?.name, '상품명(한국어)'),
                nameEn: parseName(body?.nameEn, '상품명(영어)'),
                ...(file && { image: file.filename }),
            });
            if (replaced) await this.fileService.deletePublicFile(replaced);
            return { success: true };
        } catch (error) {
            if (file) await this.fileService.deletePublicFile(file.filename);
            throw error;
        }
    }
}
