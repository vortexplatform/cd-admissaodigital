import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: isDev ? true : (process.env.FRONTEND_URL ?? 'http://localhost:5010'),
    credentials: true,
  });
  const port = process.env.PORT ?? 5011;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
