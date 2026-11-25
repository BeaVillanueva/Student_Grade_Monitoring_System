import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { hash } from 'bcrypt';
import {
  Enrollment,
  Grade,
  Subject,
  User,
  AuditLog,
} from '../src/database/entities';
import { databaseOptions } from '../src/database/database.config';
import { EnrollmentsService } from '../src/enrollments/enrollments.service';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import type {
  CreateEnrollmentDto,
  ReplaceEnrollmentDto,
} from '../src/enrollments/dto/enrollment.dto';

describe('Enrollment concurrency (independent MariaDB connections)', () => {
  let source: DataSource;
  let service: EnrollmentsService;
  let users: User[] = [];
  let subjects: Subject[] = [];
  let records: Enrollment[] = [];
  let prefix: string;
  let fixtureHash: string;
  let baseline: number[];
  const entities = [User, Subject, Enrollment, Grade, AuditLog];
  const demoFile = resolve(__dirname, '../.env.demo');
  const demoDigest = createHash('sha256')
    .update(readFileSync(demoFile))
    .digest('hex');

  beforeAll(async () => {
    Object.assign(
      process.env,
      parseEnv(readFileSync(resolve(__dirname, '../.env'), 'utf8')),
    );
    source = await new DataSource(databaseOptions()).initialize();
    service = new EnrollmentsService(
      source.getRepository(Enrollment),
      new AuditLogsService(),
    );
    fixtureHash = await hash(randomBytes(24).toString('hex'), 12);
    baseline = await Promise.all(
      entities.map((entity) => source.manager.count(entity)),
    );
  });

  beforeEach(async () => {
    prefix = `C${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    users = [];
    subjects = [];
    records = [];
    // These uniquely named fixtures must be committed so independent connections see them.
    // Cleanup is scoped to their verified IDs and never resets or touches seeded records.
    await source.transaction(async (manager) => {
      const createdUsers = await manager.save(
        User,
        (['Admin', 'Student', 'Faculty', 'Student'] as const).map((role, i) =>
          manager.create(User, {
            firstName: 'Temporary',
            lastName: 'ConcurrentFixture',
            email: `${prefix}-${i}@sgms.example.test`,
            passwordHash: fixtureHash,
            role,
            accountStatus: 'Active',
          }),
        ),
      );
      const createdSubjects = await manager.save(
        Subject,
        [0, 1, 2].map((i) =>
          manager.create(Subject, {
            subjectCode: `${prefix}-${i}`,
            subjectName: 'Temporary Concurrency Subject',
            units: 3,
            facultyId: createdUsers[2].userId,
          }),
        ),
      );
      const createdRecords = await manager.save(
        Enrollment,
        [
          [1, 0],
          [3, 1],
        ].map(([student, subject]) =>
          manager.create(Enrollment, {
            studentId: createdUsers[student].userId,
            subjectId: createdSubjects[subject].subjectId,
            semester: '1st Semester',
            schoolYear: '2026-2027',
            dateEnrolled: '2026-08-17',
            status: 'Enrolled',
          }),
        ),
      );
      users = createdUsers;
      subjects = createdSubjects;
      records = createdRecords;
    });
  });

  afterEach(async () => {
    if (!subjects.length) return;
    await source.transaction(async (manager) => {
      const ids = subjects.map((row) => row.subjectId);
      const ownedSubjects = await manager.findBy(Subject, {
        subjectId: In(ids),
      });
      if (
        ownedSubjects.length !== ids.length ||
        ownedSubjects.some((row) => !row.subjectCode.startsWith(`${prefix}-`))
      )
        throw new Error(
          'Cleanup refused: subject fixture ownership does not match.',
        );
      const ownedUsers = await manager.findBy(User, {
        userId: In(users.map((row) => row.userId)),
      });
      if (
        ownedUsers.length !== users.length ||
        ownedUsers.some((row) => !row.email.startsWith(`${prefix}-`))
      )
        throw new Error(
          'Cleanup refused: account fixture ownership does not match.',
        );
      const ownedRecords = await manager.findBy(Enrollment, {
        subjectId: In(ids),
      });
      if (ownedRecords.length)
        await manager.delete(Grade, {
          enrollmentId: In(ownedRecords.map((row) => row.enrollmentId)),
        });
      await manager.delete(AuditLog, {
        userId: In(users.map((row) => row.userId)),
      });
      await manager.delete(Enrollment, { subjectId: In(ids) });
      await manager.delete(Subject, { subjectId: In(ids) });
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
        demoDigest,
    ).toBe(true);
  });

  const target = (): ReplaceEnrollmentDto => ({
    studentId: users[1].userId,
    subjectId: subjects[2].subjectId,
    semester: '2nd Semester',
    schoolYear: '2026-2027',
    status: 'Enrolled',
  });
  const expectConflict = (result: PromiseSettledResult<unknown>) => {
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected')
      expect(result.reason.getStatus()).toBe(409);
  };

  it('allows exactly one concurrent duplicate POST at the database unique index', async () => {
    const input: CreateEnrollmentDto = {
      ...target(),
      dateEnrolled: '2026-08-18',
    };
    const results = await Promise.allSettled([
      service.create(input, users[0].userId),
      service.create(input, users[0].userId),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expectConflict(results.find((result) => result.status === 'rejected')!);
    const rows = await source
      .getRepository(Enrollment)
      .findBy({ subjectId: subjects[2].subjectId });
    expect(rows).toHaveLength(1);
    expect(
      await source
        .getRepository(AuditLog)
        .countBy({ userId: users[0].userId, action: 'ENROLLMENT_CREATE' }),
    ).toBe(1);
  });

  it('allows exactly one concurrent PUT targeting the same enrollment identity', async () => {
    const results = await Promise.allSettled(
      records.map((row) =>
        service.replace(row.enrollmentId, target(), users[0].userId),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expectConflict(results.find((result) => result.status === 'rejected')!);
    expect(
      await source
        .getRepository(Enrollment)
        .countBy({ subjectId: subjects[2].subjectId }),
    ).toBe(1);
    expect(
      await source
        .getRepository(AuditLog)
        .countBy({ userId: users[0].userId, action: 'ENROLLMENT_UPDATE' }),
    ).toBe(1);
  });

  it.each(['update', 'delete'])(
    'does not let concurrent %s bypass a just-committed Grade',
    async (operation) => {
      const gradeRunner: QueryRunner = source.createQueryRunner();
      await gradeRunner.connect();
      await gradeRunner.startTransaction();
      let pending: Promise<PromiseSettledResult<unknown>> | undefined;
      try {
        await gradeRunner.manager.insert(Grade, {
          enrollmentId: records[0].enrollmentId,
          gradeType: 'Midterm',
          score: '88.00',
          remarks: null,
        });
        let completed = false;
        const change =
          operation === 'update'
            ? service.replace(
                records[0].enrollmentId,
                target(),
                users[0].userId,
              )
            : service.remove(records[0].enrollmentId, users[0].userId);
        pending = change.then(
          (value) => {
            completed = true;
            return { status: 'fulfilled', value } as const;
          },
          (reason: unknown) => {
            completed = true;
            return { status: 'rejected', reason } as const;
          },
        );
        await delay(150);
        expect(completed).toBe(false); // Grade FK lock must make Enrollment write wait.
        await gradeRunner.commitTransaction();
        expectConflict(await pending);
        const retained = await source
          .getRepository(Enrollment)
          .findOneByOrFail({ enrollmentId: records[0].enrollmentId });
        expect(retained.subjectId).toBe(records[0].subjectId);
        expect(retained.semester).toBe(records[0].semester);
        expect(
          await source
            .getRepository(AuditLog)
            .countBy({ userId: users[0].userId }),
        ).toBe(0);
      } finally {
        if (gradeRunner.isTransactionActive)
          await gradeRunner.rollbackTransaction();
        await gradeRunner.release();
        if (pending) await pending;
      }
    },
  );
});
