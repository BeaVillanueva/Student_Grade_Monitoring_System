import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { z } from "zod";
import * as v from "../src/lib/validation.ts";
const backend = createRequire(
  new URL("../../backend/package.json", import.meta.url),
);
backend("reflect-metadata");
const { plainToInstance } = backend("class-transformer");
const { validateSync } = backend("class-validator");
const subject = {
  subjectCode: " sample-01 ",
  subjectName: " Sample ",
  units: 3,
  facultyId: 1,
};
const enrollment = {
  studentId: 1,
  subjectId: 1,
  semester: " First ",
  schoolYear: "2026-2027",
  status: "Enrolled",
};
const grade = { enrollmentId: 1, gradeType: "Midterm", score: 92.5 };
const user = {
  firstName: " Sample ",
  lastName: " User ",
  email: "SAMPLE@example.test",
  password: "OfflineOnly42!",
  role: "Student",
  accountStatus: "Active",
};
type Contract = {
  name: string;
  schema: z.ZodType;
  module: string;
  dto: string;
  valid: object[];
  invalid: object[];
  patch?: boolean;
};
const cases: Contract[] = [
  {
    name: "login",
    schema: v.loginSchema,
    module: "auth/dto/login.dto",
    dto: "LoginDto",
    valid: [
      { email: " SAMPLE@example.test ", password: "x" },
      { email: "sample@example.test", password: " " },
      { email: "sample@example.test", password: "é".repeat(36) },
    ],
    invalid: [
      { email: "bad", password: "x" },
      { email: "sample@example.test", password: "" },
      { email: "sample@example.test", password: "é".repeat(37) },
      { email: "sample@example.test", password: 123 },
      { email: "sample@example.test", password: "x", role: "Admin" },
    ],
  },
  ...[
    ["subject creation", v.createSubjectSchema, "CreateSubjectDto"],
    ["subject full update", v.replaceSubjectSchema, "ReplaceSubjectDto"],
  ].map(
    ([name, schema, dto]) =>
      ({
        name,
        schema,
        module: "subjects/dto/subject.dto",
        dto,
        valid: [
          subject,
          { ...subject, subjectName: "😀".repeat(100), units: 2147483647 },
        ],
        invalid: [
          { ...subject, subjectCode: "@bad" },
          { ...subject, subjectCode: "A".repeat(21) },
          { ...subject, subjectName: "bad\nname" },
          { ...subject, units: "3" },
          { ...subject, units: 0 },
          { ...subject, facultyId: 0 },
          { ...subject, subjectId: 1 },
          {},
        ],
      }) as Contract,
  ),
  {
    name: "enrollment creation",
    schema: v.createEnrollmentSchema,
    module: "enrollments/dto/enrollment.dto",
    dto: "CreateEnrollmentDto",
    valid: [
      { ...enrollment, dateEnrolled: "2026-08-17" },
      { ...enrollment, dateEnrolled: "2024-02-29" },
    ],
    invalid: [
      { ...enrollment, dateEnrolled: "2026-02-29" },
      { ...enrollment, dateEnrolled: "2026-08-17T00:00:00Z" },
      { ...enrollment, dateEnrolled: "0999-01-01" },
      { ...enrollment, dateEnrolled: "2026-08-17", schoolYear: "2026-2028" },
      { ...enrollment, dateEnrolled: "2026-08-17", status: "Unknown" },
      enrollment,
    ],
  },
  {
    name: "enrollment full update",
    schema: v.replaceEnrollmentSchema,
    module: "enrollments/dto/enrollment.dto",
    dto: "ReplaceEnrollmentDto",
    valid: [enrollment, { ...enrollment, status: "Completed" }],
    invalid: [
      { ...enrollment, dateEnrolled: "2026-08-17" },
      { ...enrollment, studentId: null },
      { ...enrollment, semester: "" },
      { ...enrollment, schoolYear: "2026/2027" },
      {},
    ],
  },
  {
    name: "grade creation",
    schema: v.createGradeSchema,
    module: "grades/dto/grade.dto",
    dto: "CreateGradeDto",
    valid: [
      grade,
      { ...grade, score: 0, remarks: null },
      { ...grade, score: 100, remarks: "😀".repeat(30) },
    ],
    invalid: [
      { ...grade, score: "92.50" },
      { ...grade, score: 92.555 },
      { ...grade, score: 101 },
      { ...grade, score: -1 },
      { ...grade, gradeType: "Quiz" },
      { ...grade, remarks: "x".repeat(31) },
    ],
  },
  {
    name: "grade partial update",
    schema: v.updateGradeSchema,
    module: "grades/dto/grade.dto",
    dto: "UpdateGradeDto",
    patch: true,
    valid: [
      { score: 95 },
      { remarks: null },
      { gradeType: "Final", score: 100 },
    ],
    invalid: [
      {},
      { score: undefined },
      { enrollmentId: 1 },
      { dateRecorded: "2026-01-01" },
      { score: null },
      { gradeType: null },
      { score: 1.111 },
    ],
  },
  {
    name: "inquiry submission",
    schema: v.createInquirySchema,
    module: "grade-inquiries/dto/inquiry.dto",
    dto: "CreateInquiryDto",
    valid: [
      { gradeId: 1, message: " A question\nwith text " },
      { gradeId: 1, message: "😀".repeat(4000) },
    ],
    invalid: [
      { gradeId: 1, message: " " },
      { gradeId: 1, message: "bad\0text" },
      { gradeId: 1, message: "x".repeat(4001) },
      { gradeId: 1, message: "text", studentId: 1 },
      { gradeId: 0, message: "text" },
    ],
  },
  {
    name: "inquiry resolution",
    schema: v.resolveInquirySchema,
    module: "grade-inquiries/dto/inquiry.dto",
    dto: "ResolveInquiryDto",
    valid: [{ resolutionNote: " Verified " }],
    invalid: [
      { resolutionNote: "" },
      { resolutionNote: "text", status: "Resolved" },
      { resolutionNote: null },
    ],
  },
  {
    name: "user creation",
    schema: v.createUserSchema,
    module: "users/dto/user.dto",
    dto: "CreateUserDto",
    valid: [
      user,
      { ...user, password: "😀".repeat(8), role: "Department Head" },
    ],
    invalid: [
      { ...user, password: "short" },
      { ...user, password: "é".repeat(37) },
      { ...user, firstName: "\0" },
      { ...user, firstName: "x".repeat(51) },
      { ...user, role: "Head" },
      { ...user, accountStatus: "Disabled" },
      { ...user, passwordHash: "not-a-hash" },
    ],
  },
  {
    name: "user partial update",
    schema: v.updateUserSchema,
    module: "users/dto/user.dto",
    dto: "UpdateUserDto",
    patch: true,
    valid: [
      { firstName: " Updated " },
      { password: "OfflineOnly42!" },
      { role: "Faculty", accountStatus: "Inactive" },
    ],
    invalid: [
      {},
      { firstName: undefined },
      { firstName: null },
      { role: null },
      { password: null },
      { createdAt: "2026-01-01" },
      { email: "bad" },
    ],
  },
];
for (const c of cases)
  test(`Zod and backend DTO/service boundary agree: ${c.name} (${c.valid.length + c.invalid.length} cases)`, () => {
    const Dto = backend(`./dist/${c.module}.js`)[c.dto];
    for (const [inputs, expected] of [
      [c.valid, true],
      [c.invalid, false],
    ] as const)
      for (const input of inputs) {
        const instance = plainToInstance(Dto, input);
        const dtoValid =
          validateSync(instance, {
            whitelist: true,
            forbidNonWhitelisted: true,
          }).length === 0;
        // These two services additionally reject empty updates beyond their DTOs.
        const backendAccepts =
          dtoValid &&
          (!c.patch ||
            Object.values(input).some((value) => value !== undefined));
        const parsed = c.schema.safeParse(input);
        assert.equal(backendAccepts, expected, `${c.name}: backend boundary`);
        assert.equal(parsed.success, expected, `${c.name}: Zod boundary`);
        if (parsed.success)
          for (const [key, value] of Object.entries(parsed.data as object))
            assert.deepEqual(
              value,
              instance[key],
              `${c.name}: transformed field ${key}`,
            );
      }
  });
test("query/body validation intentionally avoids implicit numeric coercion and unsupported filters", () => {
  assert.deepEqual(v.pageQuerySchema.parse({}), { page: 1, pageSize: 10 });
  assert(
    v.studentQuerySchema.safeParse({ page: 1, pageSize: 100, studentId: 1 })
      .success,
  );
  for (const query of [
    { page: 0 },
    { pageSize: 101 },
    { search: "x" },
    { sort: "name" },
    { page: "1" },
  ])
    assert(!v.pageQuerySchema.safeParse(query).success);
  assert(!v.studentQuerySchema.safeParse({ studentId: null }).success);
});
test("grade score additionally matches the actual service decimal rule", () => {
  const { assertGradeScore } = backend("./dist/database/domain.js");
  for (const score of [0, 0.01, 92.5, 100, -1, 100.01, 1.001, 1e-7]) {
    let accepted = true;
    try {
      assertGradeScore(String(score));
    } catch {
      accepted = false;
    }
    assert.equal(v.gradeScoreSchema.safeParse(score).success, accepted);
  }
});
