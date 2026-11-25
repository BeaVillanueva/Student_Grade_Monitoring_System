import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grade } from '../database/entities';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AcademicLocksModule } from '../common/academic-locks.module';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Grade]),
    AuditLogsModule,
    AcademicLocksModule,
  ],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
