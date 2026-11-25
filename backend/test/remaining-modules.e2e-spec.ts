import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { hash, compare, getRounds } from 'bcrypt';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  User,
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  AuditLog,
} from '../src/database/entities';
import type { UserRole } from '../src/database/domain';
import { databaseOptions } from '../src/database/database.config';
import { configureApp } from '../src/common/configure-app';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { UsersPolicyService } from '../src/users/users-policy.service';

describe('Grades, inquiries, and users HTTP (transaction fixtures)', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let app: NestExpressApplication;
  let users: User[];
  let subjects: Subject[];
  let enrollments: Enrollment[];
  let grades: Grade[];
  let inquiries: GradeInquiry[];
  let tokens: Record<string, string>;
  let prefix: string;
  let fixtureHash: string;
  const password = randomBytes(24).toString('base64url');
  const demoFile = resolve(__dirname, '../.env.demo');
  const demoDigest = createHash('sha256')
    .update(readFileSync(demoFile))
    .digest('hex');
  const gradeKeys = [
    'dateRecorded',
    'enrollmentId',
    'gradeId',
    'gradeType',
    'remarks',
    'score',
  ];
  const inquiryKeys = [
    'dateResolved',
    'dateSubmitted',
    'gradeId',
    'inquiryId',
    'message',
    'resolutionNote',
    'resolvedBy',
    'status',
    'studentId',
  ];
  const directoryKeys = ['firstName', 'lastName', 'role', 'userId'];

  beforeAll(async () => {
    Object.assign(
      process.env,
      parseEnv(readFileSync(resolve(__dirname, '../.env'), 'utf8')),
    );
    source = await new DataSource(databaseOptions()).initialize();
    fixtureHash = await hash(password, 12);
  });
  beforeEach(async () => {
    prefix = `R${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
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
      'Student',
      'Admin',
      'Faculty',
    ];
    users = [];
    for (let i = 0; i < roles.length; i++)
      users.push(
        await runner.manager.save(
          User,
          runner.manager.create(User, {
            firstName: 'Temporary',
            lastName: 'RemainingFixture',
            email: `${prefix}-${i}@sgms.example.test`,
            passwordHash: fixtureHash,
            role: roles[i],
            accountStatus: i === 6 ? 'Inactive' : 'Active',
          }),
        ),
      );
    subjects = await runner.manager.save(
      Subject,
      [4, 5].map((faculty, i) =>
        runner.manager.create(Subject, {
          subjectCode: `${prefix}-${i}`,
          subjectName: 'Temporary Remaining Subject',
          units: 3,
          facultyId: users[faculty].userId,
        }),
      ),
    );
    enrollments = await runner.manager.save(
      Enrollment,
      [
        [2, 0, 'Enrolled'],
        [3, 1, 'Enrolled'],
        [2, 0, 'Completed'],
        [2, 0, 'Dropped'],
        [2, 0, 'Completed'],
        [6, 0, 'Enrolled'],
      ].map(([student, subject, status], i) =>
        runner.manager.create(Enrollment, {
          studentId: users[student as number].userId,
          subjectId: subjects[subject as number].subjectId,
          semester: `Semester ${i}`,
          schoolYear: '2026-2027',
          dateEnrolled: '2026-08-17',
          status: status as Enrollment['status'],
        }),
      ),
    );
    grades = await runner.manager.save(
      Grade,
      [2, 1].map((enrollment, i) =>
        runner.manager.create(Grade, {
          enrollmentId: enrollments[enrollment].enrollmentId,
          gradeType: 'Midterm',
          score: i ? '90.00' : '85.00',
          remarks: null,
        }),
      ),
    );
    inquiries = await runner.manager.save(GradeInquiry, [
      runner.manager.create(GradeInquiry, {
        gradeId: grades[0].gradeId,
        studentId: users[2].userId,
        message: 'Own pending inquiry',
        status: 'Pending',
        resolvedBy: null,
        resolutionNote: null,
        dateResolved: null,
      }),
      runner.manager.create(GradeInquiry, {
        gradeId: grades[1].gradeId,
        studentId: users[3].userId,
        message: 'Other pending inquiry',
        status: 'Pending',
        resolvedBy: null,
        resolutionNote: null,
        dateResolved: null,
      }),
      runner.manager.create(GradeInquiry, {
        gradeId: grades[0].gradeId,
        studentId: users[2].userId,
        message: 'Historical inquiry',
        status: 'Resolved',
        resolvedBy: users[9].userId,
        resolutionNote: 'Historical note',
        dateSubmitted: new Date('2026-01-01T00:00:00Z'),
        dateResolved: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);
    const builder = Test.createTestingModule({ imports: [AppModule] });
    for (const entity of [User, Grade, GradeInquiry])
      builder
        .overrideProvider(getRepositoryToken(entity))
        .useValue(runner.manager.getRepository(entity));
    const module = await builder.compile();
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
      ['OtherStudent', 3],
      ['Faculty', 4],
      ['OtherFaculty', 5],
    ] as const)
      tokens[role] = await app
        .get(JwtService)
        .signAsync(
          { role: roles[index] },
          { subject: String(users[index].userId) },
        );
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
      await source.getRepository(User).countBy({ userId: users[0].userId }),
    ).toBe(0);
    expect(
      await source
        .getRepository(GradeInquiry)
        .countBy({ inquiryId: inquiries[0].inquiryId }),
    ).toBe(0);
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    expect(
      createHash('sha256').update(readFileSync(demoFile)).digest('hex') ===
        demoDigest,
    ).toBe(true);
  });

  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    role = 'Admin',
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1${path}`)
      .set('Authorization', `Bearer ${tokens[role]}`);
  const gradeBody = (overrides: Record<string, unknown> = {}) => ({
    enrollmentId: enrollments[0].enrollmentId,
    gradeType: 'Midterm',
    score: 92.5,
    remarks: ' Passed ',
    ...overrides,
  });
  const userBody = (overrides: Record<string, unknown> = {}) => ({
    firstName: ' New ',
    lastName: ' Person ',
    email: `${prefix}-new@sgms.example.test`,
    password,
    role: 'Student',
    accountStatus: 'Active',
    ...overrides,
  });
  const audits = (action: string) =>
    runner.manager.find(AuditLog, { where: { action } });

  it('assigned Faculty records a Grade with precision and transactional audit', async () => {
    const result = await call('post', '/grades', 'Faculty')
      .send(gradeBody())
      .expect(201);
    expect(Object.keys(result.body).sort()).toEqual(gradeKeys);
    expect(result.body.score).toBe('92.50');
    expect(result.body.remarks).toBe('Passed');
    expect((await audits('GRADE_CREATE'))[0].userId).toBe(users[4].userId);
  });
  it('updates historical Grade fields, clears remarks, and preserves dateRecorded', async () => {
    const original = grades[0].dateRecorded.toISOString();
    const result = await call(
      'patch',
      `/grades/${grades[0].gradeId}`,
      'Faculty',
    )
      .send({ score: 100, remarks: null })
      .expect(200);
    expect(result.body.dateRecorded).toBe(original);
    expect(result.body.score).toBe('100.00');
    expect(result.body.remarks).toBeNull();
    expect((await audits('GRADE_UPDATE'))[0].recordId).toBe(grades[0].gradeId);
  });
  it('accepts zero scores on creation and update without treating zero as missing', async () => {
    const created = await call('post', '/grades', 'Faculty')
      .send(gradeBody({ score: 0, remarks: null }))
      .expect(201);
    expect(created.body.score).toBe('0.00');
    const updated = await call(
      'patch',
      `/grades/${grades[0].gradeId}`,
      'Faculty',
    )
      .send({ score: 0 })
      .expect(200);
    expect(updated.body.score).toBe('0.00');
  });
  it.each(['Student', 'Admin', 'Department Head', 'OtherFaculty'])(
    'rejects %s Grade create/update',
    async (role) => {
      await call('post', '/grades', role).send(gradeBody()).expect(403);
      await call('patch', `/grades/${grades[0].gradeId}`, role)
        .send({ score: 90 })
        .expect(403);
    },
  );
  it.each(['Student', 'Faculty', 'Admin', 'Department Head'])(
    'scopes %s Grade reads and totals',
    async (role) => {
      const response = await call('get', '/grades', role).expect(200);
      expect(response.body.total).toBe(
        ['Student', 'Faculty'].includes(role) ? 1 : 5,
      );
      if (['Student', 'Faculty'].includes(role))
        expect(response.body.data[0].gradeId).toBe(grades[0].gradeId);
    },
  );
  it('prevents Student filter bypass and intersects Faculty student filters', async () => {
    await call('get', `/grades?studentId=${users[3].userId}`, 'Student').expect(
      403,
    );
    const result = await call(
      'get',
      `/grades?studentId=${users[3].userId}`,
      'Faculty',
    ).expect(200);
    expect(result.body.total).toBe(0);
    expect(
      (
        await call(
          'get',
          `/grades?studentId=${users[2].userId}&pageSize=1`,
          'Student',
        ).expect(200)
      ).body.total,
    ).toBe(1);
  });
  it.each([-1, 100.01, 92.501, 0.001, '92.50', null])(
    'rejects invalid Grade score case %#',
    async (score) => {
      await call('post', '/grades', 'Faculty')
        .send(gradeBody({ score }))
        .expect(400);
      await call('patch', `/grades/${grades[0].gradeId}`, 'Faculty')
        .send({ score })
        .expect(400);
    },
  );
  it.each([
    { gradeType: 'Quiz' },
    { gradeType: null },
    { remarks: 'x'.repeat(31) },
    { enrollmentId: 0 },
    { dateRecorded: '2026-01-01' },
  ])('rejects invalid Grade body %#', async (change) => {
    await call('post', '/grades', 'Faculty')
      .send(gradeBody(change))
      .expect(400);
  });
  it('rejects duplicate Grade types on create and update', async () => {
    await call('post', '/grades', 'OtherFaculty')
      .send(gradeBody({ enrollmentId: enrollments[1].enrollmentId }))
      .expect(409);
    await runner.manager.save(
      Grade,
      runner.manager.create(Grade, {
        enrollmentId: enrollments[2].enrollmentId,
        gradeType: 'Final',
        score: '90.00',
        remarks: null,
      }),
    );
    await call('patch', `/grades/${grades[0].gradeId}`, 'Faculty')
      .send({ gradeType: 'Final' })
      .expect(409);
  });
  it.each([3, 4])(
    'rejects new Grades for ineligible enrollment fixture %i',
    async (index) => {
      await call('post', '/grades', 'Faculty')
        .send(gradeBody({ enrollmentId: enrollments[index].enrollmentId }))
        .expect(409);
    },
  );
  it('rejects Grade recording for inactive Student and immutable Grade fields', async () => {
    await call('post', '/grades', 'Faculty')
      .send(gradeBody({ enrollmentId: enrollments[5].enrollmentId }))
      .expect(400);
    await call('patch', `/grades/${grades[0].gradeId}`, 'Faculty')
      .send({ enrollmentId: enrollments[0].enrollmentId })
      .expect(400);
    await call('patch', `/grades/${grades[0].gradeId}`, 'Faculty')
      .send({ dateRecorded: '2026-01-01' })
      .expect(400);
    await call('patch', `/grades/${grades[0].gradeId}`, 'Faculty')
      .send({})
      .expect(400);
  });
  it('returns 404 for missing Grade and Enrollment references', async () => {
    await call('post', '/grades', 'Faculty')
      .send(gradeBody({ enrollmentId: 2147483647 }))
      .expect(404);
    await call('patch', '/grades/2147483647', 'Faculty')
      .send({ score: 90 })
      .expect(404);
  });
  it('submits a server-owned Pending inquiry with null resolution fields', async () => {
    const result = await call('post', '/grade-inquiries', 'Student')
      .send({ gradeId: grades[0].gradeId, message: ' Please review. ' })
      .expect(201);
    expect(Object.keys(result.body).sort()).toEqual(inquiryKeys);
    expect(result.body.studentId).toBe(users[2].userId);
    expect(result.body.status).toBe('Pending');
    expect(result.body.resolvedBy).toBeNull();
    expect(result.body.resolutionNote).toBeNull();
    expect(result.body.dateResolved).toBeNull();
    expect((await audits('INQUIRY_CREATE'))[0].userId).toBe(users[2].userId);
  });
  it('rejects another Student Grade and client-supplied inquiry ownership/status', async () => {
    await call('post', '/grade-inquiries', 'Student')
      .send({ gradeId: grades[1].gradeId, message: 'Review' })
      .expect(403);
    for (const extra of [
      { studentId: users[3].userId },
      { status: 'Resolved' },
      { resolvedBy: users[0].userId },
    ])
      await call('post', '/grade-inquiries', 'Student')
        .send({ gradeId: grades[0].gradeId, message: 'Review', ...extra })
        .expect(400);
  });
  it.each(['Admin', 'Department Head', 'Faculty'])(
    'rejects %s inquiry submission',
    async (role) => {
      await call('post', '/grade-inquiries', role)
        .send({ gradeId: grades[0].gradeId, message: 'Review' })
        .expect(403);
    },
  );
  it.each(['Faculty', 'Admin'])(
    '%s resolves exactly once without changing the Grade',
    async (role) => {
      const result = await call(
        'patch',
        `/grade-inquiries/${inquiries[0].inquiryId}`,
        role,
      )
        .send({ resolutionNote: ' Confirmed record. ' })
        .expect(200);
      expect(result.body.status).toBe('Resolved');
      expect(result.body.resolvedBy).toBe(
        users[role === 'Admin' ? 0 : 4].userId,
      );
      expect(result.body.resolutionNote).toBe('Confirmed record.');
      expect(typeof result.body.dateResolved).toBe('string');
      await call('patch', `/grade-inquiries/${inquiries[0].inquiryId}`, role)
        .send({ resolutionNote: 'Overwrite' })
        .expect(409);
      expect(
        (
          await runner.manager.findOneByOrFail(Grade, {
            gradeId: grades[0].gradeId,
          })
        ).score,
      ).toBe('85.00');
      expect(await audits('INQUIRY_RESOLVE')).toHaveLength(1);
    },
  );
  it.each(['Student', 'Department Head', 'OtherFaculty'])(
    'rejects %s inquiry resolution',
    async (role) => {
      await call('patch', `/grade-inquiries/${inquiries[0].inquiryId}`, role)
        .send({ resolutionNote: 'Review' })
        .expect(403);
    },
  );
  it.each(['', ' ', null, 'x'.repeat(4001)])(
    'rejects invalid inquiry note/message case %#',
    async (value) => {
      await call('post', '/grade-inquiries', 'Student')
        .send({ gradeId: grades[0].gradeId, message: value })
        .expect(400);
      await call('patch', `/grade-inquiries/${inquiries[0].inquiryId}`)
        .send({ resolutionNote: value })
        .expect(400);
    },
  );
  it('rejects missing/server-controlled resolution fields and reopening', async () => {
    for (const body of [
      {},
      { status: 'Pending' },
      { resolutionNote: 'Review', resolvedBy: users[5].userId },
      { resolutionNote: 'Review', dateResolved: '2026-01-01' },
    ])
      await call('patch', `/grade-inquiries/${inquiries[0].inquiryId}`)
        .send(body)
        .expect(400);
    await call('patch', `/grade-inquiries/${inquiries[2].inquiryId}`)
      .send({ resolutionNote: 'Overwrite' })
      .expect(409);
  });
  it.each(['Student', 'Faculty', 'Admin', 'Department Head'])(
    'scopes %s inquiry reads',
    async (role) => {
      const result = await call(
        'get',
        '/grade-inquiries?pageSize=1',
        role,
      ).expect(200);
      expect(result.body.total).toBe(
        ['Student', 'Faculty'].includes(role) ? 2 : 5,
      );
      expect(result.body.data).toHaveLength(1);
    },
  );
  it('protects inquiry filters and missing resources', async () => {
    await call(
      'get',
      `/grade-inquiries?studentId=${users[3].userId}`,
      'Student',
    ).expect(403);
    expect(
      (
        await call(
          'get',
          `/grade-inquiries?studentId=${users[3].userId}`,
          'Faculty',
        ).expect(200)
      ).body.total,
    ).toBe(0);
    await call('post', '/grade-inquiries', 'Student')
      .send({ gradeId: 2147483647, message: 'Review' })
      .expect(404);
    await call('patch', '/grade-inquiries/2147483647')
      .send({ resolutionNote: 'Review' })
      .expect(404);
  });
  it('Admin creates a normalized, hashed User and safe audit', async () => {
    const result = await call('post', '/users')
      .send(userBody({ email: ` ${prefix}-NEW@sgms.example.test ` }))
      .expect(201);
    expect(result.body.email).toBe(
      `${prefix.toLowerCase()}-new@sgms.example.test`,
    );
    expect(result.body.firstName).toBe('New');
    const row = await runner.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.userId = :id', { id: result.body.userId })
      .getOneOrFail();
    expect(await compare(password, row.passwordHash)).toBe(true);
    expect(getRounds(row.passwordHash)).toBe(12);
    expect(result.body.passwordHash).toBeUndefined();
    expect((await audits('USER_CREATE'))[0].userId).toBe(users[0].userId);
  });
  it('Admin safely updates fields/password and preserves createdAt', async () => {
    const newPassword = randomBytes(24).toString('base64url');
    const result = await call('patch', `/users/${users[7].userId}`)
      .send({
        firstName: 'Updated',
        password: newPassword,
        role: 'Faculty',
        accountStatus: 'Inactive',
      })
      .expect(200);
    expect(result.body.createdAt).toBe(users[7].createdAt.toISOString());
    const row = await runner.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.userId = :id', { id: users[7].userId })
      .getOneOrFail();
    expect(await compare(newPassword, row.passwordHash)).toBe(true);
    expect(getRounds(row.passwordHash)).toBe(12);
    expect((await audits('USER_UPDATE'))[0].recordId).toBe(users[7].userId);
  });
  it.each(['Student', 'Faculty', 'Department Head'])(
    'rejects %s account mutations',
    async (role) => {
      await call('post', '/users', role).send(userBody()).expect(403);
      await call('patch', `/users/${users[7].userId}`, role)
        .send({ firstName: 'Other' })
        .expect(403);
    },
  );
  it('limits Department Head directory projections and targets', async () => {
    const result = await call(
      'get',
      '/users?pageSize=100',
      'Department Head',
    ).expect(200);
    expect(
      result.body.data.every((row: User) =>
        ['Student', 'Faculty'].includes(row.role),
      ),
    ).toBe(true);
    result.body.data.forEach((row: object) =>
      expect(Object.keys(row).sort()).toEqual(directoryKeys),
    );
    const direct = await call(
      'get',
      `/users/${users[2].userId}`,
      'Department Head',
    ).expect(200);
    expect(Object.keys(direct.body).sort()).toEqual(directoryKeys);
    await call('get', `/users/${users[0].userId}`, 'Department Head').expect(
      403,
    );
  });
  it('Faculty gets own profile and assigned Students only; Student gets self only', async () => {
    const own = await call(
      'get',
      `/users/${users[4].userId}`,
      'Faculty',
    ).expect(200);
    expect(own.body.email).toBe(users[4].email);
    const student = await call(
      'get',
      `/users/${users[2].userId}`,
      'Faculty',
    ).expect(200);
    expect(Object.keys(student.body).sort()).toEqual(directoryKeys);
    await call('get', `/users/${users[3].userId}`, 'Faculty').expect(403);
    await call('get', `/users/${users[5].userId}`, 'Faculty').expect(403);
    await call('get', `/users/${users[2].userId}`, 'Student').expect(200);
    await call('get', `/users/${users[3].userId}`, 'Student').expect(403);
    for (const role of ['Faculty', 'Student'])
      await call('get', '/users', role).expect(403);
  });
  it('Admin directory paginates safe profiles and reports missing users', async () => {
    const result = await call('get', '/users?page=1&pageSize=2').expect(200);
    expect(result.body.data).toHaveLength(2);
    expect(result.body.total).toBe(16);
    await call('get', '/users/2147483647').expect(404);
    await call('patch', '/users/2147483647')
      .send({ firstName: 'Missing' })
      .expect(404);
  });
  it('rejects duplicate email on create/update', async () => {
    await call('post', '/users')
      .send(userBody({ email: users[2].email.toUpperCase() }))
      .expect(409);
    await call('patch', `/users/${users[7].userId}`)
      .send({ email: users[2].email })
      .expect(409);
  });
  it.each([
    { firstName: '' },
    { lastName: 'x'.repeat(51) },
    { email: 'invalid' },
    { password: 'short' },
    { password: 'é'.repeat(37) },
    { role: 'Root' },
    { accountStatus: 'Deleted' },
    { role: null },
    { passwordHash: 'untrusted' },
    { userId: 1 },
  ])('rejects invalid User create case %#', async (change) => {
    await call('post', '/users').send(userBody(change)).expect(400);
  });
  it('rejects empty/null/unknown User patches', async () => {
    for (const body of [
      {},
      { role: null },
      { role: 'Root' },
      { accountStatus: null },
      { accountStatus: 'Unknown' },
      { firstName: null },
      { password: 'short' },
      { passwordHash: 'untrusted' },
      { createdAt: '2026-01-01' },
    ])
      await call('patch', `/users/${users[7].userId}`).send(body).expect(400);
  });
  it.each([2, 4, 9])(
    'blocks role changes that invalidate academic/history fixture %i',
    async (index) => {
      await call('patch', `/users/${users[index].userId}`)
        .send({ role: 'Department Head' })
        .expect(409);
      expect(
        (
          await runner.manager.findOneByOrFail(User, {
            userId: users[index].userId,
          })
        ).role,
      ).toBe(users[index].role);
    },
  );
  it.each([{ accountStatus: 'Inactive' }, { role: 'Student' }])(
    'protects the last active Admin in an isolated policy fixture',
    async (change) => {
      const policy = app.get(UsersPolicyService);
      const original = policy.lockActiveAdmins.bind(policy);
      // Keep the real locking query; scope the policy population to one temporary Admin.
      // Seeded Admin values are never changed to manufacture this edge case.
      jest
        .spyOn(policy, 'lockActiveAdmins')
        .mockImplementation(async (manager) =>
          (await original(manager)).filter(
            (row) => row.userId === users[8].userId,
          ),
        );
      await call('patch', `/users/${users[8].userId}`).send(change).expect(409);
    },
  );
  it.each(['/grades', '/grade-inquiries', '/users'])(
    'validates pagination for %s',
    async (path) => {
      for (const query of ['page=0', 'pageSize=101', 'page=1e2', 'unknown=1'])
        await call('get', `${path}?${query}`).expect(400);
    },
  );
  it.each([
    ['get', '/grades'],
    ['post', '/grades'],
    ['patch', '/grades/1'],
    ['get', '/grade-inquiries'],
    ['post', '/grade-inquiries'],
    ['patch', '/grade-inquiries/1'],
    ['get', '/users'],
    ['get', '/users/1'],
    ['post', '/users'],
    ['patch', '/users/1'],
  ])('requires JWT for %s %s', async (method, path) => {
    await request(app.getHttpServer())
      [method as 'get'](`/api/v1${path}`)
      .expect(401);
    await request(app.getHttpServer())
      [method as 'get'](`/api/v1${path}`)
      .set('Authorization', 'Bearer invalid')
      .expect(401);
  });
  it.each([
    'GRADE_CREATE',
    'GRADE_UPDATE',
    'INQUIRY_CREATE',
    'INQUIRY_RESOLVE',
    'USER_CREATE',
    'USER_UPDATE',
  ])('rolls back %s when its audit INSERT fails', async (action) => {
    const audit = app.get(AuditLogsService);
    const original = audit.record.bind(audit);
    const initial = await runner.manager.count(AuditLog);
    jest
      .spyOn(audit, 'record')
      .mockImplementationOnce((manager, entry) =>
        original(manager, { ...entry, action: null as unknown as string }),
      );
    const operation =
      action === 'GRADE_CREATE'
        ? call('post', '/grades', 'Faculty').send(gradeBody())
        : action === 'GRADE_UPDATE'
          ? call('patch', `/grades/${grades[0].gradeId}`, 'Faculty').send({
              score: 99,
            })
          : action === 'INQUIRY_CREATE'
            ? call('post', '/grade-inquiries', 'Student').send({
                gradeId: grades[0].gradeId,
                message: 'Rollback',
              })
            : action === 'INQUIRY_RESOLVE'
              ? call(
                  'patch',
                  `/grade-inquiries/${inquiries[0].inquiryId}`,
                ).send({ resolutionNote: 'Rollback' })
              : action === 'USER_CREATE'
                ? call('post', '/users').send(userBody())
                : call('patch', `/users/${users[7].userId}`).send({
                    firstName: 'Rollback',
                  });
    await operation.expect(500);
    expect(await runner.manager.count(AuditLog)).toBe(initial);
    expect(
      await runner.manager.countBy(Grade, {
        enrollmentId: enrollments[0].enrollmentId,
      }),
    ).toBe(0);
    expect(
      (
        await runner.manager.findOneByOrFail(Grade, {
          gradeId: grades[0].gradeId,
        })
      ).score,
    ).toBe('85.00');
    expect(
      await runner.manager.countBy(GradeInquiry, { message: 'Rollback' }),
    ).toBe(0);
    expect(
      (
        await runner.manager.findOneByOrFail(GradeInquiry, {
          inquiryId: inquiries[0].inquiryId,
        })
      ).status,
    ).toBe('Pending');
    expect(
      await runner.manager.countBy(User, {
        email: `${prefix.toLowerCase()}-new@sgms.example.test`,
      }),
    ).toBe(0);
    expect(
      (await runner.manager.findOneByOrFail(User, { userId: users[7].userId }))
        .firstName,
    ).toBe('Temporary');
  });
  it('excludes confidential values from new responses and audit action data', async () => {
    const created = await call('post', '/users').send(userBody()).expect(201);
    const grade = await call('post', '/grades', 'Faculty')
      .send(gradeBody())
      .expect(201);
    const inquiry = await call('post', '/grade-inquiries', 'Student')
      .send({ gradeId: grades[0].gradeId, message: 'Review' })
      .expect(201);
    const serialized = JSON.stringify([
      created.body,
      grade.body,
      inquiry.body,
      await audits('USER_CREATE'),
    ]);
    for (const secret of [
      password,
      fixtureHash,
      process.env.JWT_SECRET,
      process.env.DB_PASSWORD,
      process.env.DB_MIGRATION_PASSWORD,
    ])
      expect(Boolean(secret) && serialized.includes(secret!)).toBe(false);
    expect(/passwordHash|password_hash|JWT_SECRET/.test(serialized)).toBe(
      false,
    );
  });
});
