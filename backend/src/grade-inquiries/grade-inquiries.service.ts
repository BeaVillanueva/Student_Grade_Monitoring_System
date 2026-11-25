import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, Grade, GradeInquiry } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AcademicLocksService } from '../common/academic-locks.service';
import { writeTransaction } from '../common/write-transaction';
import { paginated, StudentQueryDto } from '../common/dto/academic-query.dto';
import { CreateInquiryDto, ResolveInquiryDto } from './dto/inquiry.dto';

function response(row: GradeInquiry) {
  return {
    inquiryId: row.inquiryId,
    gradeId: row.gradeId,
    studentId: row.studentId,
    message: row.message,
    status: row.status,
    dateSubmitted: row.dateSubmitted,
    resolvedBy: row.resolvedBy,
    resolutionNote: row.resolutionNote,
    dateResolved: row.dateResolved,
  };
}
@Injectable()
export class GradeInquiriesService {
  constructor(
    @InjectRepository(GradeInquiry)
    private readonly inquiries: Repository<GradeInquiry>,
    private readonly audit: AuditLogsService,
    private readonly locks: AcademicLocksService,
  ) {}
  async list(query: StudentQueryDto, actor: AuthenticatedUser) {
    if (
      actor.role === 'Student' &&
      query.studentId !== undefined &&
      query.studentId !== actor.userId
    )
      throw new ForbiddenException();
    const builder = this.inquiries
      .createQueryBuilder('inquiry')
      .innerJoin('inquiry.grade', 'grade')
      .innerJoin('grade.enrollment', 'enrollment')
      .innerJoin('enrollment.subject', 'subject');
    if (actor.role === 'Student')
      builder.andWhere(
        'inquiry.studentId = :owner AND enrollment.studentId = :owner',
        { owner: actor.userId },
      );
    else if (actor.role === 'Faculty')
      builder.andWhere('subject.facultyId = :faculty', {
        faculty: actor.userId,
      });
    else if (!['Admin', 'Department Head'].includes(actor.role))
      throw new ForbiddenException();
    if (query.studentId !== undefined)
      builder.andWhere('inquiry.studentId = :student', {
        student: query.studentId,
      });
    const [rows, total] = await builder
      .orderBy('inquiry.inquiryId', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return paginated(rows.map(response), total, query);
  }
  private async hint(gradeId: number) {
    const grade = await this.inquiries.manager.findOneBy(Grade, { gradeId });
    if (!grade) throw new NotFoundException();
    const enrollment = await this.inquiries.manager.findOneBy(Enrollment, {
      enrollmentId: grade.enrollmentId,
    });
    if (!enrollment) throw new NotFoundException();
    return {
      enrollmentId: grade.enrollmentId,
      subjectId: enrollment.subjectId,
    };
  }
  async create(input: CreateInquiryDto, actorId: number) {
    const hint = await this.hint(input.gradeId);
    return writeTransaction(this.inquiries.manager, async (manager) => {
      const { enrollment } = await this.locks.grade(
        manager,
        input.gradeId,
        hint,
      );
      await this.locks.actor(manager, actorId, ['Student']);
      if (enrollment.studentId !== actorId) throw new ForbiddenException();
      const row = await manager.save(
        GradeInquiry,
        manager.create(GradeInquiry, {
          gradeId: input.gradeId,
          studentId: actorId,
          message: input.message,
          status: 'Pending',
          resolvedBy: null,
          resolutionNote: null,
          dateResolved: null,
        }),
      );
      await this.audit.record(manager, {
        userId: actorId,
        action: 'INQUIRY_CREATE',
        tableAffected: 'grade_inquiries',
        recordId: row.inquiryId,
      });
      return response(row);
    });
  }
  async resolve(id: number, input: ResolveInquiryDto, actorId: number) {
    const inquiryHint = await this.inquiries.findOneBy({ inquiryId: id });
    if (!inquiryHint) throw new NotFoundException();
    const hint = await this.hint(inquiryHint.gradeId);
    return writeTransaction(this.inquiries.manager, async (manager) => {
      const { subject } = await this.locks.grade(
        manager,
        inquiryHint.gradeId,
        hint,
      );
      const row = await manager.findOne(GradeInquiry, {
        where: { inquiryId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException();
      if (row.gradeId !== inquiryHint.gradeId) throw new ConflictException();
      const actor = await this.locks.actor(manager, actorId, [
        'Admin',
        'Faculty',
      ]);
      if (actor.role === 'Faculty' && subject.facultyId !== actorId)
        throw new ForbiddenException();
      if (row.status !== 'Pending') throw new ConflictException();
      row.status = 'Resolved';
      row.resolvedBy = actorId;
      row.resolutionNote = input.resolutionNote;
      row.dateResolved = new Date(Math.floor(Date.now() / 1000) * 1000);
      await manager.save(row);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'INQUIRY_RESOLVE',
        tableAffected: 'grade_inquiries',
        recordId: id,
      });
      return response(row);
    });
  }
}
