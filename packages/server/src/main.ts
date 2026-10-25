import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/api');

  // Body parser 제한 설정 (파일 업로드용)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // uploads/public 폴더의 절대 경로 설정 (dev 모드에서는 packages/server가 cwd)
  const uploadsPath = join(process.cwd(), 'uploads', 'public');
  console.log('Static files path:', uploadsPath);

  app.useStaticAssets(uploadsPath, { prefix: '/uploads' });
  // nginx only forwards /api/* to this server, so expose the same files under /api/uploads too.
  app.useStaticAssets(uploadsPath, { prefix: '/api/uploads' });

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:33000',
      'http://localhost:33001',
      'http://localhost',
      'https://iam2.kaist.ac.kr',
      'https://scspace.kws.sparcs.net'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    optionsSuccessStatus: 200 // IE11 지원을 위한 설정
  });

  // 쿠키 파서 설정
  app.use(cookieParser());

  // URL-encoded 형식의 요청 본문을 파싱 (NestJS에서는 기본적으로 지원됨)
  //app.use(express.urlencoded({ extended: true })); // 추가적인 설정이 필요하면 사용
  const configService = app.get(ConfigService);
  const port = configService.get<number>('SERVER_PORT') || 3001;
  await app.listen(port);
}
bootstrap();
