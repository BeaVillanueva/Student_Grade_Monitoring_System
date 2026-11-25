import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { Enrollment, GradeInquiry, Subject, User } from '../database/entities';
import { publicUser } from '../auth/auth.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AcademicLocksService } from '../common/academic-locks.service';
import { paginated, PageQueryDto } from '../common/dto/academic-query.dto';
import { writeTransaction } from '../common/write-transaction';
import { UsersPolicyService } from './users-policy.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

function directory(row: User) {
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
  };
}
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly audit: AuditLogsService,
    private readonly locks: AcademicLocksService,
    private readonly policy: UsersPolicyService,
  ) {}
  async list(query: PageQueryDto, actor: AuthenticatedUser) {
    if (!['Admin', 'Department Head'].includes(actor.role))
      throw new ForbiddenException();
    const builder = this.users.createQueryBuilder('user');
    if (actor.role === 'Department Head')
      builder.where('user.role IN (:...roles)', {
        roles: ['Student', 'Faculty'],
      });
    const [rows, total] = await builder
      .orderBy('user.userId', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return paginated(
      rows.map((row) =>
        actor.role === 'Admin' ? publicUser(row) : directory(row),
      ),
      total,
      query,
    );
  }
  async findOne(id: number, actor: AuthenticatedUser) {
    const builder = this.users
      .createQueryBuilder('user')
      .where('user.userId = :id', { id });
    if (actor.role === 'Student' && id !== actor.userId)
      builder.andWhere('1 = 0');
    else if (actor.role === 'Faculty' && id !== actor.userId)
      builder
        .innerJoin('user.enrollments', 'enrollment')
        .innerJoin('enrollment.subject', 'subject')
        .andWhere('user.role = :student AND subject.facultyId = :faculty', {
          student: 'Student',
          faculty: actor.userId,
        });
    else if (actor.role === 'Department Head')
      builder.andWhere('user.role IN (:...roles)', {
        roles: ['Student', 'Faculty'],
      });
    else if (!['Admin', 'Student', 'Faculty'].includes(actor.role))
      throw new ForbiddenException();
    const row = await builder.getOne();
    if (!row) {
      if (await this.users.existsBy({ userId: id }))
        throw new ForbiddenException();
      throw new NotFoundException();
    }
    return actor.role === 'Admin' ||
      (id === actor.userId && actor.role !== 'Department Head')
      ? publicUser(row)
      : directory(row);
  }
  async create(input: CreateUserDto, actorId: number) {
    const passwordHash = await hash(input.password, 12);
    return writeTransaction(this.users.manager, async (manager) => {
      await this.policy.lockActiveAdmins(manager);
      await this.locks.actor(manager, actorId, ['Admin']);
      const row = await manager.save(
        User,
        manager.create(User, {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          passwordHash,
          role: input.role,
          accountStatus: input.accountStatus,
        }),
      );
      await this.audit.record(manager, {
        userId: actorId,
        action: 'USER_CREATE',
        tableAffected: 'users',
        recordId: row.userId,
      });
      return publicUser(row);
    });
  }
  async update(id: number, input: UpdateUserDto, actorId: number) {
    if (
      [
        input.firstName,
        input.lastName,
        input.email,
        input.password,
        input.role,
        input.accountStatus,
      ].every((value) => value === undefined)
    )
      throw new BadRequestException();
    const passwordHash =
      input.password === undefined ? undefined : await hash(input.password, 12);
    return writeTransaction(this.users.manager, async (manager) => {
      const admins = await this.policy.lockActiveAdmins(manager);
      await this.locks.actor(manager, actorId, ['Admin']);
      const row = await manager.findOne(User, {
        where: { userId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException();
      const role = input.role ?? row.role;
      const status = input.accountStatus ?? row.accountStatus;
      if (
        row.role === 'Admin' &&
        row.accountStatus === 'Active' &&
        (role !== 'Admin' || status !== 'Active') &&
        admins.length <= 1
      )
        throw new ConflictException();
      if (role !== row.role) {
        if (
          role !== 'Student' &&
          ((await manager.existsBy(Enrollment, { studentId: id })) ||
            (await manager.existsBy(GradeInquiry, { studentId: id })))
        )
          throw new ConflictException();
        if (
          role !== 'Faculty' &&
          (await manager.existsBy(Subject, { facultyId: id }))
        )
          throw new ConflictException();
        if (
          !['Faculty', 'Admin'].includes(role) &&
          (await manager.existsBy(GradeInquiry, { resolvedBy: id }))
        )
          throw new ConflictException();
      }
      if (input.firstName !== undefined) row.firstName = input.firstName;
      if (input.lastName !== undefined) row.lastName = input.lastName;
      if (input.email !== undefined) row.email = input.email;
      if (passwordHash !== undefined) row.passwordHash = passwordHash;
      row.role = role;
      row.accountStatus = status;
      await manager.save(row);
      await this.audit.record(manager, {
        userId: actorId,
        action: 'USER_UPDATE',
        tableAffected: 'users',
        recordId: id,
      });
      return publicUser(row);
    });
  }
}
