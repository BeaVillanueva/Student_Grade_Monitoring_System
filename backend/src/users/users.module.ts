import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AcademicLocksModule } from '../common/academic-locks.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersPolicyService } from './users-policy.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuditLogsModule,
    AcademicLocksModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersPolicyService],
})
export class UsersModule {}
