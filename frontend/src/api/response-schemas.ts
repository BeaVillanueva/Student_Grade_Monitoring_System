import { z } from "zod";
import { USER_ROLES } from "./contracts.ts";
import { dateOnlySchema, recordIdSchema } from "../lib/validation.ts";
export const directoryUserSchema = z.strictObject({
  userId: recordIdSchema,
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(USER_ROLES),
});
export const safeUserSchema = directoryUserSchema.extend({
  email: z.string(),
  accountStatus: z.enum(["Active", "Inactive"]),
  createdAt: z.iso.datetime(),
});
export const userResponseSchema = z.union([
  safeUserSchema,
  directoryUserSchema,
]);
export const subjectResponseSchema = z.strictObject({
  subjectId: recordIdSchema,
  subjectCode: z.string(),
  subjectName: z.string(),
  units: recordIdSchema,
  facultyId: recordIdSchema,
});
export const enrollmentResponseSchema = z.strictObject({
  enrollmentId: recordIdSchema,
  studentId: recordIdSchema,
  subjectId: recordIdSchema,
  semester: z.string(),
  schoolYear: z.string(),
  dateEnrolled: dateOnlySchema,
  status: z.enum(["Enrolled", "Dropped", "Completed"]),
});
export const gradeResponseSchema = z.strictObject({
  gradeId: recordIdSchema,
  enrollmentId: recordIdSchema,
  gradeType: z.enum(["Midterm", "Final"]),
  score: z
    .string()
    .regex(/^\d{1,3}\.\d{2}$/)
    .refine((value) => Number(value) <= 100),
  remarks: z.string().nullable(),
  dateRecorded: z.iso.datetime(),
});
export const inquiryResponseSchema = z
  .strictObject({
    inquiryId: recordIdSchema,
    gradeId: recordIdSchema,
    studentId: recordIdSchema,
    message: z.string(),
    status: z.enum(["Pending", "Resolved"]),
    dateSubmitted: z.iso.datetime(),
    resolvedBy: recordIdSchema.nullable(),
    resolutionNote: z.string().nullable(),
    dateResolved: z.iso.datetime().nullable(),
  })
  .refine((value) =>
    value.status === "Pending"
      ? value.resolvedBy === null &&
        value.resolutionNote === null &&
        value.dateResolved === null
      : value.resolvedBy !== null &&
        value.resolutionNote !== null &&
        value.dateResolved !== null,
  );
export const loginResponseSchema = z.strictObject({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.literal(1800),
  user: safeUserSchema,
});
export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.strictObject({
    data: z.array(item).max(100),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
