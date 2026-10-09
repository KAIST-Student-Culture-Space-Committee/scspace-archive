import { Controller, Get, Param, ParseIntPipe, Post, Body, Delete, Put, UseGuards, NotFoundException, Patch, Query, Logger, DefaultValuePipe } from '@nestjs/common';
import { UserService } from './user.service';
import { IUser, IUserCreate, IUserUpdate } from '@scspace-depot/types/user';
import { ISuccessResponse } from '@scspace-depot/types/common';
import { UserPublicService } from './user.public.service';
import { AdminGuard, ManagerGuard } from '../auth/jwt/jwt.guard';
import { AuthGuard } from '@nestjs/passport';
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userPublicService: UserPublicService,
  ) { }

  @UseGuards(AdminGuard)
  @Get('all')
  async getUsers(
    @Query('studentNumberPrefix', ParseIntPipe) studentNumberPrefix?: number,
  ): Promise<IUser[]> {
    return await this.userPublicService.fetchAll(studentNumberPrefix ?? 0);
  }

  //HOOK: useUserInfo
  @UseGuards(AuthGuard('jwt'))
  @Get('studentNumber/:studentNumber')
  async getUserByStudentNumber(
    @Param('studentNumber') studentNumber: number
  ): Promise<IUser> {

    const user = await this.userPublicService.fetchByStudentNumber(studentNumber);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @UseGuards(ManagerGuard)
  @Get('search')
  async searchUsers(
    @Query('q') q?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<IUser[]> {
    if (!q || !q.trim()) {
      return [];
    }
    return await this.userPublicService.search(q, limit ?? 20);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile/:id')
  async getUserProfileById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<IUser> {
    const user = await this.userPublicService.fetchById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  //HOOK: useUserInfo
  @UseGuards(ManagerGuard)
  @Get(':id')
  async getUserById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<IUser> {
    const user = await this.userPublicService.fetchById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @UseGuards(ManagerGuard)
  @Post()
  async postUser(
    @Body() body: IUserCreate
  ): Promise<IUser> {
    return await this.userService.insert(body);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async patchUserType(
    @Param('id', ParseIntPipe) uid: number,
    @Body() body: IUserUpdate
  ): Promise<IUser> {
    return await this.userService.update(uid, body);
  }

  //HOOK: useUserInfo
  @UseGuards(ManagerGuard)
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ISuccessResponse> {
    return await this.userService.delete(id);
  }


}
