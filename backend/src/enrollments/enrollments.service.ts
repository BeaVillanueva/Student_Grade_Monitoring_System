import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Enrollment, Grade, Subject, User } from '../database/entities';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateEnrollmentDto,
  EnrollmentListDto,
  ReplaceEnrollmentDto,
} from './dto/enrollment.dto';

function enrollmentResponse(row: Enrollment) {
  return {
    enrollmentId: row.enrollmentId,
    studentId: row.studentId,
    subjectId: row.subjectId,
    semester: row.semester,
    schoolYear: row.schoolYear,
    dateEnrolled: row.dateEnrolled,
    status: row.status,
  };
}

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    private readonly audit: AuditLogsService,
  ) {}

  private scopedQuery(actor: AuthenticatedUser) {
    const query = this.enrollments.createQueryBuilder('enrollment');
    if (actor.role === 'Student')
      query.where('enrollment.studentId = :owner', { owner: actor.userId });
    else if (actor.role === 'Faculty')
      query
        .innerJoin('enrollment.subject', 'subject')
        .where('subject.facultyId = :faculty', { faculty: actor.userId });
    else if (!['Admin', 'Department Head'].includes(actor.role))
      throw new ForbiddenException();
    return query;
  }

  async list(input: EnrollmentListDto, actor: AuthenticatedUser) {
    if (
      actor.role === 'Student' &&
      input.studentId !== undefined &&
      input.studentId !== actor.userId
    )
      throw new ForbiddenException();
    const query = this.scopedQuery(actor);
    if (input.studentId !== undefined)
      query.andWhere('enrollment.studentId = :student', {
        student: input.studentId,
      });
    const [rows, total] = await query
      .orderBy('enrollment.enrollmentId', 'ASC')
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      data: rows.map(enrollmentResponse),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const record = await this.scopedQuery(actor)
      .andWhere('enrollment.enrollmentId = :id', { id })
      .getOne();
    if (record) return enrollmentResponse(record);
    if (await this.enrollments.existsBy({ enrollmentId: id }))
      throw new ForbiddenException();
    throw new NotFoundException();
  }

  private async mutate<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.enrollments.manager.transaction(work);
    } catch (error) {
      const errno = (error as { driverError?: { errno?: number } })?.driverError
        ?.errno;
      if ([1062, 1451, 1213, 1205].includes(errno ?? 0))
        throw new ConflictException();
      throw error;
    }
  }

  private async validateStudent(
    manager: EntityManager,
    id: number,
  ): Promise<void> {
    const user = await manager.findOne(User, {
      where: { userId: id },
      select: { userId: true, role: true, accountStatus: true },
      lock: { mode: 'pessimistic_read' },
    });
    if (!user) throw new NotFoundException();
    if (user.role !== 'Student' || user.accountStatus !== 'Active')
      throw new BadRequestException();
  }

  private async lockSubjects(
    manager: EntityManager,
    ids: number[],
  ): Promise<void> {
    const unique = [...new Set(ids)].sort((a, b) => a - b);
    const rows = await manager.find(Subject, {
      where: { subjectId: In(unique) },
      order: { subjectId: 'ASC' },
      select: { subjectId: true },
      lock: { mode: 'pessimistic_read' },
    });
    if (rows.length !== unique.length) throw new NotFoundException();
  }

  private async hasGrades(
    manager: EntityManager,
    id: number,
  ): Promise<boolean> {
    // A locking read sees the latest committed Grades even under REPEATABLE READ.
    // The parent Enrollment write lock prevents new Grade FK references until commit.
    return (
      (
        await manager.find(Grade, {
          where: { enrollmentId: id },
          select: { gradeId: true },
          lock: { mode: 'pessimistic_read' },
          take: 1,
        })
      ).length > 0
    );
  }

  async create(input: CreateEnrollmentDto, actorId: number) {
    return this.mutate(async (manager) => {
      await this.lockSubjects(manager, [input.subjectId]);
      await this.validateStudent(manager, input.studentId);
      const row = await manager.save(
        Enrollment,
        manager.create(Enrollment, {
          studentId: input.studentId,
          subjectId: input.subjectId,
          semester: input.semester,
          schoolYear: input.schoolYear,
          dateEnrolled: input.dateEnrolled,
          status: input.status,
        }),
      );
      await this.audit.record(manager, {
        userId: actorId,
        action: 'ENROLLMENT_CREATE',
        tableAffected: 'enrollments',
        recordId: row.enrollmentId,
      });
      return enrollmentResponse(row);
    });
  }

  async replace(id: number, input: ReplaceEnrollmentDto, actorId: number) {
    const hint = await this.enrollments.findOneBy({ enrollmentId: id });
    if (!hint) throw new NotFoundException();
    return this.mutate(async (manager) => {
      // Subject -> Enrollment lock order matches Subject reassignment/deletion.
      await this.lockSubjects(manager, [hint.subjectId, input.subjectId]);
      const row = await manager.findOne(Enrollment, {
        where: { enrollmentId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException();
      if (row.subjectId !== hint.subjectId) throw new ConflictException();
      const changedIdentity =
        row.studentId !== input.studentId ||
        row.subjectId !== input.subjectId ||
        row.semester !== input.semester ||
        row.schoolYear !== input.schoolYear;
      if (changedIdentity && (await this.hasGrades(manager, id)))
        throw new ConflictException();
      if (row.studentId !== input.studentId)
        await this.validateStudent(manager, input.studentId);
      row.studentId = input.studentId;
      row.subjectId = input.subjectId;
      row.semester = input.semester;
      row.schoolYear = input.schoolYear;
      row.status = input.status;
      // dateEnrolled is immutable and deliberately absent from ReplaceEnrollmentDto.
      await manager.save(row);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'ENROLLMENT_UPDATE',
        tableAffected: 'enrollments',
        recordId: id,
      });
      return enrollmentResponse(row);
    });
  }

  async remove(id: number, actorId: number): Promise<void> {
    const hint = await this.enrollments.findOneBy({ enrollmentId: id });
    if (!hint) throw new NotFoundException();
    await this.mutate(async (manager) => {
      await this.lockSubjects(manager, [hint.subjectId]);
      const row = await manager.findOne(Enrollment, {
        where: { enrollmentId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException();
      if (row.subjectId !== hint.subjectId) throw new ConflictException();
      if (await this.hasGrades(manager, id)) throw new ConflictException();
      await manager.delete(Enrollment, id);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'ENROLLMENT_DELETE',
        tableAffected: 'enrollments',
        recordId: id,
      });
    });
  }
}
