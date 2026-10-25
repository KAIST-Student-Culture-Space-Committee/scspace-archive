import { FileInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions } from './match.upload';

export const MatchAdInterceptor = FileInterceptor('image', imageUploadOptions(10 * 1024 * 1024)); // GIF banners: 10MB
export const MatchPrizeInterceptor = FileInterceptor('image', imageUploadOptions(5 * 1024 * 1024)); // 5MB
