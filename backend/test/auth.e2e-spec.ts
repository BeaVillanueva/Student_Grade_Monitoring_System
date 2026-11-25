import 'reflect-metadata';
import { Controller, Get } from '@nestjs/common';
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
import { User } from '../src/database/entities';
import { databaseOptions } from '../src/database/database.config';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { configureApp } from '../src/common/configure-app';

// These routes exist ONLY in the test module; none are part of production AppModule.
@Controller('_fixture')
class SecurityFixtureController {
  @Get('admin')
  @Roles('Admin')
  admin() {
    return { allowed: true };
  }

  @Get('internal-error')
  error() {
    throw new Error('INTERNAL_TEST_SENTINEL SQL credential details');
  }
}

describe('Authentication and access security (MariaDB transaction fixtures)', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let app: NestExpressApplication;
  let fixture: User;
  const password = randomBytes(24).toString('base64url');
  const email = `auth-${randomUUID()}@sgms.example.test`;
  const demoPath = resolve(__dirname, '../.env.demo');
  const demoBefore = createHash('sha256')
    .update(readFileSync(demoPath))
    .digest('hex');
  const demo = new Map(
    readFileSync(demoPath, 'utf8')
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => [
        line.slice(0, line.indexOf('=')),
        line.slice(line.indexOf('=') + 1),
      ]),
  );

  beforeAll(async () => {
    // Jest virtualizes process.env; Node's loadEnvFile does not update that proxy.
    Object.assign(
      process.env,
      parseEnv(readFileSync(resolve(__dirname, '../.env'), 'utf8')),
    );
    source = await new DataSource(databaseOptions()).initialize();
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    fixture = await runner.manager.save(
      User,
      runner.manager.create(User, {
        firstName: 'Temporary',
        lastName: 'AuthFixture',
        email,
        role: 'Student',
        accountStatus: 'Active',
        passwordHash: await hash(password, 12),
      }),
    );
  });

  beforeEach(async () => {
    await runner.manager.update(User, fixture.userId, {
      role: 'Student',
      accountStatus: 'Active',
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SecurityFixtureController],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(runner.manager.getRepository(User))
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });
  afterAll(async () => {
    try {
      if (runner?.isTransactionActive) await runner.rollbackTransaction();
    } finally {
      if (runner) await runner.release();
      if (source?.isInitialized) {
        const remaining = await source.getRepository(User).countBy({ email });
        await source.destroy();
        expect(remaining).toBe(0);
      }
    }
    expect(
      createHash('sha256').update(readFileSync(demoPath)).digest('hex') ===
        demoBefore,
    ).toBe(true);
  });

  const login = (body: unknown) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);
  const me = (token?: string) => {
    const req = request(app.getHttpServer()).get('/api/v1/auth/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const tokenForFixture = async () => {
    const result = await login({ email, password }).expect(200);
    return result.body.accessToken as string;
  };

  it.each([
    ['STUDENT_ONE', 'Student'],
    ['FACULTY_ONE', 'Faculty'],
    ['ADMIN', 'Admin'],
    ['HEAD', 'Department Head'],
  ])('logs in seeded %s and retrieves its safe profile', async (key, role) => {
    const response = await login({
      email: demo.get(`DEMO_${key}_EMAIL`),
      password: demo.get(`DEMO_${key}_PASSWORD`),
    }).expect(200);
    expect(response.body.user.role).toBe(role);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.expiresIn).toBe(1800);
    expect(typeof response.body.accessToken).toBe('string');
    const payload = await app
      .get(JwtService)
      .verifyAsync(response.body.accessToken);
    expect(payload.exp - payload.iat).toBe(1800);
    expect(Object.keys(payload).sort()).toEqual([
      'aud',
      'exp',
      'iat',
      'iss',
      'role',
      'sub',
    ]);
    const profile = await me(response.body.accessToken).expect(200);
    expect(profile.body.role).toBe(role);
    expect(profile.body.userId).toBe(response.body.user.userId);
    expect(Object.keys(profile.body).sort()).toEqual([
      'accountStatus',
      'createdAt',
      'email',
      'firstName',
      'lastName',
      'role',
      'userId',
    ]);
    expect(Object.keys(response.body.user).sort()).toEqual(
      Object.keys(profile.body).sort(),
    );
    expect(profile.headers['cache-control']).toBe('no-store');
  });

  it('returns identical generic failures for wrong password, unknown email, and inactive account', async () => {
    const badPassword = await login({
      email,
      password: 'incorrect-password',
    }).expect(401);
    const unknown = await login({
      email: `missing-${randomUUID()}@sgms.example.test`,
      password,
    }).expect(401);
    const inactive = await login({
      email: demo.get('DEMO_STUDENT_TWO_EMAIL'),
      password: demo.get('DEMO_STUDENT_TWO_PASSWORD'),
    }).expect(401);
    expect(badPassword.body).toEqual({
      statusCode: 401,
      message: 'Authentication failed',
    });
    expect(unknown.body).toEqual(badPassword.body);
    expect(inactive.body).toEqual(badPassword.body);
  });

  it.each([
    {},
    { email: 'invalid', password: 'abc' },
    { email, password: '' },
    { email, password: 123 },
    { email: 123, password },
    { email, password, role: 'Admin' },
    { email, password, unexpected: 'secret-sentinel' },
    { email, password: 'x'.repeat(73) },
    { email, password: 'é'.repeat(37) },
  ])('rejects invalid DTO case %# without echoing inputs', async (body) => {
    const response = await login(body).expect(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Invalid request',
    });
  });

  it('normalizes email but preserves password content', async () => {
    await login({ email: `  ${email.toUpperCase()}  `, password }).expect(200);
    await login({ email, password: ` ${password}` }).expect(401);
  });

  it('excludes passwords, hashes, signing secrets, and database credentials from responses', async () => {
    const response = await login({ email, password }).expect(200);
    const profile = await me(response.body.accessToken).expect(200);
    const failure = await login({
      email,
      password: 'incorrect-password',
    }).expect(401);
    const output = JSON.stringify([response.body, profile.body, failure.body]);
    const sensitive = [
      password,
      fixture.passwordHash,
      process.env.JWT_SECRET,
      process.env.DB_PASSWORD,
      process.env.DB_MIGRATION_PASSWORD,
      ...[...demo.entries()]
        .filter(([key]) => key.endsWith('_PASSWORD'))
        .map(([, value]) => value),
    ];
    for (const value of sensitive) {
      expect(Boolean(value) && output.includes(value!)).toBe(false);
    }
    expect(
      /password|passwordHash|password_hash|secret|stack|sql/i.test(
        JSON.stringify([
          profile.body,
          failure.body,
          Object.keys(response.body),
        ]),
      ),
    ).toBe(false);
  });

  it('rejects malformed JSON without reflecting parser details', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"password":"secret-sentinel",')
      .expect(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Invalid request',
    });
  });

  it('rejects missing JWT and refuses query-string token transport', async () => {
    await me().expect(401);
    const token = await tokenForFixture();
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .query({ accessToken: token })
      .expect(401);
  });

  it('rejects malformed and invalid-signature JWTs', async () => {
    await me('invalid.jwt.value').expect(401);
    const token = await app.get(JwtService).signAsync(
      { role: 'Student' },
      {
        subject: String(fixture.userId),
        secret: randomBytes(64).toString('hex'),
      },
    );
    await me(token).expect(401);
  });

  it('rejects expired JWT', async () => {
    const token = await app
      .get(JwtService)
      .signAsync(
        { role: 'Student' },
        { subject: String(fixture.userId), expiresIn: -1 },
      );
    await me(token).expect(401);
  });

  it.each([
    { subject: 'not-a-user-id' },
    { issuer: 'untrusted' },
    { audience: 'different-api' },
  ])('rejects unexpected JWT claims %#', async (options) => {
    const token = await app
      .get(JwtService)
      .signAsync(
        { role: 'Student' },
        { subject: String(fixture.userId), ...options },
      );
    await me(token).expect(401);
  });

  it('rejects JWTs for missing users', async () => {
    const token = await app
      .get(JwtService)
      .signAsync({ role: 'Student' }, { subject: '2147483647' });
    await me(token).expect(401);
  });

  it('returns 403 for disallowed roles using a test-only controller', async () => {
    const token = await tokenForFixture();
    const response = await request(app.getHttpServer())
      .get('/api/v1/_fixture/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(response.body).toEqual({ statusCode: 403, message: 'Forbidden' });
  });

  it('enforces current account deactivation on the next protected request', async () => {
    const token = await tokenForFixture();
    await me(token).expect(200);
    await runner.manager.update(User, fixture.userId, {
      accountStatus: 'Inactive',
    });
    await me(token).expect(401);
    await login({ email, password }).expect(401);
  });

  it('uses current database role for both promotions and demotions with the same token', async () => {
    const token = await tokenForFixture();
    const adminRoute = () =>
      request(app.getHttpServer())
        .get('/api/v1/_fixture/admin')
        .set('Authorization', `Bearer ${token}`);
    await adminRoute().expect(403);
    await runner.manager.update(User, fixture.userId, { role: 'Admin' });
    await adminRoute().expect(200);
    expect((await me(token).expect(200)).body.role).toBe('Admin');
    await runner.manager.update(User, fixture.userId, { role: 'Student' });
    await adminRoute().expect(403);
  });

  it('limits login to five attempts per minute and ignores spoofed forwarding headers', async () => {
    for (let i = 0; i < 5; i++) {
      await login({ email, password: 'incorrect-password' })
        .set('X-Forwarded-For', `203.0.113.${i + 1}`)
        .expect(401);
    }
    const response = await login({ email, password })
      .set('X-Forwarded-For', '203.0.113.200')
      .expect(429);
    expect(response.body).toEqual({
      statusCode: 429,
      message: 'Too many requests',
    });
    expect(Number(response.headers['retry-after-login'])).toBeGreaterThan(0);
    // Five real cost-12 bcrypt comparisons need a bounded budget on a busy host.
    // This changes only Jest's deadline, not the production rate limit or hashing cost.
  }, 20_000);

  it('applies the general 100-per-minute limit across protected route handlers', async () => {
    for (let i = 0; i < 100; i++) await me().expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/_fixture/admin')
      .expect(429);
  });

  it('sanitizes internal exceptions and does not log sensitive exception content', async () => {
    const token = await tokenForFixture();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app.getHttpServer())
        .get('/api/v1/_fixture/internal-error')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('removes the scaffold endpoint from the production route surface', async () => {
    const token = await tokenForFixture();
    await request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
