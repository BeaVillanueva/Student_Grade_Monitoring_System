import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { hash } from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  Enrollment,
  Subject,
  User,
  Grade,
  AuditLog,
} from '../src/database/entities';
import type { UserRole } from '../src/database/domain';
import { databaseOptions } from '../src/database/database.config';
import { configureApp } from '../src/common/configure-app';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';

describe('Enrollments CRUD and ownership (transaction fixtures)', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let app: NestExpressApplication;
  let fixtureHash: string;
  let prefix: string;
  let users: User[];
  let subjects: Subject[];
  let records: Enrollment[];
  let tokens: Record<string, string>;
  const demoPath = resolve(__dirname, '../.env.demo');
  const beforeDemo = createHash('sha256')
    .update(readFileSync(demoPath))
    .digest('hex');
  const keys = [
    'dateEnrolled',
    'enrollmentId',
    'schoolYear',
    'semester',
    'status',
    'studentId',
    'subjectId',
  ];

  beforeAll(async () => {
    Object.assign(
      process.env,
      parseEnv(readFileSync(resolve(__dirname, '../.env'), 'utf8')),
    );
    source = await new DataSource(databaseOptions()).initialize();
    fixtureHash = await hash(randomBytes(24).toString('hex'), 12);
  });

  beforeEach(async () => {
    prefix = `E${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const roles: UserRole[] = [
      'Admin',
      'Department Head',
      'Student',
      'Student',
      'Faculty',
      'Faculty',
      'Student',
    ];
    users = [];
    for (let i = 0; i < roles.length; i++)
      users.push(
        await runner.manager.save(
          User,
          runner.manager.create(User, {
            firstName: 'Temporary',
            lastName: 'EnrollmentFixture',
            email: `${prefix}-${i}@sgms.example.test`,
            role: roles[i],
            accountStatus: i === 6 ? 'Inactive' : 'Active',
            passwordHash: fixtureHash,
          }),
        ),
      );
    subjects = await runner.manager.save(
      Subject,
      [0, 1, 2].map((i) =>
        runner.manager.create(Subject, {
          subjectCode: `${prefix}-${i}`,
          subjectName: 'Temporary Enrollment Subject',
          units: 3,
          facultyId: users[i === 1 ? 5 : 4].userId,
        }),
      ),
    );
    records = await runner.manager.save(
      Enrollment,
      [
        [2, 0],
        [2, 1],
        [3, 0],
        [3, 1],
      ].map(([student, subject]) =>
        runner.manager.create(Enrollment, {
          studentId: users[student].userId,
          subjectId: subjects[subject].subjectId,
          semester: '1st Semester',
          schoolYear: '2026-2027',
          dateEnrolled: '2026-08-17',
          status: 'Enrolled',
        }),
      ),
    );
    await runner.manager.save(
      Grade,
      runner.manager.create(Grade, {
        enrollmentId: records[0].enrollmentId,
        gradeType: 'Midterm',
        score: '88.00',
        remarks: null,
      }),
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getRepositoryToken(User))
      .useValue(runner.manager.getRepository(User))
      .overrideProvider(getRepositoryToken(Enrollment))
      .useValue(runner.manager.getRepository(Enrollment))
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApp(app);
    await app.init();
    tokens = {};
    for (const [role, index] of [
      ['Admin', 0],
      ['Department Head', 1],
      ['Student', 2],
      ['Faculty', 4],
    ] as const)
      tokens[role] = await app
        .get(JwtService)
        .signAsync({ role }, { subject: String(users[index].userId) });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    try {
      if (runner?.isTransactionActive) await runner.rollbackTransaction();
    } finally {
      if (runner) await runner.release();
      if (app) await app.close();
    }
    expect(
      await source
        .getRepository(Enrollment)
        .countBy({ enrollmentId: records[0].enrollmentId }),
    ).toBe(0);
    expect(
      await source.getRepository(User).countBy({ userId: users[0].userId }),
    ).toBe(0);
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    expect(
      createHash('sha256').update(readFileSync(demoPath)).digest('hex') ===
        beforeDemo,
    ).toBe(true);
  });

  const createBody = (overrides: Record<string, unknown> = {}) => ({
    studentId: users[2].userId,
    subjectId: subjects[2].subjectId,
    semester: '1st Semester',
    schoolYear: '2026-2027',
    dateEnrolled: '2026-08-18',
    status: 'Enrolled',
    ...overrides,
  });
  const putBody = (
    row = records[1],
    overrides: Record<string, unknown> = {},
  ) => ({
    studentId: row.studentId,
    subjectId: row.subjectId,
    semester: row.semester,
    schoolYear: row.schoolYear,
    status: row.status,
    ...overrides,
  });
  const call = (
    method: 'get' | 'post' | 'put' | 'delete',
    path = '',
    role = 'Admin',
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1/enrollments${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);
  const audits = (id: number) =>
    runner.manager.find(AuditLog, {
      where: { tableAffected: 'enrollments', recordId: id },
      order: { auditId: 'ASC' },
    });

  it.each(['Admin', 'Department Head'])(
    '%s creates an enrollment and correct actor audit',
    async (role) => {
      const response = await call('post', '', role)
        .send(
          createBody({ semester: ' 1st Semester ', schoolYear: ' 2026-2027 ' }),
        )
        .expect(201);
      expect(Object.keys(response.body).sort()).toEqual(keys);
      expect(response.body.semester).toBe('1st Semester');
      expect(response.body.dateEnrolled).toBe('2026-08-18');
      const log = await audits(response.body.enrollmentId);
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('ENROLLMENT_CREATE');
      expect(log[0].userId).toBe(users[role === 'Admin' ? 0 : 1].userId);
    },
  );

  it.each(['Admin', 'Department Head', 'Faculty', 'Student'])(
    '%s reads only authorized list and direct records',
    async (role) => {
      const result = await call('get', '', role).expect(200);
      expect(result.body.total).toBe(
        ['Admin', 'Department Head'].includes(role) ? 6 : 2,
      );
      if (role === 'Student')
        expect(
          result.body.data.every(
            (row: Enrollment) => row.studentId === users[2].userId,
          ),
        ).toBe(true);
      if (role === 'Faculty')
        expect(
          result.body.data.every(
            (row: Enrollment) => row.subjectId === subjects[0].subjectId,
          ),
        ).toBe(true);
      const direct = await call(
        'get',
        `/${records[0].enrollmentId}`,
        role,
      ).expect(200);
      expect(Object.keys(direct.body).sort()).toEqual(keys);
    },
  );

  it.each(['Admin', 'Department Head'])(
    '%s updates and deletes with immutable date and atomic audit',
    async (role) => {
      const created = await call('post', '', role)
        .send(createBody())
        .expect(201);
      const update = await call('put', `/${created.body.enrollmentId}`, role)
        .send(putBody(created.body, { status: 'Completed' }))
        .expect(200);
      expect(update.body.dateEnrolled).toBe(created.body.dateEnrolled);
      expect(update.body.status).toBe('Completed');
      const removed = await call(
        'delete',
        `/${created.body.enrollmentId}`,
        role,
      ).expect(204);
      expect(removed.text).toBe('');
      await call('get', `/${created.body.enrollmentId}`).expect(404);
      const log = await audits(created.body.enrollmentId);
      expect(log.map((entry) => entry.action)).toEqual([
        'ENROLLMENT_CREATE',
        'ENROLLMENT_UPDATE',
        'ENROLLMENT_DELETE',
      ]);
      expect(
        log.every(
          (entry) => entry.userId === users[role === 'Admin' ? 0 : 1].userId,
        ),
      ).toBe(true);
    },
  );

  it.each([
    ['Faculty', 'post'],
    ['Faculty', 'put'],
    ['Faculty', 'delete'],
    ['Student', 'post'],
    ['Student', 'put'],
    ['Student', 'delete'],
  ])('rejects %s %s', async (role, method) => {
    const path = method === 'post' ? '' : `/${records[1].enrollmentId}`;
    const req = call(method as 'post' | 'put' | 'delete', path, role);
    await (
      method === 'delete'
        ? req
        : req.send(method === 'post' ? createBody() : putBody())
    ).expect(403);
  });

  it.each(['post', 'list', 'get', 'put', 'delete'])(
    'requires valid JWT for %s',
    async (kind) => {
      const method =
        kind === 'get' || kind === 'list'
          ? 'get'
          : (kind as 'post' | 'put' | 'delete');
      const path =
        kind === 'list' || kind === 'post' ? '' : `/${records[1].enrollmentId}`;
      await request(app.getHttpServer())
        [method](`/api/v1/enrollments${path}`)
        .expect(401);
      await request(app.getHttpServer())
        [method](`/api/v1/enrollments${path}`)
        .set('Authorization', 'Bearer invalid')
        .expect(401);
    },
  );

  it('preserves the studentId filter without Student ownership bypass', async () => {
    const own = await call(
      'get',
      `?studentId=${users[2].userId}`,
      'Student',
    ).expect(200);
    expect(own.body.total).toBe(2);
    await call('get', `?studentId=${users[3].userId}`, 'Student').expect(403);
    await call('get', '?studentId=2147483647', 'Student').expect(403);
    await call('get', `/${records[2].enrollmentId}`, 'Student').expect(403);
    await call('get', `/${records[3].enrollmentId}`, 'Student').expect(403);
  });

  it('intersects Faculty assignments with studentId and direct-ID access', async () => {
    const filtered = await call(
      'get',
      `?studentId=${users[3].userId}`,
      'Faculty',
    ).expect(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.data[0].enrollmentId).toBe(records[2].enrollmentId);
    await call('get', `/${records[1].enrollmentId}`, 'Faculty').expect(403);
    await call('get', `/${records[3].enrollmentId}`, 'Faculty').expect(403);
    const empty = await call('get', '?studentId=2147483647', 'Faculty').expect(
      200,
    );
    expect(empty.body.data).toEqual([]);
    expect(empty.body.total).toBe(0);
    await call('get', `?subjectId=${subjects[1].subjectId}`, 'Faculty').expect(
      400,
    );
  });

  it('uses current Faculty assignments rather than token data', async () => {
    await runner.manager.update(Subject, subjects[0].subjectId, {
      facultyId: users[5].userId,
    });
    const empty = await call('get', '', 'Faculty').expect(200);
    expect(empty.body.total).toBe(0);
    await call('get', `/${records[0].enrollmentId}`, 'Faculty').expect(403);
  });

  it('rejects duplicate create and duplicate full update with no audit', async () => {
    await call('post')
      .send(createBody({ subjectId: subjects[1].subjectId }))
      .expect(409);
    await call('put', `/${records[3].enrollmentId}`)
      .send(putBody(records[3], { studentId: users[2].userId }))
      .expect(409);
    expect(await audits(records[3].enrollmentId)).toHaveLength(0);
    expect(
      (
        await runner.manager.findOneByOrFail(Enrollment, {
          enrollmentId: records[3].enrollmentId,
        })
      ).studentId,
    ).toBe(users[3].userId);
  });

  it.each([
    { studentId: 0 },
    { studentId: '1' },
    { studentId: 2147483648 },
    { subjectId: -1 },
    { subjectId: 1.5 },
    { subjectId: null },
    { semester: '' },
    { semester: ' ' },
    { semester: 'x'.repeat(21) },
    { semester: 'bad\nsemester' },
    { schoolYear: '2026-2028' },
    { schoolYear: '2027-2026' },
    { schoolYear: '2026/2027' },
    { schoolYear: null },
    { status: 'Unknown' },
    { status: 'enrolled' },
    { status: null },
    { dateEnrolled: '2026-02-30' },
    { dateEnrolled: '2025-02-29' },
    { dateEnrolled: '2026-13-01' },
    { dateEnrolled: '2026-08-17T00:00:00Z' },
    { dateEnrolled: '0001-01-01' },
    { dateEnrolled: 123 },
    { enrollmentId: 1 },
    { actorId: 1 },
  ])('rejects invalid POST field case %#', async (overrides) => {
    await call('post').send(createBody(overrides)).expect(400);
  });

  it.each(['studentId', 'subjectId', 'semester', 'schoolYear', 'status'])(
    'requires PUT field %s',
    async (field) => {
      const input: Record<string, unknown> = putBody();
      delete input[field];
      await call('put', `/${records[1].enrollmentId}`).send(input).expect(400);
    },
  );

  it('rejects a supplied PUT dateEnrolled instead of changing the original date', async () => {
    await call('put', `/${records[1].enrollmentId}`)
      .send(putBody(records[1], { dateEnrolled: '2026-11-25' }))
      .expect(400);
    expect(
      (
        await runner.manager.findOneByOrFail(Enrollment, {
          enrollmentId: records[1].enrollmentId,
        })
      ).dateEnrolled,
    ).toBe('2026-08-17');
  });

  it.each(['0', '-1', '1.2', '1e2', '01', 'text', '2147483648'])(
    'rejects route parameter %s',
    async (id) => {
      await call('get', `/${id}`).expect(400);
      await call('put', `/${id}`).send(putBody()).expect(400);
      await call('delete', `/${id}`).expect(400);
    },
  );

  it('returns 404 for missing enrollment IDs for every role', async () => {
    for (const role of ['Admin', 'Department Head', 'Faculty', 'Student'])
      await call('get', '/2147483647', role).expect(404);
    await call('put', '/2147483647').send(putBody()).expect(404);
    await call('delete', '/2147483647').expect(404);
  });

  it.each(['studentId', 'subjectId'])(
    'returns 404 for missing %s on create or change',
    async (field) => {
      await call('post')
        .send(createBody({ [field]: 2147483647 }))
        .expect(404);
      await call('put', `/${records[1].enrollmentId}`)
        .send(putBody(records[1], { [field]: 2147483647 }))
        .expect(404);
    },
  );

  it.each([0, 1, 4, 6])(
    'rejects inactive or non-Student fixture index %i',
    async (index) => {
      await call('post')
        .send(createBody({ studentId: users[index].userId }))
        .expect(400);
      await call('put', `/${records[1].enrollmentId}`)
        .send(putBody(records[1], { studentId: users[index].userId }))
        .expect(400);
    },
  );

  it('can update status for an existing inactive student without reassigning the student', async () => {
    await runner.manager.update(User, users[2].userId, {
      accountStatus: 'Inactive',
    });
    await call('put', `/${records[1].enrollmentId}`)
      .send(putBody(records[1], { status: 'Dropped' }))
      .expect(200);
  });

  it.each(['studentId', 'subjectId', 'semester', 'schoolYear'])(
    'blocks graded identity change to %s',
    async (field) => {
      const changes: Record<string, unknown> = {
        studentId: users[3].userId,
        subjectId: subjects[2].subjectId,
        semester: '2nd Semester',
        schoolYear: '2027-2028',
      };
      await call('put', `/${records[0].enrollmentId}`)
        .send(putBody(records[0], { [field]: changes[field] }))
        .expect(409);
      expect(await audits(records[0].enrollmentId)).toHaveLength(0);
    },
  );

  it('permits graded status-only changes, retains date, and refuses graded deletion', async () => {
    const updated = await call('put', `/${records[0].enrollmentId}`)
      .send(putBody(records[0], { status: 'Completed' }))
      .expect(200);
    expect(updated.body.dateEnrolled).toBe('2026-08-17');
    await call('delete', `/${records[0].enrollmentId}`).expect(409);
    expect(
      (await audits(records[0].enrollmentId)).map((row) => row.action),
    ).toEqual(['ENROLLMENT_UPDATE']);
  });

  it('supports all statuses and valid leap-day dates', async () => {
    const created = await call('post')
      .send(createBody({ dateEnrolled: '2024-02-29', status: 'Dropped' }))
      .expect(201);
    const result = await call('put', `/${created.body.enrollmentId}`)
      .send(putBody(created.body, { status: 'Enrolled' }))
      .expect(200);
    expect(result.body.dateEnrolled).toBe('2024-02-29');
  });

  it('paginates filtered authorized rows with accurate totals and stable order', async () => {
    const first = await call(
      'get',
      `?studentId=${users[2].userId}&page=1&pageSize=1`,
      'Student',
    ).expect(200);
    const second = await call(
      'get',
      `?studentId=${users[2].userId}&page=2&pageSize=1`,
      'Student',
    ).expect(200);
    expect(first.body.total).toBe(2);
    expect(first.body.totalPages).toBe(2);
    expect(first.body.data[0].enrollmentId).toBeLessThan(
      second.body.data[0].enrollmentId,
    );
    const distant = await call(
      'get',
      '?page=1000000&pageSize=100',
      'Student',
    ).expect(200);
    expect(distant.body.total).toBe(2);
    expect(distant.body.data).toEqual([]);
    const unknown = await call('get', '?studentId=2147483647').expect(200);
    expect(unknown.body.data).toEqual([]);
  });

  it.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=1000001',
    'pageSize=0',
    'pageSize=101',
    'pageSize=',
    'studentId=0',
    'studentId=01',
    'studentId=abc',
    'studentId=2147483648',
    'studentId=1&studentId=2',
    'subjectId=1',
    'unknown=1',
  ])('rejects invalid query %s', async (query) => {
    await call('get', `?${query}`).expect(400);
  });

  it.each(['create', 'update', 'delete'])(
    'rolls back %s when audit INSERT is rejected',
    async (operation) => {
      const audit = app.get(AuditLogsService);
      const original = audit.record.bind(audit);
      const initial = await runner.manager.count(AuditLog);
      jest
        .spyOn(audit, 'record')
        .mockImplementationOnce((manager, entry) =>
          original(manager, { ...entry, action: null as unknown as string }),
        );
      const req =
        operation === 'create'
          ? call('post').send(createBody())
          : operation === 'update'
            ? call('put', `/${records[1].enrollmentId}`).send(
                putBody(records[1], { status: 'Dropped' }),
              )
            : call('delete', `/${records[1].enrollmentId}`);
      const result = await req.expect(500);
      expect(result.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
      expect(await runner.manager.count(AuditLog)).toBe(initial);
      expect(
        (
          await runner.manager.findOneByOrFail(Enrollment, {
            enrollmentId: records[1].enrollmentId,
          })
        ).status,
      ).toBe('Enrolled');
      expect(
        await runner.manager.countBy(Enrollment, {
          subjectId: subjects[2].subjectId,
        }),
      ).toBe(0);
    },
  );

  it('rolls back both enrollment and audit after a post-insertion failure', async () => {
    const audit = app.get(AuditLogsService);
    const original = audit.record.bind(audit);
    const initial = await runner.manager.count(AuditLog);
    jest
      .spyOn(audit, 'record')
      .mockImplementationOnce(async (manager, entry) => {
        await original(manager, entry);
        throw new Error('Synthetic audit failure');
      });
    await call('post').send(createBody()).expect(500);
    expect(await runner.manager.count(AuditLog)).toBe(initial);
    expect(
      await runner.manager.countBy(Enrollment, {
        subjectId: subjects[2].subjectId,
      }),
    ).toBe(0);
  });

  it('returns seven fields without confidential relations or credentials', async () => {
    const created = await call('post').send(createBody()).expect(201);
    const list = await call('get').expect(200);
    const single = await call('get', `/${created.body.enrollmentId}`).expect(
      200,
    );
    for (const row of [created.body, single.body, ...list.body.data])
      expect(Object.keys(row).sort()).toEqual(keys);
    const output = JSON.stringify([created.body, list.body, single.body]);
    for (const secret of [
      fixtureHash,
      users[2].email,
      process.env.JWT_SECRET,
      process.env.DB_PASSWORD,
      process.env.DB_MIGRATION_PASSWORD,
    ])
      expect(Boolean(secret) && output.includes(secret!)).toBe(false);
  });
});
