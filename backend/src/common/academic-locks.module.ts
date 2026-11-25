import { Module } from '@nestjs/common';
import { AcademicLocksService } from './academic-locks.service';
@Module({ providers: [AcademicLocksService], exports: [AcademicLocksService] })
export class AcademicLocksModule {}
