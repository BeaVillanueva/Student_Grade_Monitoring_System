import 'reflect-metadata';
import { DataSource, In, Like } from 'typeorm';
import { hash } from 'bcrypt';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import {
  User,
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  AuditLog,
} from '../src/database/entities';
import { databaseOptions } from '../src/database/database.config';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { AcademicLocksService } from '../src/common/academic-locks.service';
import { GradesService } from '../src/grades/grades.service';
import { GradeInquiriesService } from '../src/grade-inquiries/grade-inquiries.service';
import { UsersService } from '../src/users/users.service';
import { UsersPolicyService } from '../src/users/users-policy.service';
import { EnrollmentsService } from '../src/enrollments/enrollments.service';
import { SubjectsService } from '../src/subjects/subjects.service';

describe('Remaining modules concurrency (independent connections)', () => {
  let source: DataSource;
  let users: User[];
  let subjects: Subject[];
  let enrollments: Enrollment[];
  let inquiry: GradeInquiry;
  let prefix: string;
  let fixtureHash: string;
  let baseline: number[];
  let audit: AuditLogsService;
  let policy: UsersPolicyService;
  let grades: GradesService;
  let inquiries: GradeInquiriesService;
  let accounts: UsersService;
  let enrollmentService: EnrollmentsService;
  let subjectService: SubjectsService;
  const entities = [User, Subject, Enrollment, Grade, GradeInquiry, AuditLog];
  const demoFile = resolve(__dirname, '../.env.demo');
  const digest = createHash('sha256')
    .update(readFileSync(demoFile))
    .digest('hex');
  beforeAll(async () => {
    Object.assign(
      process.env,
      parseEnv(readFileSync(resolve(__dirname, '../.env'), 'utf8')),
    );
    source = await new DataSource(databaseOptions()).initialize();
    fixtureHash = await hash(randomBytes(24).toString('hex'), 12);
    baseline = await Promise.all(
      entities.map((entity) => source.manager.count(entity)),
    );
  });
  beforeEach(async () => {
    prefix = `N${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    users = [];
    subjects = [];
    enrollments = [];
    await source.transaction(async (manager) => {
      users = await manager.save(
        User,
        (
          [
            'Admin',
            'Student',
            'Faculty',
            'Student',
            'Admin',
            'Admin',
            'Faculty',
            'Faculty',
          ] as const
        ).map((role, i) =>
          manager.create(User, {
            firstName: 'Temporary',
            lastName: 'NewConcurrency',
            email: `${prefix}-${i}@sgms.example.test`,
            role,
            accountStatus: 'Active',
            passwordHash: fixtureHash,
          }),
        ),
      );
      subjects = await manager.save(
        Subject,
        [2, 6].map((faculty, i) =>
          manager.create(Subject, {
            subjectCode: `${prefix}-${i}`,
            subjectName: 'Temporary Concurrency Subject',
            units: 3,
            facultyId: users[faculty].userId,
          }),
        ),
      );
      enrollments = await manager.save(
        Enrollment,
        [
          [1, 0],
          [3, 1],
        ].map(([student, subject]) =>
          manager.create(Enrollment, {
            studentId: users[student].userId,
            subjectId: subjects[subject].subjectId,
            semester: '1st Semester',
            schoolYear: '2026-2027',
            dateEnrolled: '2026-08-17',
            status: 'Enrolled',
          }),
        ),
      );
      const grade = await manager.save(
        Grade,
        manager.create(Grade, {
          enrollmentId: enrollments[1].enrollmentId,
          gradeType: 'Midterm',
          score: '90.00',
          remarks: null,
        }),
      );
      inquiry = await manager.save(
        GradeInquiry,
        manager.create(GradeInquiry, {
          gradeId: grade.gradeId,
          studentId: users[3].userId,
          message: 'Concurrent inquiry',
          status: 'Pending',
          resolvedBy: null,
          resolutionNote: null,
          dateResolved: null,
        }),
      );
    });
    audit = new AuditLogsService();
    policy = new UsersPolicyService();
    const locks = new AcademicLocksService();
    grades = new GradesService(source.getRepository(Grade), audit, locks);
    inquiries = new GradeInquiriesService(
      source.getRepository(GradeInquiry),
      audit,
      locks,
    );
    accounts = new UsersService(
      source.getRepository(User),
      audit,
      locks,
      policy,
    );
    enrollmentService = new EnrollmentsService(
      source.getRepository(Enrollment),
      audit,
    );
    subjectService = new SubjectsService(source.getRepository(Subject), audit);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    if (!users.length) return;
    await source.transaction(async (manager) => {
      const ownedUsers = await manager.findBy(User, {
        userId: In(users.map((row) => row.userId)),
      });
      if (
        ownedUsers.length !== users.length ||
        ownedUsers.some((row) => !row.email.startsWith(`${prefix}-`))
      )
        throw new Error('Unsafe user fixture cleanup refused.');
      const ownedSubjects = await manager.findBy(Subject, {
        subjectCode: Like(`${prefix}-%`),
      });
      if (
        ownedSubjects.some(
          (row) => !users.some((user) => user.userId === row.facultyId),
        )
      )
        throw new Error('Unsafe subject fixture cleanup refused.');
      const records = await manager.findBy(Enrollment, {
        subjectId: In(ownedSubjects.map((row) => row.subjectId)),
      });
      const gradeRows = records.length
        ? await manager.findBy(Grade, {
            enrollmentId: In(records.map((row) => row.enrollmentId)),
          })
        : [];
      if (gradeRows.length)
        await manager.delete(GradeInquiry, {
          gradeId: In(gradeRows.map((row) => row.gradeId)),
        });
      await manager.delete(AuditLog, {
        userId: In(users.map((row) => row.userId)),
      });
      if (gradeRows.length)
        await manager.delete(Grade, {
          gradeId: In(gradeRows.map((row) => row.gradeId)),
        });
      if (records.length)
        await manager.delete(Enrollment, {
          enrollmentId: In(records.map((row) => row.enrollmentId)),
        });
      if (ownedSubjects.length)
        await manager.delete(Subject, {
          subjectId: In(ownedSubjects.map((row) => row.subjectId)),
        });
      await manager.delete(User, {
        userId: In(users.map((row) => row.userId)),
      });
    });
    expect(
      await Promise.all(entities.map((entity) => source.manager.count(entity))),
    ).toEqual(baseline);
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    expect(
      createHash('sha256').update(readFileSync(demoFile)).digest('hex') ===
        digest,
    ).toBe(true);
  });
  const input = () => ({
    enrollmentId: enrollments[0].enrollmentId,
    gradeType: 'Midterm' as const,
    score: 88,
    remarks: null,
  });
  const conflict = (result: PromiseSettledResult<unknown>) => {
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected')
      expect(result.reason.getStatus()).toBe(409);
  };
  it('serializes duplicate Grade creation with one audit and one conflict', async () => {
    const results = await Promise.allSettled([
      grades.create(input(), users[2].userId),
      grades.create(input(), users[2].userId),
    ]);
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    conflict(results.find((row) => row.status === 'rejected')!);
    expect(
      await source
        .getRepository(Grade)
        .countBy({ enrollmentId: enrollments[0].enrollmentId }),
    ).toBe(1);
    expect(
      await source
        .getRepository(AuditLog)
        .countBy({ userId: users[2].userId, action: 'GRADE_CREATE' }),
    ).toBe(1);
  });
  it.each(['update', 'delete'])(
    'Grade service commit protects concurrent Enrollment %s',
    async (operation) => {
      let release!: () => void;
      let reached!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const entered = new Promise<void>((resolve) => {
        reached = resolve;
      });
      const original = audit.record.bind(audit);
      jest.spyOn(audit, 'record').mockImplementation(async (manager, entry) => {
        if (entry.action === 'GRADE_CREATE') {
          reached();
          await gate;
        }
        await original(manager, entry);
      });
      const creation = grades.create(input(), users[2].userId);
      let pending: Promise<PromiseSettledResult<unknown>> | undefined;
      try {
        await entered;
        let finished = false;
        const operationPromise =
          operation === 'update'
            ? enrollmentService.replace(
                enrollments[0].enrollmentId,
                {
                  studentId: users[1].userId,
                  subjectId: subjects[1].subjectId,
                  semester: '2nd Semester',
                  schoolYear: '2026-2027',
                  status: 'Enrolled',
                },
                users[0].userId,
              )
            : enrollmentService.remove(
                enrollments[0].enrollmentId,
                users[0].userId,
              );
        pending = operationPromise.then(
          (value) => {
            finished = true;
            return { status: 'fulfilled', value } as const;
          },
          (reason) => {
            finished = true;
            return { status: 'rejected', reason } as const;
          },
        );
        await delay(150);
        expect(finished).toBe(false);
        release();
        await creation;
        conflict(await pending);
        expect(
          (
            await source
              .getRepository(Enrollment)
              .findOneByOrFail({ enrollmentId: enrollments[0].enrollmentId })
          ).subjectId,
        ).toBe(subjects[0].subjectId);
      } finally {
        release();
        await creation;
        if (pending) await pending;
      }
    },
  );
  it('allows only one concurrent inquiry resolution without overwriting its Grade', async () => {
    const results = await Promise.allSettled([
      inquiries.resolve(
        inquiry.inquiryId,
        { resolutionNote: 'Faculty decision' },
        users[6].userId,
      ),
      inquiries.resolve(
        inquiry.inquiryId,
        { resolutionNote: 'Admin decision' },
        users[0].userId,
      ),
    ]);
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    conflict(results.find((row) => row.status === 'rejected')!);
    expect(
      await source
        .getRepository(AuditLog)
        .countBy({ recordId: inquiry.inquiryId, action: 'INQUIRY_RESOLVE' }),
    ).toBe(1);
    expect(
      (
        await source
          .getRepository(Grade)
          .findOneByOrFail({ gradeId: inquiry.gradeId })
      ).score,
    ).toBe('90.00');
  });
  it('serializes last-active-Admin protection within a fictional policy population', async () => {
    const original = policy.lockActiveAdmins.bind(policy);
    const fixtureIds = [users[4].userId, users[5].userId];
    // Preserve the production locking query, then restrict the test policy universe.
    // This tests the last-two-Admin race without deactivating any seeded account.
    jest
      .spyOn(policy, 'lockActiveAdmins')
      .mockImplementation(async (manager) =>
        (await original(manager)).filter((row) =>
          fixtureIds.includes(row.userId),
        ),
      );
    const results = await Promise.allSettled(
      fixtureIds.map((id) =>
        accounts.update(id, { accountStatus: 'Inactive' }, users[0].userId),
      ),
    );
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    conflict(results.find((row) => row.status === 'rejected')!);
    expect(
      await source
        .getRepository(User)
        .countBy({
          userId: In(fixtureIds),
          role: 'Admin',
          accountStatus: 'Active',
        }),
    ).toBe(1);
  });
  it('does not let a role change race create a Subject assigned to a non-Faculty user', async () => {
    const results = await Promise.allSettled([
      accounts.update(users[7].userId, { role: 'Student' }, users[0].userId),
      subjectService.create(
        {
          subjectCode: `${prefix}-FREE`,
          subjectName: 'Temporary role race',
          units: 3,
          facultyId: users[7].userId,
        },
        users[0].userId,
      ),
    ]);
    expect(results.some((row) => row.status === 'fulfilled')).toBe(true);
    const row = await source
      .getRepository(User)
      .findOneByOrFail({ userId: users[7].userId });
    const assigned = await source
      .getRepository(Subject)
      .countBy({ facultyId: users[7].userId });
    expect(assigned === 0 || row.role === 'Faculty').toBe(true);
  });
});
