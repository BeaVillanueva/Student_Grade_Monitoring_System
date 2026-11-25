import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { hash } from 'bcrypt';
import { databaseOptions } from '../database.config';
import {
  User,
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  AuditLog,
} from '../entities';
import type { UserRole } from '../domain';
import { assertGradeScore } from '../domain';

export async function seedDemo(): Promise<void> {
  if (process.env.SGMS_CONFIRM_DEMO_SEED !== 'student_grade_monitoring_db') {
    throw new Error(
      'Set SGMS_CONFIRM_DEMO_SEED=student_grade_monitoring_db to seed fictional data.',
    );
  }
  const source = new DataSource(databaseOptions());
  const credentialsFile = resolve(__dirname, '../../../.env.demo');
  let wroteCredentials = false;
  let committed = false;
  await source.initialize();
  const runner = source.createQueryRunner();
  await runner.connect();
  try {
    const [lock] = await runner.query(
      "SELECT GET_LOCK('sgms_demo_seed', 5) AS acquired",
    );
    if (Number(lock.acquired) !== 1)
      throw new Error('Demo seed is already running.');
    await runner.startTransaction();
    const counts = await Promise.all(
      [User, Subject, Enrollment, Grade, GradeInquiry, AuditLog].map((entity) =>
        runner.manager.count(entity),
      ),
    );
    if (counts.some((count) => count > 0)) {
      const marker = await runner.manager.findOneBy(AuditLog, {
        action: 'DEMO_SEED',
      });
      if (marker && counts.join(',') === '6,2,2,3,2,1') {
        await runner.rollbackTransaction();
        console.log(
          'Fictional demo seed already exists; no records or passwords changed.',
        );
        return;
      }
      throw new Error(
        'Demo seed requires empty SGMS tables; existing data will not be overwritten.',
      );
    }
    if (existsSync(credentialsFile))
      throw new Error('Refusing to overwrite existing demo credentials.');
    const definitions: [string, string, UserRole, 'Active' | 'Inactive'][] = [
      ['student.one', 'One', 'Student', 'Active'],
      ['student.two', 'Two', 'Student', 'Inactive'],
      ['faculty.one', 'One', 'Faculty', 'Active'],
      ['faculty.two', 'Two', 'Faculty', 'Active'],
      ['admin', 'Admin', 'Admin', 'Active'],
      ['head', 'Head', 'Department Head', 'Active'],
    ];
    const credentials: string[] = [
      '# Fictional demo accounts only. Keep this file local.',
    ];
    const users: User[] = [];
    for (const [handle, lastName, role, accountStatus] of definitions) {
      const password = randomBytes(24).toString('base64url');
      const email = `${handle}@sgms.example.test`;
      users.push(
        await runner.manager.save(
          User,
          runner.manager.create(User, {
            firstName: 'Demo',
            lastName,
            email,
            role,
            accountStatus,
            passwordHash: await hash(password, 12),
          }),
        ),
      );
      const key = handle.replaceAll('.', '_').toUpperCase();
      credentials.push(
        `DEMO_${key}_EMAIL=${email}`,
        `DEMO_${key}_PASSWORD=${password}`,
      );
    }
    const subjects = await runner.manager.save(Subject, [
      runner.manager.create(Subject, {
        subjectCode: 'DEMO116',
        subjectName: 'Demo Systems Integration',
        units: 3,
        facultyId: users[2].userId,
      }),
      runner.manager.create(Subject, {
        subjectCode: 'DEMO117',
        subjectName: 'Demo Database Design',
        units: 3,
        facultyId: users[3].userId,
      }),
    ]);
    const enrollments = await runner.manager.save(
      Enrollment,
      subjects.map((subject, i) =>
        runner.manager.create(Enrollment, {
          studentId: users[0].userId,
          subjectId: subject.subjectId,
          semester: '1st Semester',
          schoolYear: '2026-2027',
          dateEnrolled: '2026-08-17',
          status: i ? 'Enrolled' : 'Completed',
        }),
      ),
    );
    const scores = ['92.50', '95.00', '88.25'];
    scores.forEach(assertGradeScore);
    const grades = await runner.manager.save(Grade, [
      runner.manager.create(Grade, {
        enrollmentId: enrollments[0].enrollmentId,
        gradeType: 'Midterm',
        score: scores[0],
        remarks: 'Passed',
      }),
      runner.manager.create(Grade, {
        enrollmentId: enrollments[0].enrollmentId,
        gradeType: 'Final',
        score: scores[1],
        remarks: 'Passed',
      }),
      runner.manager.create(Grade, {
        enrollmentId: enrollments[1].enrollmentId,
        gradeType: 'Midterm',
        score: scores[2],
        remarks: null,
      }),
    ]);
    await runner.manager.save(GradeInquiry, [
      runner.manager.create(GradeInquiry, {
        gradeId: grades[2].gradeId,
        studentId: users[0].userId,
        message: 'Fictional request to explain the assessment breakdown.',
        status: 'Pending',
        resolvedBy: null,
        resolutionNote: null,
        dateResolved: null,
      }),
      runner.manager.create(GradeInquiry, {
        gradeId: grades[0].gradeId,
        studentId: users[0].userId,
        message: 'Fictional request to confirm the recorded score.',
        status: 'Resolved',
        dateSubmitted: new Date('2026-11-20T01:00:00Z'),
        resolvedBy: users[2].userId,
        resolutionNote: 'Demo faculty confirmed the assessment record.',
        dateResolved: new Date('2026-11-20T02:00:00Z'),
      }),
    ]);
    await runner.manager.save(
      AuditLog,
      runner.manager.create(AuditLog, {
        userId: users[4].userId,
        action: 'DEMO_SEED',
        tableAffected: 'users',
        recordId: null,
      }),
    );
    writeFileSync(credentialsFile, credentials.join('\n') + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    wroteCredentials = true;
    await runner.commitTransaction();
    committed = true;
    console.log(
      'Seeded fictional records: 6 users, 2 subjects, 2 enrollments, 3 grades, 2 inquiries, 1 audit log.',
    );
    console.log(
      'Unique random demo passwords saved only in ignored backend/.env.demo.',
    );
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    if (wroteCredentials && !committed) unlinkSync(credentialsFile);
    throw error;
  } finally {
    await runner.query("SELECT RELEASE_LOCK('sgms_demo_seed')");
    await runner.release();
    await source.destroy();
  }
}

if (require.main === module) {
  seedDemo().catch(() => {
    console.error('Demo seed failed; sensitive driver details suppressed.');
    process.exitCode = 1;
  });
}
