import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from './common/configure-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    logger: ['log', 'warn'],
  });
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '127.0.0.1');
}
bootstrap().catch(() => {
  console.error(
    'SGMS startup failed. Check local configuration and database availability.',
  );
  process.exitCode = 1;
});
