import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions } from './match.upload';

export const MatchLogoInterceptor = FileFieldsInterceptor(
    [{ name: 'teamALogo', maxCount: 1 }, { name: 'teamBLogo', maxCount: 1 }],
    imageUploadOptions(5 * 1024 * 1024), // 5MB
);
