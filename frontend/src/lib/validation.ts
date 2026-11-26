import { z } from "zod";
import isEmail from "validator/lib/isEmail.js";
import isLength from "validator/lib/isLength.js";
import isByteLength from "validator/lib/isByteLength.js";
import isISO8601 from "validator/lib/isISO8601.js";
import { USER_ROLES } from "../api/contracts.ts";

const length = (value: string, min: number, max: number) =>
  isLength(value, { min, max });
const text = (max: number) =>
  z
    .string()
    .trim()
    .refine((value) => length(value, 1, max), `Enter 1–${max} characters.`)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      "Control characters are not allowed.",
    );
const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value) => isEmail(value) && length(value, 0, 100),
    "Enter a valid email up to 100 characters.",
  );
export const recordIdSchema = z.number().int().min(1).max(2147483647);
export const loginPasswordSchema = z
  .string()
  .refine(
    (value) => isByteLength(value, { min: 1, max: 72 }),
    "Enter a password of 1–72 UTF-8 bytes.",
  );
export const accountPasswordSchema = z
  .string()
  .refine(
    (value) =>
      length(value, 8, Number.MAX_SAFE_INTEGER) &&
      isByteLength(value, { min: 8, max: 72 }),
    "Use at least 8 characters and at most 72 UTF-8 bytes.",
  );
export const loginSchema = z.strictObject({
  email,
  password: loginPasswordSchema,
});
export const createSubjectSchema = z.strictObject({
  subjectCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => length(value, 1, 20) && /^[A-Z0-9][A-Z0-9 _-]*$/.test(value),
      "Use 1–20 permitted subject-code characters.",
    ),
  subjectName: text(100),
  units: recordIdSchema,
  facultyId: recordIdSchema,
});
export const replaceSubjectSchema = createSubjectSchema;
const schoolYear = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}$/)
  .refine(
    (value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
    "School-year values must be consecutive.",
  );
export const dateOnlySchema = z
  .string()
  .regex(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  .refine(
    (value) => isISO8601(value, { strict: true }),
    "Enter a real YYYY-MM-DD calendar date.",
  );
export const replaceEnrollmentSchema = z.strictObject({
  studentId: recordIdSchema,
  subjectId: recordIdSchema,
  semester: text(20),
  schoolYear,
  status: z.enum(["Enrolled", "Dropped", "Completed"]),
});
export const createEnrollmentSchema = replaceEnrollmentSchema.extend({
  dateEnrolled: dateOnlySchema,
});
const gradeType = z.enum(["Midterm", "Final"]);
export const gradeScoreSchema = z
  .number()
  .min(0)
  .max(100)
  .refine(
    (value) => /^\d{1,3}(\.\d{1,2})?$/.test(String(value)),
    "Use a score from 0–100 with up to two decimal places.",
  );
const remarks = z
  .string()
  .trim()
  .refine((value) => length(value, 0, 30), "Use up to 30 characters.")
  .nullable()
  .optional();
export const createGradeSchema = z.strictObject({
  enrollmentId: recordIdSchema,
  gradeType,
  score: gradeScoreSchema,
  remarks,
});
const nonempty = (value: Record<string, unknown>) =>
  Object.values(value).some((item) => item !== undefined);
export const updateGradeSchema = z
  .strictObject({
    gradeType: gradeType.optional(),
    score: gradeScoreSchema.optional(),
    remarks,
  })
  .refine(nonempty, "Provide at least one editable field.");
const inquiryText = z
  .string()
  .trim()
  .refine(
    (value) =>
      length(value, 1, 4000) &&
      isByteLength(value, { min: 1, max: 16000 }) &&
      !value.includes("\0"),
    "Enter 1–4000 characters without NUL.",
  );
export const createInquirySchema = z.strictObject({
  gradeId: recordIdSchema,
  message: inquiryText,
});
export const resolveInquirySchema = z.strictObject({
  resolutionNote: inquiryText,
});
export const createUserSchema = z.strictObject({
  firstName: text(50),
  lastName: text(50),
  email,
  password: accountPasswordSchema,
  role: z.enum(USER_ROLES),
  accountStatus: z.enum(["Active", "Inactive"]),
});
export const updateUserSchema = createUserSchema
  .partial()
  .refine(nonempty, "Provide at least one editable field.");
export const pageQuerySchema = z.strictObject({
  page: z.number().int().min(1).max(1000000).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});
export const studentQuerySchema = pageQuerySchema.extend({
  studentId: recordIdSchema.optional(),
});
