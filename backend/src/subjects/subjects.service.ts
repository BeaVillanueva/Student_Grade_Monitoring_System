import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Subject, User, Enrollment, Grade } from '../database/entities';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateSubjectDto,
  ReplaceSubjectDto,
  SubjectListDto,
} from './dto/subject.dto';

function subjectResponse(row: Subject) {
  return {
    subjectId: row.subjectId,
    subjectCode: row.subjectCode,
    subjectName: row.subjectName,
    units: row.units,
    facultyId: row.facultyId,
  };
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    private readonly audit: AuditLogsService,
  ) {}

  async list(query: SubjectListDto) {
    const [rows, total] = await this.subjects.findAndCount({
      order: { subjectId: 'ASC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return {
      data: rows.map(subjectResponse),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findOne(id: number) {
    const subject = await this.subjects.findOneBy({ subjectId: id });
    if (!subject) throw new NotFoundException();
    return subjectResponse(subject);
  }

  private async validateFaculty(
    manager: EntityManager,
    id: number,
  ): Promise<void> {
    const faculty = await manager.findOne(User, {
      where: { userId: id },
      lock: { mode: 'pessimistic_read' },
      select: { userId: true, role: true, accountStatus: true },
    });
    if (!faculty) throw new NotFoundException();
    if (faculty.role !== 'Faculty' || faculty.accountStatus !== 'Active')
      throw new BadRequestException();
  }

  private async mutate<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.subjects.manager.transaction(work);
    } catch (error) {
      const errno = (error as { driverError?: { errno?: number } })?.driverError
        ?.errno;
      if ([1062, 1451, 1213, 1205].includes(errno ?? 0))
        throw new ConflictException();
      throw error;
    }
  }

  async create(input: CreateSubjectDto, actorId: number) {
    return this.mutate(async (manager) => {
      await this.validateFaculty(manager, input.facultyId);
      const subject = await manager.save(
        Subject,
        manager.create(Subject, {
          subjectCode: input.subjectCode,
          subjectName: input.subjectName,
          units: input.units,
          facultyId: input.facultyId,
        }),
      );
      await this.audit.record(manager, {
        userId: actorId,
        action: 'SUBJECT_CREATE',
        tableAffected: 'subjects',
        recordId: subject.subjectId,
      });
      return subjectResponse(subject);
    });
  }

  async replace(id: number, input: ReplaceSubjectDto, actorId: number) {
    return this.mutate(async (manager) => {
      const subject = await manager.findOne(Subject, {
        where: { subjectId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subject) throw new NotFoundException();
      await this.validateFaculty(manager, input.facultyId);
      if (subject.facultyId !== input.facultyId) {
        // Lock the referencing enrollments before checking Grades: concurrent grade
        // inserts need an FK lock on those rows and cannot slip through this check.
        await manager.find(Enrollment, {
          where: { subjectId: id },
          lock: { mode: 'pessimistic_write' },
          select: { enrollmentId: true },
        });
        const graded = await manager
          .createQueryBuilder(Grade, 'grade')
          .innerJoin('grade.enrollment', 'enrollment')
          .where('enrollment.subjectId = :id', { id })
          .getExists();
        if (graded) throw new ConflictException();
      }
      subject.subjectCode = input.subjectCode;
      subject.subjectName = input.subjectName;
      subject.units = input.units;
      subject.facultyId = input.facultyId;
      await manager.save(subject);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'SUBJECT_UPDATE',
        tableAffected: 'subjects',
        recordId: id,
      });
      return subjectResponse(subject);
    });
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.mutate(async (manager) => {
      const subject = await manager.findOne(Subject, {
        where: { subjectId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subject) throw new NotFoundException();
      if (await manager.existsBy(Enrollment, { subjectId: id }))
        throw new ConflictException();
      await manager.delete(Subject, id);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'SUBJECT_DELETE',
        tableAffected: 'subjects',
        recordId: id,
      });
    });
  }
}
