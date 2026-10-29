import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IUser } from '@scspace-depot/types/user';
import { MtService } from './mt.service';
import { MtPlayerGuard } from './mt.guard';

const userOf = (req: Request) => req.user as IUser;

@Controller('mt')
@UseGuards(MtPlayerGuard)
export class MtController {
    constructor(private readonly mtService: MtService) {}

    @Get('state')
    state(@Req() req: Request, @Query('since') since?: string) {
        return this.mtService.state(userOf(req).id, since === undefined ? undefined : Number(since));
    }

    @Post('join')
    join(@Req() req: Request, @Body() body: { nickname?: unknown }) {
        this.mtService.join(userOf(req), body?.nickname);
        return { success: true };
    }

    @Post('pass')
    pass(@Req() req: Request, @Body() body: { text?: unknown }) {
        return { success: true, ...this.mtService.pass(userOf(req).id, body?.text) };
    }

    @Post('grudge')
    grudge(@Req() req: Request, @Body() body: { targetUserId?: unknown }) {
        this.mtService.grudge(userOf(req).id, body?.targetUserId);
        return { success: true };
    }

    @Post('tot')
    tot(@Req() req: Request, @Body() body: { choice?: unknown }) {
        this.mtService.chooseTot(userOf(req).id, body?.choice);
        return { success: true };
    }

    @Post('tot/steal')
    steal(@Req() req: Request, @Body() body: { targetUserId?: unknown }) {
        this.mtService.chooseSteal(userOf(req).id, body?.targetUserId);
        return { success: true };
    }

    @Post('rename')
    rename(@Req() req: Request, @Body() body: { nickname?: unknown }) {
        this.mtService.rename(userOf(req).id, body?.nickname);
        return { success: true };
    }

    @Post('vote/naming')
    voteNaming(@Req() req: Request, @Body() body: { targetUserId?: unknown; approve?: unknown }) {
        this.mtService.voteNaming(userOf(req).id, body?.targetUserId, body?.approve);
        return { success: true };
    }

    @Post('vote/trial')
    voteTrial(@Req() req: Request, @Body() body: { targetUserId?: unknown }) {
        this.mtService.voteTrial(userOf(req).id, body?.targetUserId);
        return { success: true };
    }

    @Post('king')
    king(@Req() req: Request, @Body() body: { targetUserIds?: unknown }) {
        this.mtService.chooseKingTargets(userOf(req).id, body?.targetUserIds);
        return { success: true };
    }
}
