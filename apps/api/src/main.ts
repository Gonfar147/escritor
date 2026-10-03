import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { CollaborationService } from './collaboration/collaboration.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // La foto del personaje viaja como data URL (ya reducida en el navegador); el límite por defecto (100kb) queda corto.
  app.useBodyParser('json', { limit: '3mb' });

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  // Colaboración en tiempo real (Hocuspocus): se cuelga del mismo http.Server
  // que ya usa Express/Nest, embebido en este mismo proceso — no es un
  // servicio ni un puerto nuevo.
  app.get(CollaborationService).attach(app.getHttpServer());

  // eslint-disable-next-line no-console
  console.log(`API lista en http://localhost:${port}/api/v1`);
}

bootstrap();
