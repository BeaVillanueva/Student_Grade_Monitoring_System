import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeInquiry } from '../database/entities';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AcademicLocksModule } from '../common/academic-locks.module';
import { GradeInquiriesController } from './grade-inquiries.controller';
import { GradeInquiriesService } from './grade-inquiries.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([GradeInquiry]),
    AuditLogsModule,
    AcademicLocksModule,
  ],
  controllers: [GradeInquiriesController],
  providers: [GradeInquiriesService],
})
export class GradeInquiriesModule {}
