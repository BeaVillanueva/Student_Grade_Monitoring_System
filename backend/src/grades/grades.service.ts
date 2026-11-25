import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, Grade, User } from '../database/entities';
import { assertGradeScore } from '../database/domain';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AcademicLocksService } from '../common/academic-locks.service';
import { paginated, StudentQueryDto } from '../common/dto/academic-query.dto';
import { writeTransaction } from '../common/write-transaction';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';

function response(row: Grade) {
  return {
    gradeId: row.gradeId,
    enrollmentId: row.enrollmentId,
    gradeType: row.gradeType,
    score: row.score,
    remarks: row.remarks,
    dateRecorded: row.dateRecorded,
  };
}
function score(value: number) {
  try {
    assertGradeScore(String(value));
  } catch {
    throw new BadRequestException();
  }
  return value.toFixed(2);
}
@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
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
    const builder = this.grades
      .createQueryBuilder('grade')
      .innerJoin('grade.enrollment', 'enrollment')
      .innerJoin('enrollment.subject', 'subject');
    if (actor.role === 'Student')
      builder.andWhere('enrollment.studentId = :owner', {
        owner: actor.userId,
      });
    else if (actor.role === 'Faculty')
      builder.andWhere('subject.facultyId = :faculty', {
        faculty: actor.userId,
      });
    else if (!['Admin', 'Department Head'].includes(actor.role))
      throw new ForbiddenException();
    if (query.studentId !== undefined)
      builder.andWhere('enrollment.studentId = :student', {
        student: query.studentId,
      });
    const [rows, total] = await builder
      .orderBy('grade.gradeId', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return paginated(rows.map(response), total, query);
  }
  async create(input: CreateGradeDto, actorId: number) {
    const value = score(input.score);
    const hint = await this.grades.manager.findOneBy(Enrollment, {
      enrollmentId: input.enrollmentId,
    });
    if (!hint) throw new NotFoundException();
    return writeTransaction(this.grades.manager, async (manager) => {
      const { subject, enrollment } = await this.locks.enrollment(
        manager,
        hint.enrollmentId,
        hint.subjectId,
      );
      await this.locks.actor(manager, actorId, ['Faculty']);
      if (subject.facultyId !== actorId) throw new ForbiddenException();
      if (enrollment.status !== 'Enrolled') throw new ConflictException();
      const student = await manager.findOne(User, {
        where: { userId: enrollment.studentId },
        lock: { mode: 'pessimistic_read' },
        select: { userId: true, role: true, accountStatus: true },
      });
      if (
        !student ||
        student.role !== 'Student' ||
        student.accountStatus !== 'Active'
      )
        throw new BadRequestException();
      const row = await manager.save(
        Grade,
        manager.create(Grade, {
          enrollmentId: enrollment.enrollmentId,
          gradeType: input.gradeType,
          score: value,
          remarks: input.remarks ?? null,
        }),
      );
      await this.audit.record(manager, {
        userId: actorId,
        action: 'GRADE_CREATE',
        tableAffected: 'grades',
        recordId: row.gradeId,
      });
      return response(row);
    });
  }
  async update(id: number, input: UpdateGradeDto, actorId: number) {
    if (
      input.gradeType === undefined &&
      input.score === undefined &&
      input.remarks === undefined
    )
      throw new BadRequestException();
    const value = input.score === undefined ? undefined : score(input.score);
    const gradeHint = await this.grades.findOneBy({ gradeId: id });
    if (!gradeHint) throw new NotFoundException();
    const enrollmentHint = await this.grades.manager.findOneBy(Enrollment, {
      enrollmentId: gradeHint.enrollmentId,
    });
    if (!enrollmentHint) throw new NotFoundException();
    return writeTransaction(this.grades.manager, async (manager) => {
      const { grade, subject } = await this.locks.grade(manager, id, {
        enrollmentId: gradeHint.enrollmentId,
        subjectId: enrollmentHint.subjectId,
      });
      await this.locks.actor(manager, actorId, ['Faculty']);
      if (subject.facultyId !== actorId) throw new ForbiddenException();
      if (input.gradeType !== undefined) grade.gradeType = input.gradeType;
      if (value !== undefined) grade.score = value;
      if (input.remarks !== undefined) grade.remarks = input.remarks;
      await manager.save(grade);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'GRADE_UPDATE',
        tableAffected: 'grades',
        recordId: id,
      });
      return response(grade);
    });
  }
}
