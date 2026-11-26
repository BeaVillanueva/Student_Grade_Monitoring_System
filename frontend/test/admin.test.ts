import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeUsers,
  collectComplete,
  dashboardMetrics,
  enrollmentPayload,
  userUpdatePayload,
  type CompleteDataset,
} from "../src/features/shared/workspace-data.ts";
import { recordForm } from "../src/features/shared/record-fields.ts";
import {
  presentRecord,
  type ReferenceMaps,
} from "../src/features/shared/record-presentation.ts";
import { createReadBudget } from "../src/features/shared/read-budget.ts";
import { createWorkspaceQueries } from "../src/features/shared/workspace-queries.ts";
import { createQueryFoundation } from "../src/lib/query-client.ts";
import { createApiClient } from "../src/api/client.ts";
import { ApiError } from "../src/api/errors.ts";
import type {
  Enrollment,
  Grade,
  GradeInquiry,
  SafeUser,
  Subject,
  UserResponse,
} from "../src/api/contracts.ts";
const time = "2026-01-01T00:00:00.000Z";
const user: SafeUser = {
  userId: 1,
  firstName: "Offline",
  lastName: "Student",
  email: "offline@example.test",
  role: "Student",
  accountStatus: "Active",
  createdAt: time,
};
const faculty: SafeUser = { ...user, userId: 2, role: "Faculty" };
const subject: Subject = {
  subjectId: 1,
  subjectCode: "OFFLINE",
  subjectName: "Offline fixture",
  units: 3,
  facultyId: 2,
};
const enrollment: Enrollment = {
  enrollmentId: 1,
  studentId: 1,
  subjectId: 1,
  semester: "Test",
  schoolYear: "2026-2027",
  dateEnrolled: "2026-08-17",
  status: "Enrolled",
};
const grade: Grade = {
  gradeId: 1,
  enrollmentId: 1,
  gradeType: "Midterm",
  score: "92.50",
  remarks: null,
  dateRecorded: time,
};
const inquiry: GradeInquiry = {
  inquiryId: 1,
  gradeId: 1,
  studentId: 1,
  message: "Offline fixture",
  status: "Pending",
  dateSubmitted: time,
  resolvedBy: null,
  resolutionNote: null,
  dateResolved: null,
};
const complete = <T>(rows: T[]): CompleteDataset<T> => ({
  rows,
  total: rows.length,
  complete: true,
});
test("aggregate remount cancellation does not poison a shared canonical page", async (t) => {
  let finish!: () => void;
  let calls = 0;
  const transport = createApiClient({
    adapter: (config) => {
      calls++;
      return new Promise((resolve) => {
        finish = () =>
          resolve({
            config,
            data: {
              data: [subject],
              page: 1,
              pageSize: 100,
              total: 1,
              totalPages: 1,
            },
            status: 200,
            statusText: "",
            headers: {},
          });
      });
    },
  });
  const foundation = createQueryFoundation(transport);
  t.after(() => foundation.client.clear());
  await foundation.configureSession({ getAccessToken: () => "offline" });
  const repo = createWorkspaceQueries(foundation);
  const first = foundation.client
    .fetchQuery(repo.complete("subjects"))
    .catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await foundation.client.cancelQueries({
    queryKey: repo.complete("subjects").queryKey,
    exact: true,
  });
  const remount = foundation.client.fetchQuery(repo.complete("subjects"));
  finish();
  await first;
  assert.equal((await remount).total, 1);
  assert.equal(calls, 1);
});
test("complete pagination and dashboard counts include records beyond page one", async () => {
  const all = Array.from({ length: 201 }, (_, index) => ({
    ...user,
    userId: index + 1,
    role: index === 200 ? ("Faculty" as const) : ("Student" as const),
  }));
  const pages: number[] = [];
  const dataset = await collectComplete(
    async (page) => {
      pages.push(page);
      return {
        data: all.slice((page - 1) * 100, page * 100),
        page,
        pageSize: 100,
        total: 201,
        totalPages: 3,
      };
    },
    (row) => row.userId,
  );
  assert.deepEqual(pages, [1, 2, 3]);
  const metrics = dashboardMetrics(
    dataset,
    complete([
      enrollment,
      { ...enrollment, enrollmentId: 2, status: "Completed" },
      { ...enrollment, enrollmentId: 3, status: "Dropped" },
    ]),
    complete([inquiry, { ...inquiry, inquiryId: 2, status: "Resolved" }]),
    80,
    99,
  );
  assert.equal(metrics.students, 200);
  assert.equal(metrics.faculty, 1);
  assert.equal(metrics.subjects, 80);
  assert.equal(metrics.grades, 99);
  assert.equal(metrics.pending, 1);
  assert.deepEqual(metrics.enrollmentStates, {
    Enrolled: 1,
    Dropped: 1,
    Completed: 1,
  });
  assert.deepEqual(metrics.inquiryStates, { Pending: 1, Resolved: 1 });
});
test("empty, inconsistent, duplicate and excessive datasets never become partial global totals", async () => {
  const empty = await collectComplete(
    async (page) => ({
      data: [],
      page,
      pageSize: 100,
      total: 0,
      totalPages: 0,
    }),
    (row) => Number(row),
  );
  assert.equal(empty.total, 0);
  await assert.rejects(
    collectComplete(
      async (page) => ({
        data: [1],
        page,
        pageSize: 100,
        total: 2,
        totalPages: 2,
      }),
      (row) => row,
    ),
    ApiError,
  );
  await assert.rejects(
    collectComplete(
      async (page) => ({
        data: [page],
        page,
        pageSize: 100,
        total: page,
        totalPages: 2,
      }),
      (row) => row,
    ),
    ApiError,
  );
  await assert.rejects(
    collectComplete(
      async (page) => ({
        data: [],
        page,
        pageSize: 100,
        total: 10100,
        totalPages: 101,
      }),
      (row) => Number(row),
    ),
    ApiError,
  );
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    collectComplete(
      async () => {
        throw Error("Must not read");
      },
      (row) => Number(row),
      abort.signal,
    ),
    (error) => error instanceof ApiError && error.kind === "cancelled",
  );
});
test("complete datasets reuse canonical cached pages and invalidate after mutations", async (t) => {
  let calls = 0;
  const client = createApiClient({
    adapter: async (config) => {
      calls++;
      return {
        config,
        data: {
          data: [subject],
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
        },
        status: 200,
        statusText: "",
        headers: {},
      };
    },
  });
  const foundation = createQueryFoundation(client);
  t.after(() => foundation.client.clear());
  const repo = createWorkspaceQueries(foundation);
  await foundation.configureSession({ getAccessToken: () => "offline" });
  await foundation.client.fetchQuery(
    repo.page("subjects", { page: 1, pageSize: 100 }),
  );
  await foundation.client.fetchQuery(repo.complete("subjects"));
  assert.equal(calls, 1);
  await foundation.invalidateAfterMutation("subjects");
  await foundation.client.fetchQuery(repo.complete("subjects"));
  assert.equal(calls, 2);
});
test("read budget bounds concurrency and cancels queued reads", async () => {
  const budget = createReadBudget(3, 25, 2);
  let active = 0,
    maximum = 0;
  await Promise.all(
    Array.from({ length: 6 }, () =>
      budget.run(async () => {
        active++;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return true;
      }),
    ),
  );
  assert(maximum <= 2);
  const blocked = createReadBudget(1, 1000, 1);
  let finish!: () => void;
  const first = blocked.run(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await Promise.resolve();
  const abort = new AbortController();
  const second = blocked.run(async () => {
    throw Error("Queued read must not start");
  }, abort.signal);
  abort.abort();
  await assert.rejects(second, ApiError);
  finish();
  await first;
});
test("selectors accept only Active role accounts and preserve unchanged inactive enrollment ownership", () => {
  const inactive = { ...user, userId: 3, accountStatus: "Inactive" as const };
  const users: UserResponse[] = [
    user,
    faculty,
    inactive,
    { ...faculty, userId: 4, accountStatus: "Inactive" },
  ];
  assert.deepEqual(
    activeUsers(users, "Faculty").map((row) => row.userId),
    [2],
  );
  const form = recordForm("subjects", null, users, [subject]);
  assert(
    form.schema.safeParse({
      subjectCode: "TEST",
      subjectName: "Test",
      units: 3,
      facultyId: 2,
    }).success,
  );
  assert(
    !form.schema.safeParse({
      subjectCode: "TEST",
      subjectName: "Test",
      units: 3,
      facultyId: 4,
    }).success,
  );
  const existing = { ...enrollment, studentId: 3 };
  const edit = recordForm("enrollments", existing, users, [subject]);
  const values = enrollmentPayload({ ...existing }, true);
  assert(edit.schema.safeParse(values).success);
  assert(!("dateEnrolled" in values));
  assert(!edit.fields.some((field) => field.name === "dateEnrolled"));
  const create = recordForm("enrollments", null, users, [subject]);
  assert(!create.schema.safeParse({ ...existing }).success);
  assert(!edit.schema.safeParse({ ...values, studentId: 4 }).success);
});
test("user updates omit blank/unchanged passwords and immutable fields; creation still validates passwords", () => {
  const form = recordForm("users", user, [], []);
  assert(!form.schema.safeParse(form.defaults).success);
  const parsed = form.schema.parse({ ...form.defaults, firstName: "Updated" });
  assert.deepEqual(parsed, { firstName: "Updated" });
  assert.deepEqual(
    userUpdatePayload(
      { ...user, password: "", accountStatus: "Inactive" },
      user,
    ),
    { accountStatus: "Inactive" },
  );
  assert(
    !form.schema.safeParse({ ...form.defaults, password: "short" }).success,
  );
  const create = recordForm("users", null, [], []);
  assert(
    !create.schema.safeParse({
      ...create.defaults,
      firstName: "Test",
      lastName: "Test",
      email: user.email,
    }).success,
  );
});
test("record presentation joins permitted flat IDs and never invents missing relationships", () => {
  const refs: ReferenceMaps = {
    users: new Map([
      [1, user],
      [2, faculty],
    ]),
    subjects: new Map([[1, subject]]),
    enrollments: new Map([[1, enrollment]]),
    grades: new Map([[1, grade]]),
  };
  const fields = presentRecord("grades", grade, refs);
  assert.equal(fields["Recorded score"], "92.50");
  assert.equal(fields.Student, "Offline Student");
  assert(fields.Subject.includes("OFFLINE"));
  assert.equal(
    presentRecord("enrollments", enrollment, refs)["Enrollment date"],
    "2026-08-17",
  );
  assert(presentRecord("inquiries", inquiry, refs).Grade.includes("92.50"));
  assert.equal(presentRecord("inquiries", inquiry, refs)["Resolved by"], "—");
  const missing = presentRecord(
    "grades",
    { ...grade, enrollmentId: 999 },
    refs,
  );
  assert(missing.Student.includes("unavailable"));
  const safe = presentRecord("users", user, refs);
  assert(!("password" in safe));
  assert(!("passwordHash" in safe));
});
test("inquiry form accepts only resolution note and never constructs a grade mutation", () => {
  const form = recordForm("inquiries", null, [], []);
  assert.deepEqual(
    form.fields.map((field) => field.name),
    ["resolutionNote"],
  );
  assert(!form.schema.safeParse({ resolutionNote: " " }).success);
  assert.deepEqual(form.schema.parse({ resolutionNote: " Verified " }), {
    resolutionNote: "Verified",
  });
  assert(
    !form.schema.safeParse({ resolutionNote: "Verified", score: 100 }).success,
  );
});
