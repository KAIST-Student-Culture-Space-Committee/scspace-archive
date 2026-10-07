import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    Req,
    BadRequestException,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
    IArticleCreate,
    IArticleUpdate,
    IArticleQuery,
    IArticleWithUser,
    IArticleFetchResult,
    IArticlePreview,
} from '@scspace-depot/types/article';
import { publicStorage } from '@scspace-server/tools/file/file.storage';
import { ISuccessResponse } from '@scspace-depot/types/common';
import { Request } from 'express';
import { IUser } from '@scspace-depot/types/user';
import { UserUtils } from '@scspace-depot/utils/user.utils';
import { OptionalJwtAuthGuard } from '../auth/jwt/jwt.guard';
import { ArticleStateEnum } from '@scspace-depot/enums/article.enum';

@Controller('article')
export class ArticleController {
    constructor(
        private readonly articleService: ArticleService,
    ) { }

    @Get('preview')
    async getArticlePreviews(): Promise<IArticlePreview> {
        return await this.articleService.getArticlePreviews();
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 20 },
            { name: 'files', maxCount: 20 },
        ], {
            storage: publicStorage,
        })
    )
    async createArticle(
        @Req() req: Request,
        @Body() createData: Omit<IArticleCreate, 'userId' | 'images' | 'files'>,
        @UploadedFiles() files: { images?: Express.Multer.File[], files?: Express.Multer.File[] }
    ) {
        const user = req.user as IUser;
        const userId = user.id;

        // Handle uploaded files
        const imageData = files?.images ? JSON.stringify(files.images.map(f => f.filename)) : undefined;
        const fileData = files?.files ? JSON.stringify(files.files.map(f => f.filename)) : undefined;

        const articleData = {
            ...createData,
            images: imageData,
            files: fileData,
        };

        return await this.articleService.createArticle(userId, articleData);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async getArticles(
        @Query() query: IArticleQuery,
        @Req() req: Request
    ): Promise<IArticleFetchResult> {
        const user = req.user as IUser | undefined;
        const isManager = user ? UserUtils.isManager(user.type) : false;

        if (!user) return await this.articleService.getArticles({ ...query, state: ArticleStateEnum.FOR_ALL });
        if (!isManager) return await this.articleService.getArticles({ ...query, state: ArticleStateEnum.FOR_KAIST });
        return await this.articleService.getArticles(query);
    }

    @Get('search')
    async searchArticles(
        @Query('q') searchTerm: string,
        @Query() query: Omit<IArticleQuery, 'search'>
    ) {
        return await this.articleService.searchArticles(searchTerm, query);
    }

    @Get('type/:type')
    async getArticlesByType(
        @Param('type', ParseIntPipe) type: number,
        @Query() query: Omit<IArticleQuery, 'type'>
    ) {
        return await this.articleService.getArticlesByType(type, query);
    }

    @Get('my')
    @UseGuards(AuthGuard('jwt'))
    async getMyArticles(@Req() req: any, @Query() query: Omit<IArticleQuery, 'userId'>) {
        const userId = req.user.id;
        return await this.articleService.getUserArticles(userId, query);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    async getArticleById(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request
    ) {
        const user = req.user as IUser | undefined;
        const isManager = user ? UserUtils.isManager(user.type) : false;

        const data = await this.articleService.getArticleById(id);

        if (data.state === ArticleStateEnum.FOR_ALL) return data;
        if (data.state === ArticleStateEnum.FOR_KAIST && user) return data;
        if (data.state === ArticleStateEnum.HIDE && isManager) return data;
        if (user && data.userId === user.id) return data;

        throw new BadRequestException('You do not have permission to view this article.');
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'))
    async updateArticle(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Body() updateData: IArticleUpdate,
    ) {
        const user = req.user as IUser;
        const userId = user.id;
        const isManager = UserUtils.isManager(user.type);

        return await this.articleService.updateArticle(id, userId, updateData, isManager);
    }

    @Put(':id/image')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 20 },
        ], {
            storage: publicStorage,
        })
    )
    async updateArticleImage(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @UploadedFiles() files: { images?: Express.Multer.File[] }
    ) {
        const user = req.user as IUser;
        const userId = user.id;
        const isManager = UserUtils.isManager(user.type);

        const imageData = files?.images ? JSON.stringify(files.images.map(f => f.filename)) : undefined;

        return await this.articleService.updateArticle(id, userId, { images: imageData }, isManager);
    }

    @Put(':id/file')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 20 },
            { name: 'files', maxCount: 20 },
        ], {
            storage: publicStorage,
        })
    )
    async updateArticleFile(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @UploadedFiles() files: { images?: Express.Multer.File[], files?: Express.Multer.File[] }
    ) {
        const user = req.user as IUser;
        const userId = user.id;
        const isManager = UserUtils.isManager(user.type);

        const imageData = files?.images ? JSON.stringify(files.images.map(f => f.filename)) : undefined;
        const fileData = files?.files ? JSON.stringify(files.files.map(f => f.filename)) : undefined;

        return await this.articleService.updateArticleFile(id, userId, {
            images: imageData,
            files: fileData
        }, isManager);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async deleteArticle(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<ISuccessResponse> {
        const userId = req.user.id;
        const isAdmin = req.user.type >= 3; // Assuming admin type is 3 or higher

        await this.articleService.deleteArticle(id, userId, isAdmin);

        return { success: true };
    }

    @Put(':id/state')
    @UseGuards(AuthGuard('jwt'))
    async showArticle(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
        @Body() body: { state: ArticleStateEnum }
    ) {
        const userId = req.user.id;
        const isAdmin = req.user.type >= 3;

        return await this.articleService.setArticleState(id, userId, body.state, isAdmin);
    }
}