import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { SafeHttpExceptionFilter } from './common/http-exception.filter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database/database.config';
import { SubjectsModule } from './subjects/subjects.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...databaseOptions(), retryAttempts: 1 }),
    }),
    AuthModule,
    SubjectsModule,
    EnrollmentsModule,
    ThrottlerModule.forRoot({
      ipv6SubnetPrefix: 128,
      throttlers: [
        {
          name: 'api',
          ttl: 60_000,
          limit: 100,
          generateKey: (_context, ip, name) =>
            createHash('sha256').update(`${name}:${ip}`).digest('hex'),
        },
        {
          name: 'login',
          ttl: 60_000,
          limit: 5,
          skipIf: (context) =>
            Reflect.getMetadata('sgms:loginRateLimit', context.getHandler()) !==
            true,
        },
      ],
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
    { provide: APP_FILTER, useClass: SafeHttpExceptionFilter },
  ],
})
export class AppModule {}
