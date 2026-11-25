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
  Subject,
  User,
  Enrollment,
  Grade,
  AuditLog,
} from '../src/database/entities';
import type { UserRole } from '../src/database/domain';
import { databaseOptions } from '../src/database/database.config';
import { configureApp } from '../src/common/configure-app';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';

describe('Subjects CRUD (isolated MariaDB transaction fixtures)', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let app: NestExpressApplication;
  let passwordHash: string;
  let prefix: string;
  let users: User[];
  let plain: Subject;
  let graded: Subject;
  let enrolled: Subject;
  let tokens: Record<string, string>;
  const demoPath = resolve(__dirname, '../.env.demo');
  const demoBefore = createHash('sha256')
    .update(readFileSync(demoPath))
    .digest('hex');
  const safeKeys = [
    'facultyId',
    'subjectCode',
    'subjectId',
    'subjectName',
    'units',
  ];

  beforeAll(async () => {
    Object.assign(
      process.env,
      parseEnv(readFileSync(resolve(__dirname, '../.env'), 'utf8')),
    );
    source = await new DataSource(databaseOptions()).initialize();
    passwordHash = await hash(randomBytes(24).toString('hex'), 12);
  });

  beforeEach(async () => {
    prefix = `T${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const roles: UserRole[] = [
      'Admin',
      'Department Head',
      'Student',
      'Faculty',
      'Faculty',
      'Faculty',
    ];
    users = [];
    for (let i = 0; i < roles.length; i++) {
      users.push(
        await runner.manager.save(
          User,
          runner.manager.create(User, {
            firstName: 'Temporary',
            lastName: 'SubjectFixture',
            email: `${prefix}-${i}@sgms.example.test`,
            role: roles[i],
            accountStatus: i === 5 ? 'Inactive' : 'Active',
            passwordHash,
          }),
        ),
      );
    }
    [plain, graded, enrolled] = await runner.manager.save(
      Subject,
      ['BASE', 'GRADED', 'ENROLLED'].map((suffix) =>
        runner.manager.create(Subject, {
          subjectCode: `${prefix}-${suffix}`,
          subjectName: `Temporary ${suffix}`,
          units: 3,
          facultyId: users[3].userId,
        }),
      ),
    );
    const enrollments = await runner.manager.save(
      Enrollment,
      [graded, enrolled].map((subject) =>
        runner.manager.create(Enrollment, {
          studentId: users[2].userId,
          subjectId: subject.subjectId,
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
        enrollmentId: enrollments[0].enrollmentId,
        gradeType: 'Midterm',
        score: '85.00',
        remarks: null,
      }),
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getRepositoryToken(User))
      .useValue(runner.manager.getRepository(User))
      .overrideProvider(getRepositoryToken(Subject))
      .useValue(runner.manager.getRepository(Subject))
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApp(app);
    await app.init();
    tokens = {};
    for (let i = 0; i < 4; i++) {
      tokens[roles[i]] = await app
        .get(JwtService)
        .signAsync({ role: roles[i] }, { subject: String(users[i].userId) });
    }
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
        .getRepository(Subject)
        .countBy({ subjectId: plain.subjectId }),
    ).toBe(0);
    expect(
      await source.getRepository(User).countBy({ userId: users[0].userId }),
    ).toBe(0);
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    expect(
      createHash('sha256').update(readFileSync(demoPath)).digest('hex') ===
        demoBefore,
    ).toBe(true);
  });

  const body = (overrides: Record<string, unknown> = {}) => ({
    subjectCode: `${prefix}-NEW`,
    subjectName: 'Temporary New Subject',
    units: 3,
    facultyId: users[3].userId,
    ...overrides,
  });
  const call = (
    method: 'get' | 'post' | 'put' | 'delete',
    path = '',
    role = 'Admin',
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1/subjects${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);
  const auditRows = (id: number) =>
    runner.manager.find(AuditLog, {
      where: { tableAffected: 'subjects', recordId: id },
      order: { auditId: 'ASC' },
    });

  it.each(['Admin', 'Department Head'])(
    '%s creates and audits a normalized subject',
    async (role) => {
      const result = await call('post', '', role)
        .send(
          body({
            subjectCode: ` ${prefix.toLowerCase()}-new `,
            subjectName: ' New Subject ',
          }),
        )
        .expect(201);
      expect(Object.keys(result.body).sort()).toEqual(safeKeys);
      expect(result.body.subjectCode).toBe(`${prefix}-NEW`);
      expect(result.body.subjectName).toBe('New Subject');
      const audits = await auditRows(result.body.subjectId);
      expect(audits).toHaveLength(1);
      expect(audits[0].action).toBe('SUBJECT_CREATE');
      expect(audits[0].userId).toBe(users[role === 'Admin' ? 0 : 1].userId);
    },
  );

  it.each(['Admin', 'Department Head', 'Faculty', 'Student'])(
    '%s reads the list and individual subjects',
    async (role) => {
      const list = await call('get', '', role).expect(200);
      expect(list.body.total).toBe(5);
      expect(list.body.page).toBe(1);
      expect(list.body.pageSize).toBe(10);
      expect(list.body.data.length).toBe(5);
      list.body.data.forEach((row: object) =>
        expect(Object.keys(row).sort()).toEqual(safeKeys),
      );
      const single = await call('get', `/${plain.subjectId}`, role).expect(200);
      expect(Object.keys(single.body).sort()).toEqual(safeKeys);
    },
  );

  it.each(['Admin', 'Department Head'])(
    '%s performs full PUT and bodyless DELETE with actor audits',
    async (role) => {
      const created = await call('post', '', role).send(body()).expect(201);
      const id = created.body.subjectId;
      const updated = await call('put', `/${id}`, role)
        .send(body({ subjectName: 'Updated Subject', units: 4 }))
        .expect(200);
      expect(updated.body.units).toBe(4);
      expect(updated.body.subjectName).toBe('Updated Subject');
      const deleted = await call('delete', `/${id}`, role).expect(204);
      expect(deleted.text).toBe('');
      await call('get', `/${id}`).expect(404);
      const audits = await auditRows(id);
      expect(audits.map((row) => row.action)).toEqual([
        'SUBJECT_CREATE',
        'SUBJECT_UPDATE',
        'SUBJECT_DELETE',
      ]);
      expect(
        audits.every(
          (row) => row.userId === users[role === 'Admin' ? 0 : 1].userId,
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
  ])('rejects %s %s mutations', async (role, method) => {
    const path = method === 'post' ? '' : `/${plain.subjectId}`;
    const req = call(method as 'post' | 'put' | 'delete', path, role);
    await (method === 'delete' ? req : req.send(body())).expect(403);
    expect(await auditRows(plain.subjectId)).toHaveLength(0);
  });

  it.each(['post', 'list', 'get', 'put', 'delete'])(
    'requires valid JWT for %s',
    async (kind) => {
      const method =
        kind === 'list' || kind === 'get'
          ? 'get'
          : (kind as 'post' | 'put' | 'delete');
      const path =
        kind === 'list' || kind === 'post' ? '' : `/${plain.subjectId}`;
      await request(app.getHttpServer())
        [method](`/api/v1/subjects${path}`)
        .expect(401);
      await request(app.getHttpServer())
        [method](`/api/v1/subjects${path}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    },
  );

  it('maps duplicate create and duplicate PUT codes to 409 with no audit', async () => {
    await call('post')
      .send(body({ subjectCode: plain.subjectCode.toLowerCase() }))
      .expect(409);
    await call('put', `/${plain.subjectId}`)
      .send(body({ subjectCode: graded.subjectCode }))
      .expect(409);
    expect(
      (
        await runner.manager.findOneByOrFail(Subject, {
          subjectId: plain.subjectId,
        })
      ).subjectCode,
    ).toBe(plain.subjectCode);
    expect(await auditRows(plain.subjectId)).toHaveLength(0);
  });

  it.each([
    { subjectCode: '' },
    { subjectCode: 'x'.repeat(21) },
    { subjectCode: '!INVALID' },
    { subjectCode: 123 },
    { subjectName: '   ' },
    { subjectName: 'x'.repeat(101) },
    { subjectName: 'Bad\nName' },
    { units: 0 },
    { units: -1 },
    { units: 1.5 },
    { units: '3' },
    { units: 2147483648 },
    { facultyId: 0 },
    { facultyId: '3' },
    { facultyId: null },
    { facultyId: 2147483648 },
    { subjectId: 1 },
    { actorId: 1 },
  ])('rejects invalid create body case %#', async (overrides) => {
    await call('post').send(body(overrides)).expect(400);
  });

  it.each(['subjectCode', 'subjectName', 'units', 'facultyId'])(
    'PUT requires %s',
    async (field) => {
      const input: Record<string, unknown> = body();
      delete input[field];
      await call('put', `/${plain.subjectId}`).send(input).expect(400);
      expect(await auditRows(plain.subjectId)).toHaveLength(0);
    },
  );

  it.each(['not-an-id', '0', '-1', '1.5', '1e2', '01', '2147483648'])(
    'rejects invalid route id %s',
    async (id) => {
      await call('get', `/${id}`).expect(400);
      await call('put', `/${id}`).send(body()).expect(400);
      await call('delete', `/${id}`).expect(400);
    },
  );

  it('returns 404 for missing subjects on GET, PUT, and DELETE', async () => {
    await call('get', '/2147483647').expect(404);
    await call('put', '/2147483647').send(body()).expect(404);
    await call('delete', '/2147483647').expect(404);
  });

  it('returns 404 for nonexistent faculty on create and PUT', async () => {
    await call('post')
      .send(body({ facultyId: 2147483647 }))
      .expect(404);
    await call('put', `/${plain.subjectId}`)
      .send(body({ facultyId: 2147483647 }))
      .expect(404);
  });

  it.each([0, 1, 2, 5])(
    'rejects non-Faculty or inactive faculty fixture index %i',
    async (index) => {
      await call('post')
        .send(body({ facultyId: users[index].userId }))
        .expect(400);
      await call('put', `/${plain.subjectId}`)
        .send(body({ facultyId: users[index].userId }))
        .expect(400);
    },
  );

  it('blocks faculty reassignment when graded records exist', async () => {
    await call('put', `/${graded.subjectId}`)
      .send(
        body({ subjectCode: graded.subjectCode, facultyId: users[4].userId }),
      )
      .expect(409);
    expect(
      (
        await runner.manager.findOneByOrFail(Subject, {
          subjectId: graded.subjectId,
        })
      ).facultyId,
    ).toBe(users[3].userId);
    expect(await auditRows(graded.subjectId)).toHaveLength(0);
  });

  it('permits editing other fields on a graded subject with the same faculty', async () => {
    await call('put', `/${graded.subjectId}`)
      .send(
        body({ subjectCode: graded.subjectCode, subjectName: 'Revised Name' }),
      )
      .expect(200);
    expect((await auditRows(graded.subjectId))[0].action).toBe(
      'SUBJECT_UPDATE',
    );
  });

  it('permits faculty reassignment when enrollments have no grades', async () => {
    const result = await call('put', `/${enrolled.subjectId}`)
      .send(
        body({ subjectCode: enrolled.subjectCode, facultyId: users[4].userId }),
      )
      .expect(200);
    expect(result.body.facultyId).toBe(users[4].userId);
  });

  it.each(['graded', 'enrolled'])(
    'blocks deletion of %s subjects with enrollments',
    async (kind) => {
      const id = kind === 'graded' ? graded.subjectId : enrolled.subjectId;
      await call('delete', `/${id}`).expect(409);
      expect(await runner.manager.existsBy(Subject, { subjectId: id })).toBe(
        true,
      );
      expect(await auditRows(id)).toHaveLength(0);
    },
  );

  it('paginates with stable order, bounded size, accurate totals, and empty distant pages', async () => {
    const first = await call('get', '?page=1&pageSize=2').expect(200);
    const second = await call('get', '?page=2&pageSize=2').expect(200);
    expect(first.body.total).toBe(5);
    expect(first.body.totalPages).toBe(3);
    const ids = [...first.body.data, ...second.body.data].map(
      (row: { subjectId: number }) => row.subjectId,
    );
    expect(new Set(ids).size).toBe(4);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    const empty = await call('get', '?page=1000000&pageSize=100').expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.total).toBe(5);
  });

  it.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=1e2',
    'page=1000001',
    'pageSize=0',
    'pageSize=101',
    'pageSize=abc',
    'pageSize=',
    'unknown=1',
    'page=1&page=2',
  ])('rejects invalid query %s', async (query) => {
    await call('get', `?${query}`).expect(400);
  });

  it.each(['create', 'update', 'delete'])(
    'rolls back subject and inserted audit when %s audit handling fails',
    async (operation) => {
      const audit = app.get(AuditLogsService);
      const original = audit.record.bind(audit);
      const initialAuditCount = await runner.manager.count(AuditLog);
      jest
        .spyOn(audit, 'record')
        .mockImplementationOnce(async (manager, entry) => {
          await original(manager, entry);
          throw new Error('Synthetic audit failure after insert');
        });
      const req =
        operation === 'create'
          ? call('post').send(body())
          : operation === 'update'
            ? call('put', `/${plain.subjectId}`).send(
                body({ subjectName: 'Must Roll Back' }),
              )
            : call('delete', `/${plain.subjectId}`);
      const response = await req.expect(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
      expect(await runner.manager.count(AuditLog)).toBe(initialAuditCount);
      const existing = await runner.manager.findOneByOrFail(Subject, {
        subjectId: plain.subjectId,
      });
      expect(existing.subjectName).toBe(plain.subjectName);
      expect(existing.subjectCode).toBe(plain.subjectCode);
      expect(
        await runner.manager.countBy(Subject, { subjectCode: `${prefix}-NEW` }),
      ).toBe(0);
    },
  );

  it('refuses audit writes outside a business transaction', async () => {
    await expect(
      app.get(AuditLogsService).record(source.manager, {
        userId: users[0].userId,
        action: 'INVALID_TEST',
        tableAffected: 'subjects',
        recordId: plain.subjectId,
      }),
    ).rejects.toThrow('Audit writes require');
  });

  it.each(['create', 'update', 'delete'])(
    'rolls back %s when the database rejects the audit insertion',
    async (operation) => {
      const audit = app.get(AuditLogsService);
      const original = audit.record.bind(audit);
      const initialAuditCount = await runner.manager.count(AuditLog);
      jest
        .spyOn(audit, 'record')
        .mockImplementationOnce((manager, entry) =>
          original(manager, { ...entry, action: null as unknown as string }),
        );
      const req =
        operation === 'create'
          ? call('post').send(body())
          : operation === 'update'
            ? call('put', `/${plain.subjectId}`).send(
                body({ subjectName: 'Must Roll Back' }),
              )
            : call('delete', `/${plain.subjectId}`);
      const response = await req.expect(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
      expect(await runner.manager.count(AuditLog)).toBe(initialAuditCount);
      const existing = await runner.manager.findOneByOrFail(Subject, {
        subjectId: plain.subjectId,
      });
      expect(existing.subjectCode).toBe(plain.subjectCode);
      expect(existing.subjectName).toBe(plain.subjectName);
      expect(
        await runner.manager.countBy(Subject, { subjectCode: `${prefix}-NEW` }),
      ).toBe(0);
    },
  );

  it('returns only five subject fields without confidential faculty data', async () => {
    const created = await call('post').send(body()).expect(201);
    const single = await call('get', `/${created.body.subjectId}`).expect(200);
    const list = await call('get').expect(200);
    const updated = await call('put', `/${created.body.subjectId}`)
      .send(body())
      .expect(200);
    for (const row of [
      created.body,
      single.body,
      updated.body,
      ...list.body.data,
    ])
      expect(Object.keys(row).sort()).toEqual(safeKeys);
    const output = JSON.stringify([
      created.body,
      single.body,
      list.body,
      updated.body,
    ]);
    for (const secret of [
      passwordHash,
      users[3].email,
      process.env.JWT_SECRET,
      process.env.DB_PASSWORD,
      process.env.DB_MIGRATION_PASSWORD,
    ]) {
      expect(Boolean(secret) && output.includes(secret!)).toBe(false);
    }
  });
});
