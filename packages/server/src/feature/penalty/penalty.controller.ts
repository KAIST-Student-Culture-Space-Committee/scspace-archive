import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ManagerGuard } from '../auth/jwt/jwt.guard';
import { IUser } from '@scspace-depot/types/user';
import { ISuccessResponse } from '@scspace-depot/types/common';
import {
    IPenaltyCreate,
    IPenaltyDetail,
    IPenaltyMy,
    IPenaltyRecord,
    IPenaltyTargetSummary,
} from '@scspace-depot/types/penalty';
import { PenaltyTargetEnum } from '@scspace-depot/enums/penalty.enum';
import { PenaltyService } from './penalty.service';

function assertValidTargetType(value: number): PenaltyTargetEnum {
    if (value !== PenaltyTargetEnum.USER && value !== PenaltyTargetEnum.ORGANIZATION) {
        throw new BadRequestException(`Invalid target type: ${value}`);
    }
    return value;
}

@Controller('penalty')
export class PenaltyController {
    constructor(private readonly penaltyService: PenaltyService) { }

    @Get('targets')
    @UseGuards(ManagerGuard)
    async getTargets(
        @Query('targetType', ParseIntPipe) targetType: number,
    ): Promise<IPenaltyTargetSummary[]> {
        return this.penaltyService.getTargets(assertValidTargetType(targetType));
    }

    @Get('detail')
    @UseGuards(ManagerGuard)
    async getDetail(
        @Query('targetType', ParseIntPipe) targetType: number,
        @Query('targetId', ParseIntPipe) targetId: number,
    ): Promise<IPenaltyDetail> {
        return this.penaltyService.getDetail({
            targetType: assertValidTargetType(targetType),
            targetId,
        });
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getMine(@Req() req: Request): Promise<IPenaltyMy> {
        return this.penaltyService.getMine(req.user as IUser);
    }

    @Post()
    @UseGuards(ManagerGuard)
    async impose(
        @Body() body: IPenaltyCreate,
        @Req() req: Request,
    ): Promise<IPenaltyRecord> {
        return this.penaltyService.impose(body, req.user as IUser);
    }

    @Delete(':id')
    @UseGuards(ManagerGuard)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<ISuccessResponse> {
        return this.penaltyService.remove(id);
    }
}
