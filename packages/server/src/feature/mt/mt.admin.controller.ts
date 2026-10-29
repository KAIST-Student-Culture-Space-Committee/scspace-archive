import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { MtService } from './mt.service';
import { MtAdminGuard } from './mt.guard';

@Controller('mt/admin')
@UseGuards(MtAdminGuard)
export class MtAdminController {
    constructor(private readonly mtService: MtService) {}

    @Get('state')
    state() {
        return this.mtService.adminState();
    }

    @Post('start')
    start() {
        this.mtService.start();
        return { success: true };
    }

    @Post('pause')
    pause() {
        this.mtService.pause();
        return { success: true };
    }

    @Post('resume')
    resume() {
        this.mtService.resume();
        return { success: true };
    }

    @Post('next')
    next() {
        this.mtService.next();
        return { success: true };
    }

    @Post('reset')
    reset() {
        this.mtService.reset();
        return { success: true };
    }

    @Patch('settings')
    updateSettings(@Body() body: unknown) {
        this.mtService.updateSettings(body);
        return { success: true };
    }

    @Patch('players/:userId')
    editPlayer(@Param('userId', ParseIntPipe) userId: number, @Body() body: { nickname?: unknown }) {
        this.mtService.editPlayer(userId, body?.nickname);
        return { success: true };
    }

    @Delete('players/:userId')
    kick(@Param('userId', ParseIntPipe) userId: number) {
        this.mtService.kick(userId);
        return { success: true };
    }
}
