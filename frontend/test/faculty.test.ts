import { test } from "node:test";
import assert from "node:assert/strict";
import {
  facultyRecords,
  facultyMetrics,
  facultyStudent,
  gradeForm,
  assertFacultyMutation,
  type FacultyRecords,
} from "../src/features/faculty/faculty-data.ts";
import { ApiError } from "../src/api/errors.ts";
import { createQueryFoundation } from "../src/lib/query-client.ts";
import type { Grade, Enrollment, Subject } from "../src/api/contracts.ts";
const subject: Subject = {
  subjectId: 1,
  subjectCode: "OFFLINE",
  subjectName: "Offline subject",
  units: 3,
  facultyId: 20,
};
const enrollment: Enrollment = {
  enrollmentId: 1,
  studentId: 10,
  subjectId: 1,
  semester: "Term one",
  schoolYear: "2026-2027",
  dateEnrolled: "2026-08-17",
  status: "Enrolled",
};
const grade: Grade = {
  gradeId: 1,
  enrollmentId: 1,
  gradeType: "Midterm",
  score: "92.50",
  remarks: "Recorded",
  dateRecorded: "2026-01-01T00:00:00.000Z",
};
const data: FacultyRecords = {
  subjects: [subject],
  enrollments: [
    enrollment,
    { ...enrollment, enrollmentId: 2, status: "Completed" },
    { ...enrollment, enrollmentId: 3, studentId: 11, status: "Dropped" },
  ],
  grades: [grade, { ...grade, gradeId: 2, enrollmentId: 2 }],
  inquiries: [
    {
      inquiryId: 1,
      gradeId: 1,
      studentId: 10,
      status: "Pending",
      message: "Offline inquiry",
      dateSubmitted: grade.dateRecorded,
      resolvedBy: null,
      resolutionNote: null,
      dateResolved: null,
    },
  ],
};
test("Faculty filters the all-subject endpoint by verified owner and counts distinct Students, not enrollments", () => {
  const result = facultyRecords(
    20,
    [subject, { ...subject, subjectId: 99, facultyId: 21 }],
    data.enrollments,
    data.grades,
    data.inquiries,
  );
  assert.deepEqual(result.subjects, [subject]);
  const metrics = facultyMetrics(result);
  assert.equal(metrics.students, 2);
  assert.equal(metrics.enrollments, 3);
  assert.deepEqual(metrics.gradeTypes, { Midterm: 2, Final: 0 });
  assert.equal(metrics.pending, 1);
});
test("Unexpected unassigned enrollment, grade or inconsistent inquiry fails closed", () => {
  assert.throws(
    () => facultyRecords(21, [subject], data.enrollments, [], []),
    ApiError,
  );
  assert.throws(() => facultyRecords(20, [subject], [], [grade], []), ApiError);
  assert.throws(
    () =>
      facultyRecords(20, [subject], data.enrollments, data.grades, [
        { ...data.inquiries[0], studentId: 99 },
      ]),
    ApiError,
  );
});
test("Student names accept only matching limited assigned Student profiles", () => {
  const user = {
    userId: 10,
    firstName: "Offline",
    lastName: "Student",
    role: "Student",
  };
  assert.equal(facultyStudent(user, 10, data).userId, 10);
  for (const value of [
    { ...user, email: "private@example.test" },
    { ...user, role: "Admin" },
    { ...user, userId: 99 },
  ])
    assert.throws(() => facultyStudent(value, 10, data), ApiError);
  assert.throws(
    () => facultyStudent({ ...user, userId: 99 }, 99, data),
    ApiError,
  );
});
test("Encode Grade accepts both types, score boundaries, two decimals and nullable remarks", () => {
  const form = gradeForm(data, 1, null);
  for (const gradeType of ["Midterm", "Final"])
    for (const score of [0, 0.01, 92.5, 99.99, 100])
      assert(
        form.schema.safeParse({
          enrollmentId: 1,
          gradeType,
          score,
          remarks: "",
        }).success,
      );
  assert.equal(
    form.schema.parse({
      enrollmentId: 1,
      gradeType: "Final",
      score: 0,
      remarks: "",
    }).remarks,
    null,
  );
  for (const score of [-1, 100.01, 1.234, NaN])
    assert(
      !form.schema.safeParse({ enrollmentId: 1, gradeType: "Midterm", score })
        .success,
    );
  assert(
    !form.schema.safeParse({
      enrollmentId: 1,
      gradeType: "Midterm",
      score: 1,
      remarks: "x".repeat(31),
    }).success,
  );
});
test("Creation offers only Enrolled assignments, rejects invalid/foreign IDs, and leaves unknown account status to backend", () => {
  const form = gradeForm(data, 1, null);
  assert.deepEqual(
    form.fields[0].options?.map((row) => row.value),
    [1],
  );
  for (const enrollmentId of [0, 2, 3, 99])
    assert(
      !form.schema.safeParse({ enrollmentId, gradeType: "Final", score: 90 })
        .success,
    );
  assert.throws(
    () =>
      assertFacultyMutation(data, "create", null, {
        enrollmentId: 99,
        gradeType: "Final",
        score: 90,
      }),
    ApiError,
  );
  assert.throws(
    () =>
      assertFacultyMutation(data, "create", null, {
        enrollmentId: 2,
        gradeType: "Final",
        score: 90,
      }),
    ApiError,
  );
});
test("Historical grade updates remain valid and preserve enrollment/date identity and decimal defaults", () => {
  const existing = data.grades[1],
    form = gradeForm(data, 1, existing);
  assert.equal(form.defaults.score, "92.50");
  assert(
    !form.fields.some((row) =>
      ["enrollmentId", "dateRecorded"].includes(row.name),
    ),
  );
  assert.deepEqual(form.schema.parse({ ...form.defaults, score: 93.75 }), {
    score: 93.75,
  });
  assert.deepEqual(
    form.schema.parse({ ...form.defaults, gradeType: "Final", remarks: "" }),
    { gradeType: "Final", remarks: null },
  );
  assert(!form.schema.safeParse(form.defaults).success);
  assert.throws(() =>
    assertFacultyMutation(data, "update", 2, { score: 93, enrollmentId: 99 }),
  );
  assert.throws(() =>
    assertFacultyMutation(data, "update", 2, {
      dateRecorded: grade.dateRecorded,
    }),
  );
  assert.throws(
    () => assertFacultyMutation(data, "update", 99, { score: 90 }),
    ApiError,
  );
});
test("Only assigned Pending inquiries can be resolved, with a valid note and without grade fields", () => {
  const before = JSON.stringify(data.grades);
  assert.deepEqual(
    assertFacultyMutation(data, "resolve", 1, { resolutionNote: " Reviewed " }),
    { resolutionNote: "Reviewed" },
  );
  assert.throws(
    () =>
      assertFacultyMutation(data, "resolve", 99, {
        resolutionNote: "Reviewed",
      }),
    ApiError,
  );
  assert.throws(
    () =>
      assertFacultyMutation(
        { ...data, inquiries: [{ ...data.inquiries[0], status: "Resolved" }] },
        "resolve",
        1,
        { resolutionNote: "Reviewed" },
      ),
    ApiError,
  );
  assert.throws(() =>
    assertFacultyMutation(data, "resolve", 1, {
      resolutionNote: " ",
      score: 100,
    }),
  );
  assert.equal(JSON.stringify(data.grades), before);
});
test("Empty assigned datasets have zero counts and no creation choices", () => {
  const empty = facultyRecords(21, [subject], [], [], []);
  assert.equal(facultyMetrics(empty).students, 0);
  assert.equal(empty.subjects.length, 0);
  assert.deepEqual(gradeForm(empty, 1, null).fields[0].options, []);
});
test("Management-to-Faculty session transition removes previous private profiles and pending mutations", async (t) => {
  const foundation = createQueryFoundation();
  t.after(() => foundation.client.clear());
  await foundation.configureSession({
    getAccessToken: () => "offline-management",
  });
  const key = foundation.keys.list("users");
  foundation.client.setQueryData(key, { email: "private@example.test" });
  await foundation.configureSession({
    getAccessToken: () => "offline-faculty",
  });
  assert.equal(foundation.client.getQueryData(key), undefined);
  assert.equal(foundation.client.getMutationCache().getAll().length, 0);
  assert.notDeepEqual(key, foundation.keys.list("users"));
});
