import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { publicStorage } from '@scspace-server/tools/file/file.storage';

const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/** Multer options for admin-uploaded images (stored in the public folder, served from /api/uploads). */
export function imageUploadOptions(maxBytes: number): MulterOptions {
    return {
        storage: publicStorage,
        limits: { fileSize: maxBytes },
        fileFilter: (req, file, cb) => {
            if (IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
            else cb(new BadRequestException('JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.'), false);
        },
    };
}
