import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Body,
  Put,
  ParseIntPipe,
  Delete,
  UseGuards,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import { ReservationService } from './reservation.service';
import {
  IReservation,
  IReservationCreate,
  IReservationUpdate,
  IReservationAll,
  IReservationCreateMultiple,
  IReservationMultipleCreateResurt,
  IReservationApplyWorker
} from '@scspace-depot/types/reservation';
import { IDataResponse, ISuccessResponse } from '@scspace-depot/types/common';
import { AdminGuard, ManagerGuard, MemberGuard, MemberGuardWithReservation, WorkerGuard } from '../auth/jwt/jwt.guard';
import { IUser } from '@scspace-depot/types/user';
import { SpacePublicService } from '../space/space.public.service';
import { ReservationPublicService } from './reservation.public.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('reservation')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly reservationPublicService: ReservationPublicService,
    private readonly spaceService: SpacePublicService,
  ) { }

  //HOOK: useReservations
  //HOOK: useDateReservations
  @Get('space')
  async getReservationBySpaceID(
    @Query('spaceId', ParseIntPipe) spaceId: number,
    @Query('timeFrom') timeFrom?: number,
    @Query('timeTo') timeTo?: number
  ): Promise<IReservationAll[]> {
    return await this.reservationPublicService.getReservationBySpaceIDBetweenTime(
      spaceId,
      timeFrom,
      timeTo,
    );
  }

  // AuthGuard - user
  //HOOK: useUserReservation
  @UseGuards(AuthGuard("jwt"))
  @Get('user')
  async getReservationListByUserId(
    @Query('uid', ParseIntPipe) userId: number,
    @Query('oid', ParseIntPipe) organizationId: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('offset', ParseIntPipe) offset: number,
  ): Promise<IDataResponse<IReservationAll[]>> {
    return await this.reservationService.getReservationListByUserId(
      userId,
      organizationId,
      limit,
      offset,
    )
  };

  // @UseGuards(WorkerGuard)
  @UseGuards(AuthGuard("jwt"))
  @Get('work')
  async getWorkHistory(
    @Req() req: Request,
  ): Promise<IReservationAll[]> {
    const user = req.user as IUser;
    return await this.reservationService.getWorkHistory(user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get('work/needs')
  async getWorkerNeeds(): Promise<IReservationAll[]> {
    return await this.reservationService.getWorkNeeds();
  }

  @UseGuards(ManagerGuard)
  @Get()
  async getReservationList(
    @Query('oid', ParseIntPipe) organizationId: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('offset', ParseIntPipe) offset: number,
  ): Promise<IDataResponse<IReservationAll[]>> {
    return await this.reservationService.getReservationList(
      organizationId,
      limit,
      offset,
    )
  };

  // @UseGuards(UserGuard)
  // @Get('count')
  // async getReservationCount(
  //   @Query('oid', ParseIntPipe) organizationId: number,
  //   @Query('uid') userId?: number,
  // ): Promise<{ count: number }> {
  //   return await this.reservationService.getReservationCount({
  //     organizationId,
  //     userId,
  //   });
  // }

  //HOOK: useWaitReservations
  // @Get('manage')
  // async getManageReservation(): Promise<IReservationAll[]> {
  //   return await this.reservationService.getManageReservation();
  // }

  @UseGuards(ManagerGuard)
  @Get('duty')
  async getDutyReservation(
    @Query('timeFrom', ParseIntPipe) timeFrom: number,
    @Query('timeTo', ParseIntPipe) timeTo: number,
  ): Promise<IReservationAll[]> {
    return await this.reservationService.getDutyReservation(timeFrom, timeTo);
  }

  // AuthGuard - jwt
  //HOOK: useReservationAPI
  @UseGuards(MemberGuard)
  @Post()
  async postReservation(
    @Body() reservationInput: IReservationCreate,
    @Req() req: Request,
  ): Promise<IReservation> {
    return await this.reservationService.postReservation(reservationInput, req.user as IUser);
  }

  @UseGuards(ManagerGuard)
  @Post('multiple')
  async postMultipleReservation(
    @Body() reservationInput: IReservationCreateMultiple,
  ): Promise<IReservationMultipleCreateResurt> {
    return await this.reservationPublicService.postMultipleReservation(reservationInput);
  }

  // AuthGuard - user
  @UseGuards(MemberGuardWithReservation)
  @Put()
  async updateReservation(
    @Body() reservationInput: IReservationUpdate,
    @Req() req: Request,
  ): Promise<IReservation> {
    return await this.reservationService.updateReservation(reservationInput, req.user as IUser);
  }

  @UseGuards(WorkerGuard)
  @Put('worker')
  async updateWorkerReservation(
    @Body() updateWorker: IReservationApplyWorker,
  ): Promise<IReservation> {
    return await this.reservationService.assignWorker(updateWorker);
  }

  @UseGuards(AdminGuard)
  @Delete('all')
  async deleteAllReservation(): Promise<ISuccessResponse> {
    const spaces = await this.spaceService.fetchAll();
    for (const space of spaces) {
      const reservations = await this.reservationPublicService.getReservationBySpaceIDBetweenTime(space.id);
      for (const reservation of reservations) {
        await this.reservationService.deleteReservation(reservation.id, reservation.user);
      }
    }
    return {
      success: true,
    };
  }

  // AuthGuard - user
  @UseGuards(MemberGuardWithReservation)
  @Delete(':id')
  // 1인 경우를 고려하기 위해 추가
  // userid 비교 
  async deleteReservation(@Param('id') id: number, @Req() req: Request): Promise<ISuccessResponse> {
    return await this.reservationService.deleteReservation(id, (req as any).user as IUser);
  }
}
