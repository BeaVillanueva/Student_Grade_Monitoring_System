import { test } from 'node:test';
import assert from 'node:assert/strict';
import { managementCapabilities } from '../src/auth/policies.ts';
import { createApiClient } from '../src/api/client.ts';
import { limitedDirectorySchema, createDirectoryService } from '../src/api/directory.ts';
import { createQueryFoundation } from '../src/lib/query-client.ts';
import { createWorkspaceQueries } from '../src/features/shared/workspace-queries.ts';
import { recordForm } from '../src/features/shared/record-fields.ts';
import { assignmentUsers, dashboardMetrics, enrollmentPayload } from '../src/features/shared/workspace-data.ts';
import { presentRecord, type ReferenceMaps } from '../src/features/shared/record-presentation.ts';
import { ApiError } from '../src/api/errors.ts';
import type { DirectoryUser, SafeUser } from '../src/api/contracts.ts';

const student: DirectoryUser = { userId: 1, firstName: 'Offline', lastName: 'Student', role: 'Student' };
const faculty: DirectoryUser = { ...student, userId: 2, role: 'Faculty' };
const full: SafeUser = { ...student, email: 'private@example.test', accountStatus: 'Inactive', createdAt: '2026-01-01T00:00:00.000Z' };
const subject = { subjectId: 1, subjectCode: 'OFFLINE', subjectName: 'Offline fixture', units: 3, facultyId: 2 };
const complete = <T>(rows: T[]) => ({ rows, total: rows.length, complete: true as const });
const refs: ReferenceMaps = { users: new Map([[1, student], [2, faculty]]), subjects: new Map([[1, subject]]), enrollments: new Map(), grades: new Map() };

test('Head capabilities preserve academic CRUD and deny user management and resolution', () => {
  const head = managementCapabilities('Department Head');
  assert(head.directoryOnly && head.canManageSubjects && head.canManageEnrollments);
  assert(!head.canManageUsers && !head.canResolveInquiries);
  assert.equal(head.basePath, '/department-head');
  const admin = managementCapabilities('Admin');
  assert(admin.canManageUsers && admin.canResolveInquiries && !admin.directoryOnly);
});

test('limited directory rejects full profiles, private fields and privileged account roles', () => {
  assert(limitedDirectorySchema.safeParse(student).success);
  assert(limitedDirectorySchema.safeParse(faculty).success);
  for (const row of [full, { ...student, role: 'Admin' }, { ...student, role: 'Department Head' }, { ...student, passwordHash: 'offline-marker' }])
    assert(!limitedDirectorySchema.safeParse(row).success);
});

test('directory service uses only permitted GET routes and strict response projection', async () => {
  const calls: string[] = [];
  const client = createApiClient({ adapter: async config => {
    calls.push(`${config.method} ${config.url}`);
    return { config, status: 200, statusText: '', headers: {}, data: config.url === '/users/1' ? student : { data: [student, faculty], page: 1, pageSize: 100, total: 2, totalPages: 1 } };
  } });
  client.configureAuthentication({ getAccessToken: () => 'offline' });
  const directory = createDirectoryService(client);
  assert.equal((await directory.list({ pageSize: 100 })).total, 2);
  assert.deepEqual(await directory.get(1), student);
  assert.deepEqual(calls, ['get /users', 'get /users/1']);
});

test('Head selectors validate directory membership without assuming account status; Admin stays Active-only', () => {
  assert.equal(assignmentUsers([student, faculty], 'Student', true).length, 1);
  assert.equal(assignmentUsers([full], 'Student').length, 0);
  const form = recordForm('subjects', null, [student, faculty], [subject], 'Department Head');
  assert(form.schema.safeParse({ subjectCode: 'TEST', subjectName: 'Test', units: 3, facultyId: 2 }).success);
  assert(!form.schema.safeParse({ subjectCode: 'TEST', subjectName: 'Test', units: 3, facultyId: 1 }).success);
  assert(!form.schema.safeParse({ subjectCode: 'TEST', subjectName: 'Test', units: 3, facultyId: 99 }).success);
  const enrollment = { enrollmentId: 1, studentId: 1, subjectId: 1, semester: 'Term one', schoolYear: '2026-2027', dateEnrolled: '2026-08-17', status: 'Enrolled' as const };
  const edit = recordForm('enrollments', enrollment, [student, faculty], [subject], 'Department Head');
  assert(edit.schema.safeParse(enrollmentPayload(enrollment, true)).success);
  assert(!edit.fields.some(field => field.name === 'dateEnrolled'));
});

test('Head cannot construct user or inquiry mutation forms', () => {
  for (const resource of ['users', 'inquiries'] as const)
    assert.throws(() => recordForm(resource, null, [student], [], 'Department Head'), (error: unknown) => error instanceof ApiError && error.kind === 'forbidden');
});

test('Head presentation exposes only four directory fields and keeps inaccessible resolver IDs', () => {
  assert.deepEqual(Object.keys(presentRecord('users', full, refs, true)), ['User ID', 'First name', 'Last name', 'Role']);
  assert(!JSON.stringify(presentRecord('users', full, refs, true)).includes(full.email));
  const inquiry = { inquiryId: 1, gradeId: 99, studentId: 1, message: 'Offline inquiry', status: 'Resolved' as const, dateSubmitted: '2026-01-01T00:00:00.000Z', resolvedBy: 50, resolutionNote: 'Reviewed', dateResolved: '2026-01-02T00:00:00.000Z' };
  assert.equal(presentRecord('inquiries', inquiry, refs, true)['Resolved by'], 'User #50 — details unavailable');
});

test('directory dashboard totals count permitted entries without requiring status fields', () => {
  const result = dashboardMetrics(complete([student, faculty]), complete([]), complete([]), 2, 3);
  assert.equal(result.students, 1); assert.equal(result.faculty, 1);
  assert.equal(result.pending, 0); assert.equal(result.grades, 3);
});

test('Admin-to-Head session changes clear full profiles and scope directory cache; unexpected full responses never enter it', async t => {
  let head = false, leak = false;
  const transport = createApiClient({ adapter: async config => ({ config, status: 200, statusText: '', headers: {}, data: { data: [head && !leak ? student : full], page: 1, pageSize: 100, total: 1, totalPages: 1 } }) });
  const foundation = createQueryFoundation(transport);
  t.after(() => foundation.client.clear());
  await foundation.configureSession({ getAccessToken: () => 'offline-admin' });
  const admin = createWorkspaceQueries(foundation);
  await foundation.client.fetchQuery(admin.complete('users'));
  const oldKey = admin.complete('users').queryKey;
  assert(JSON.stringify(foundation.client.getQueryData(oldKey)).includes(full.email));
  head = true;
  await foundation.configureSession({ getAccessToken: () => 'offline-head' });
  assert.equal(foundation.client.getQueryData(oldKey), undefined);
  const directory = createWorkspaceQueries(foundation, undefined, true);
  const result = await foundation.client.fetchQuery(directory.complete('users'));
  assert.deepEqual(result.rows, [student]);
  assert(!JSON.stringify(foundation.client.getQueryCache().getAll().map(q => q.state.data)).includes(full.email));
  leak = true;
  await foundation.configureSession({ getAccessToken: () => 'offline-head-next' });
  await assert.rejects(foundation.client.fetchQuery(directory.complete('users')), ApiError);
  assert(foundation.client.getQueryCache().getAll().every(q => q.state.data === undefined));
});
