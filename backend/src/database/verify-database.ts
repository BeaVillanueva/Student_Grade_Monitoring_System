import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compare, getRounds } from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { databaseOptions } from './database.config';
import {
  User,
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  AuditLog,
} from './entities';
import { assertGradeScore } from './domain';

async function verify(): Promise<void> {
  const source = new DataSource(databaseOptions());
  await source.initialize();
  let checks = 0;
  const pass = (name: string) => {
    checks++;
    console.log(`PASS ${name}`);
  };
  const runner = source.createQueryRunner();
  await runner.connect();
  try {
    const [target] = await runner.query(
      'SELECT DATABASE() AS db, CURRENT_USER() AS account, VERSION() AS version',
    );
    assert.equal(target.db, 'student_grade_monitoring_db');
    assert.equal(target.account, 'sgms_app@127.0.0.1');
    assert.match(target.version, /^10\.4\.32-MariaDB/);
    pass('MariaDB version, isolated database, dedicated runtime account');
    const [session] = await runner.query(
      'SELECT @@SESSION.sql_mode AS mode, @@SESSION.time_zone AS timezone',
    );
    assert.match(session.mode, /STRICT_TRANS_TABLES/);
    assert.equal(session.timezone, '+00:00');
    pass('strict SQL validation and UTC configured for SGMS sessions only');

    const grants = await runner.query('SHOW GRANTS FOR CURRENT_USER');
    const grantText = grants
      .map((row: Record<string, string>) => Object.values(row)[0])
      .join('\n');
    assert.match(
      grantText,
      /GRANT SELECT, INSERT, UPDATE, DELETE ON `student_grade_monitoring_db`\.\*/,
    );
    assert.doesNotMatch(
      grantText,
      /GRANT (?:ALL|CREATE|ALTER|DROP)|GRANT OPTION/,
    );
    pass('runtime account has schema-scoped DML permissions only');
    const migrator = new DataSource(databaseOptions('migration'));
    await migrator.initialize();
    try {
      const [identity] = await migrator.query(
        'SELECT CURRENT_USER() AS account',
      );
      assert.equal(identity.account, 'sgms_migrator@127.0.0.1');
      const migrationGrants = await migrator.query(
        'SHOW GRANTS FOR CURRENT_USER',
      );
      const text = migrationGrants
        .map((row: Record<string, string>) => Object.values(row)[0])
        .join('\n');
      assert.match(text, /ON `student_grade_monitoring_db`\.\*/);
      assert.doesNotMatch(text, /\bDROP\b|GRANT ALL|GRANT OPTION/);
      assert.ok(
        text
          .split('\n')
          .every(
            (line: string) =>
              line.includes('GRANT USAGE ON *.*') ||
              line.includes('ON `student_grade_monitoring_db`.*'),
          ),
      );
    } finally {
      await migrator.destroy();
    }
    pass(
      'migration account is local and SGMS-scoped with no DROP or grant privileges',
    );

    for (const path of [
      '/SGMS/',
      '/SGMS/backend/.env',
      '/SGMS/backend/.env.demo',
      '/SGMS/backend/package.json',
    ]) {
      const response = await fetch(`http://127.0.0.1${path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 403);
    }
    pass(
      'Apache denies directory, credentials, demo credentials, and source access',
    );

    const tableRows = await runner.query(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    );
    assert.deepEqual(
      tableRows.map((row: { name: string }) => row.name).sort(),
      [
        'users',
        'subjects',
        'enrollments',
        'grades',
        'grade_inquiries',
        'audit_logs',
        'sgms_migrations',
      ].sort(),
    );
    const [migration] = await runner.query('SELECT name FROM sgms_migrations');
    assert.equal(migration.name, 'InitialSgmsSchema1795564800000');
    assert.equal(
      Number(
        (await runner.query('SELECT COUNT(*) AS n FROM sgms_migrations'))[0].n,
      ),
      1,
    );
    pass('six domain tables and one executed migration');

    const columns =
      await runner.query(`SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS ty,
      CHARACTER_MAXIMUM_LENGTH AS len, IS_NULLABLE AS nullable FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()`);
    const column = (table: string, name: string) =>
      columns.find(
        (c: { t: string; c: string }) => c.t === table && c.c === name,
      );
    assert.equal(Number(column('users', 'first_name').len), 50);
    assert.equal(Number(column('users', 'email').len), 100);
    assert.equal(Number(column('users', 'password_hash').len), 255);
    assert.equal(Number(column('subjects', 'subject_code').len), 20);
    assert.equal(Number(column('subjects', 'subject_name').len), 100);
    assert.equal(Number(column('enrollments', 'school_year').len), 9);
    assert.equal(column('enrollments', 'date_enrolled').ty, 'date');
    assert.equal(column('grades', 'score').ty, 'decimal(5,2)');
    assert.equal(Number(column('grades', 'remarks').len), 30);
    assert.equal(column('grade_inquiries', 'message').ty, 'text');
    for (const name of ['resolved_by', 'resolution_note', 'date_resolved']) {
      assert.equal(column('grade_inquiries', name).nullable, 'YES');
    }
    pass('Lab 04 lengths/types and corrected resolution nullability');

    const foreignKeys =
      await runner.query(`SELECT DELETE_RULE AS d, UPDATE_RULE AS u FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()`);
    assert.equal(foreignKeys.length, 8);
    assert.ok(
      foreignKeys.every(
        (key: { d: string; u: string }) =>
          key.d === 'RESTRICT' && key.u === 'RESTRICT',
      ),
    );
    pass('all eight foreign keys restrict parent deletion and key changes');

    const entities = [User, Subject, Enrollment, Grade, GradeInquiry, AuditLog];
    const counts = await Promise.all(
      entities.map((entity) => source.manager.count(entity)),
    );
    assert.deepEqual(counts, [6, 2, 2, 3, 2, 1]);
    const users = await source
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .getMany();
    assert.deepEqual(
      new Set(users.map((u) => u.role)),
      new Set(['Student', 'Faculty', 'Admin', 'Department Head']),
    );
    assert.equal(users.filter((u) => u.accountStatus === 'Inactive').length, 1);
    const credentials = new Map(
      readFileSync(resolve(__dirname, '../../.env.demo'), 'utf8')
        .split('\n')
        .filter((line) => line.includes('='))
        .map((line) => [
          line.slice(0, line.indexOf('=')),
          line.slice(line.indexOf('=') + 1),
        ]),
    );
    for (const user of users) {
      assert.match(user.email, /@sgms\.example\.test$/);
      const handle = user.email
        .split('@')[0]
        .replaceAll('.', '_')
        .toUpperCase();
      const password = credentials.get(`DEMO_${handle}_PASSWORD`);
      assert.ok(password);
      assert.equal(getRounds(user.passwordHash), 12);
      assert.ok(await compare(password, user.passwordHash));
    }
    assert.equal(new Set(users.map((u) => u.passwordHash)).size, 6);
    const safeUser = await source
      .getRepository(User)
      .findOneByOrFail({ userId: users[0].userId });
    assert.equal(safeUser.passwordHash, undefined);
    pass(
      'fictional seed counts, all roles, inactive account, six unique bcrypt hashes, default hash exclusion',
    );

    const inquiries = await source.getRepository(GradeInquiry).find({
      relations: {
        student: true,
        resolver: true,
        grade: { enrollment: { student: true, subject: { faculty: true } } },
      },
    });
    for (const inquiry of inquiries) {
      assert.equal(inquiry.studentId, inquiry.grade.enrollment.studentId);
      assert.equal(inquiry.grade.enrollment.subject.faculty.role, 'Faculty');
      if (inquiry.status === 'Pending') {
        assert.equal(inquiry.resolvedBy, null);
        assert.equal(inquiry.dateResolved, null);
      } else {
        assert.equal(inquiry.resolver?.role, 'Faculty');
      }
    }
    pass('TypeORM relation traversal and pending/resolved seed consistency');

    const drift = await source.driver.createSchemaBuilder().log();
    assert.equal(
      drift.upQueries.length,
      0,
      'Entity schema differs from migrated database; inspect without executing synchronization.',
    );
    pass(
      'entity metadata matches migrated schema (read-only schema comparison)',
    );

    await runner.startTransaction();
    const reject = async (
      name: string,
      sql: string,
      params: unknown[],
      errno: number,
    ) => {
      try {
        await runner.query(sql, params);
      } catch (error) {
        assert.equal(
          (error as { driverError?: { errno: number } }).driverError?.errno,
          errno,
          name,
        );
        pass(name);
        return;
      }
      throw new Error(`Constraint unexpectedly accepted: ${name}`);
    };
    const student = users.find(
      (u) => u.email === 'student.one@sgms.example.test',
    )!;
    const faculty = users.find(
      (u) => u.email === 'faculty.one@sgms.example.test',
    )!;
    const subjects = await runner.manager.find(Subject);
    const enrollment = await runner.manager.findOneByOrFail(Enrollment, {
      subjectId: subjects[0].subjectId,
    });
    const grade = await runner.manager.findOneByOrFail(Grade, {
      enrollmentId: enrollment.enrollmentId,
      gradeType: 'Midterm',
    });
    const pending = inquiries.find((i) => i.status === 'Pending')!;
    const resolved = inquiries.find((i) => i.status === 'Resolved')!;

    await reject(
      'unique email',
      'UPDATE users SET email = ? WHERE user_id = ?',
      [student.email, faculty.userId],
      1062,
    );
    await reject(
      'unique subject code',
      'UPDATE subjects SET subject_code = ? WHERE subject_id = ?',
      [subjects[0].subjectCode, subjects[1].subjectId],
      1062,
    );
    await reject(
      'duplicate enrollment per term',
      `INSERT INTO enrollments (student_id,subject_id,semester,school_year,date_enrolled,status) VALUES (?,?,?,?,?,?)`,
      [
        student.userId,
        enrollment.subjectId,
        enrollment.semester,
        enrollment.schoolYear,
        enrollment.dateEnrolled,
        'Enrolled',
      ],
      1062,
    );
    await reject(
      'duplicate grade type',
      'INSERT INTO grades (enrollment_id,grade_type,score) VALUES (?,?,?)',
      [enrollment.enrollmentId, 'Midterm', '90.00'],
      1062,
    );
    await reject(
      'required name',
      'UPDATE users SET first_name = NULL WHERE user_id = ?',
      [student.userId],
      1048,
    );
    await reject(
      'allowed role',
      'UPDATE users SET role = ? WHERE user_id = ?',
      ['Unknown', student.userId],
      4025,
    );
    await reject(
      'allowed account status',
      'UPDATE users SET account_status = ? WHERE user_id = ?',
      ['Unknown', student.userId],
      4025,
    );
    await reject(
      'positive subject units',
      'UPDATE subjects SET units = 0 WHERE subject_id = ?',
      [subjects[0].subjectId],
      4025,
    );
    await reject(
      'consecutive school years',
      'UPDATE enrollments SET school_year = ? WHERE enrollment_id = ?',
      ['2026-2028', enrollment.enrollmentId],
      4025,
    );
    await reject(
      'school year format',
      'UPDATE enrollments SET school_year = ? WHERE enrollment_id = ?',
      ['invalid', enrollment.enrollmentId],
      4025,
    );
    await reject(
      'nonempty semester',
      'UPDATE enrollments SET semester = ? WHERE enrollment_id = ?',
      [' ', enrollment.enrollmentId],
      4025,
    );
    await reject(
      'allowed enrollment status',
      'UPDATE enrollments SET status = ? WHERE enrollment_id = ?',
      ['Unknown', enrollment.enrollmentId],
      4025,
    );
    await reject(
      'allowed grade type',
      'UPDATE grades SET grade_type = ? WHERE grade_id = ?',
      ['Quiz', grade.gradeId],
      4025,
    );
    await reject(
      'score minimum',
      'UPDATE grades SET score = -1 WHERE grade_id = ?',
      [grade.gradeId],
      4025,
    );
    await reject(
      'score maximum',
      'UPDATE grades SET score = 100.01 WHERE grade_id = ?',
      [grade.gradeId],
      4025,
    );
    await reject(
      'allowed inquiry status',
      'UPDATE grade_inquiries SET status = ? WHERE inquiry_id = ?',
      ['Unknown', pending.inquiryId],
      4025,
    );
    await reject(
      'nonempty inquiry message',
      'UPDATE grade_inquiries SET message = ? WHERE inquiry_id = ?',
      [' ', pending.inquiryId],
      4025,
    );
    await reject(
      'pending inquiry has no resolver',
      'UPDATE grade_inquiries SET resolved_by = ? WHERE inquiry_id = ?',
      [faculty.userId, pending.inquiryId],
      4025,
    );
    await reject(
      'resolved inquiry needs resolution fields',
      "UPDATE grade_inquiries SET status = 'Resolved' WHERE inquiry_id = ?",
      [pending.inquiryId],
      4025,
    );
    await reject(
      'resolution date order',
      'UPDATE grade_inquiries SET date_resolved = ? WHERE inquiry_id = ?',
      ['2020-01-01 00:00:00', resolved.inquiryId],
      4025,
    );
    await reject(
      'subject faculty FK',
      'UPDATE subjects SET faculty_id = 2147483647 WHERE subject_id = ?',
      [subjects[0].subjectId],
      1452,
    );
    await reject(
      'enrollment student FK',
      'UPDATE enrollments SET student_id = 2147483647 WHERE enrollment_id = ?',
      [enrollment.enrollmentId],
      1452,
    );
    await reject(
      'enrollment subject FK',
      'UPDATE enrollments SET subject_id = 2147483647 WHERE enrollment_id = ?',
      [enrollment.enrollmentId],
      1452,
    );
    await reject(
      'grade enrollment FK',
      'UPDATE grades SET enrollment_id = 2147483647 WHERE grade_id = ?',
      [grade.gradeId],
      1452,
    );
    await reject(
      'inquiry grade FK',
      'UPDATE grade_inquiries SET grade_id = 2147483647 WHERE inquiry_id = ?',
      [pending.inquiryId],
      1452,
    );
    await reject(
      'inquiry student FK',
      'UPDATE grade_inquiries SET student_id = 2147483647 WHERE inquiry_id = ?',
      [pending.inquiryId],
      1452,
    );
    await reject(
      'inquiry resolver FK',
      'UPDATE grade_inquiries SET resolved_by = 2147483647 WHERE inquiry_id = ?',
      [resolved.inquiryId],
      1452,
    );
    await reject(
      'audit user FK',
      'UPDATE audit_logs SET user_id = 2147483647',
      [],
      1452,
    );
    await reject(
      'protect referenced user',
      'DELETE FROM users WHERE user_id = ?',
      [student.userId],
      1451,
    );
    await reject(
      'protect referenced subject',
      'DELETE FROM subjects WHERE subject_id = ?',
      [enrollment.subjectId],
      1451,
    );
    await reject(
      'protect referenced enrollment',
      'DELETE FROM enrollments WHERE enrollment_id = ?',
      [enrollment.enrollmentId],
      1451,
    );
    await reject(
      'protect referenced grade',
      'DELETE FROM grades WHERE grade_id = ?',
      [grade.gradeId],
      1451,
    );

    for (const score of ['0', '0.00', '100', '100.00', '92.50'])
      assert.doesNotThrow(() => assertGradeScore(score));
    for (const score of ['-1', '100.01', '92.501', 'NaN', '1e2', ''])
      assert.throws(() => assertGradeScore(score));
    await runner.query('UPDATE grades SET score = 0 WHERE grade_id = ?', [
      grade.gradeId,
    ]);
    await runner.query('UPDATE grades SET score = 100 WHERE grade_id = ?', [
      grade.gradeId,
    ]);
    pass('score endpoints and pre-write decimal precision validation');

    const transient = await runner.manager.save(
      Subject,
      runner.manager.create(Subject, {
        subjectCode: 'VERIFY_TEMP',
        subjectName: 'Temporary rollback probe',
        units: 1,
        facultyId: faculty.userId,
      }),
    );
    transient.units = 2;
    await runner.manager.save(Subject, transient);
    assert.equal(
      (
        await runner.manager.findOneByOrFail(Subject, {
          subjectId: transient.subjectId,
        })
      ).units,
      2,
    );
    await runner.manager.delete(Subject, transient.subjectId);
    pass(
      'transactional create/read/update/delete of an unreferenced temporary subject',
    );
    await runner.rollbackTransaction();
    assert.deepEqual(
      await Promise.all(entities.map((entity) => source.manager.count(entity))),
      counts,
    );
    const restoredGrade = await source
      .getRepository(Grade)
      .findOneByOrFail({ gradeId: grade.gradeId });
    assert.equal(restoredGrade.score, grade.score);
    pass(
      'database probes rolled back; seed row counts and original score retained',
    );

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    try {
      assert.equal(app.get(DataSource).isInitialized, true);
    } finally {
      await app.close();
    }
    pass(
      'Nest application initializes and closes database connection without an HTTP listener',
    );
    console.log(`Database verification complete: ${checks} checks passed.`);
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
}

verify().catch((error: unknown) => {
  // Assertion diagnostics are safe; driver SQL and parameters may contain hashes.
  console.error(
    error instanceof assert.AssertionError
      ? `Database assertion failed: ${error.message}`
      : 'Database verification failed; sensitive driver details suppressed.',
  );
  process.exitCode = 1;
});
