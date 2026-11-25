import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Enrollment, Grade, Subject, User } from '../database/entities';
import type { UserRole } from '../database/domain';

@Injectable()
export class AcademicLocksService {
  async enrollment(manager: EntityManager, id: number, subjectId: number) {
    const subject = await manager.findOne(Subject, {
      where: { subjectId },
      lock: { mode: 'pessimistic_read' },
    });
    if (!subject) throw new NotFoundException();
    const enrollment = await manager.findOne(Enrollment, {
      where: { enrollmentId: id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!enrollment) throw new NotFoundException();
    if (enrollment.subjectId !== subjectId) throw new ConflictException();
    return { subject, enrollment };
  }
  async grade(
    manager: EntityManager,
    id: number,
    hint: { enrollmentId: number; subjectId: number },
  ) {
    const parent = await this.enrollment(
      manager,
      hint.enrollmentId,
      hint.subjectId,
    );
    const grade = await manager.findOne(Grade, {
      where: { gradeId: id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!grade) throw new NotFoundException();
    if (grade.enrollmentId !== hint.enrollmentId) throw new ConflictException();
    return { ...parent, grade };
  }
  async actor(
    manager: EntityManager,
    userId: number,
    roles: readonly UserRole[],
  ) {
    const actor = await manager.findOne(User, {
      where: { userId },
      lock: { mode: 'pessimistic_read' },
      select: { userId: true, role: true, accountStatus: true },
    });
    if (!actor || actor.accountStatus !== 'Active')
      throw new UnauthorizedException();
    if (!roles.includes(actor.role)) throw new ForbiddenException();
    return actor;
  }
}
