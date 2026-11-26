import { z } from "zod";
import type {
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  DirectoryUser,
} from "../../api/contracts.ts";
import {
  createGradeSchema,
  updateGradeSchema,
  resolveInquirySchema,
} from "../../lib/validation.ts";
import { limitedDirectorySchema } from "../../api/directory.ts";
import { ApiError } from "../../api/errors.ts";
import type { FieldDefinition } from "../shared/entity-form.tsx";
export interface FacultyRecords {
  subjects: Subject[];
  enrollments: Enrollment[];
  grades: Grade[];
  inquiries: GradeInquiry[];
}
const denied = () =>
  new ApiError(
    "forbidden",
    "This record is not available in your assigned workspace.",
    "protected",
    403,
  );
export function facultyRecords(
  facultyId: number,
  subjects: Subject[],
  enrollments: Enrollment[],
  grades: Grade[],
  inquiries: GradeInquiry[],
): FacultyRecords {
  const assigned = subjects.filter((row) => row.facultyId === facultyId);
  if (
    enrollments.some(
      (row) => !assigned.some((subject) => subject.subjectId === row.subjectId),
    ) ||
    grades.some(
      (row) =>
        !enrollments.some(
          (enrollment) => enrollment.enrollmentId === row.enrollmentId,
        ),
    ) ||
    inquiries.some(
      (row) =>
        !grades.some(
          (grade) =>
            grade.gradeId === row.gradeId &&
            enrollments.some(
              (enrollment) =>
                enrollment.enrollmentId === grade.enrollmentId &&
                enrollment.studentId === row.studentId,
            ),
        ),
    )
  )
    throw denied();
  return { subjects: assigned, enrollments, grades, inquiries };
}
export function facultyMetrics(data: FacultyRecords) {
  const gradeTypes = { Midterm: 0, Final: 0 },
    inquiryStates = { Pending: 0, Resolved: 0 };
  for (const grade of data.grades) gradeTypes[grade.gradeType]++;
  for (const inquiry of data.inquiries) inquiryStates[inquiry.status]++;
  return {
    subjects: data.subjects.length,
    students: new Set(data.enrollments.map((row) => row.studentId)).size,
    enrollments: data.enrollments.length,
    grades: data.grades.length,
    pending: inquiryStates.Pending,
    gradeTypes,
    inquiryStates,
  };
}
export function facultyStudent(
  value: unknown,
  id: number,
  data: FacultyRecords,
): DirectoryUser {
  const parsed = limitedDirectorySchema.safeParse(value);
  if (
    !data.enrollments.some((row) => row.studentId === id) ||
    !parsed.success ||
    parsed.data.userId !== id ||
    parsed.data.role !== "Student"
  )
    throw denied();
  return parsed.data;
}
export function gradeForm(
  data: FacultyRecords,
  subjectId: number,
  existing: Grade | null,
) {
  if (
    existing &&
    !data.grades.some(
      (row) =>
        row.gradeId === existing.gradeId &&
        row.enrollmentId === existing.enrollmentId,
    )
  )
    throw denied();
  const eligible = data.enrollments.filter(
    (row) => row.subjectId === subjectId && row.status === "Enrolled",
  );
  const fields: FieldDefinition[] = [
    ...(!existing
      ? [
          {
            name: "enrollmentId",
            label: "Student / enrollment",
            type: "select" as const,
            required: true,
            options: eligible.map((row) => ({
              value: row.enrollmentId,
              label: `Student #${row.studentId} · Enrollment #${row.enrollmentId} · ${row.semester} · ${row.schoolYear}`,
            })),
            description:
              "Enrolled records only. The backend also checks assignment, account eligibility and duplicate grade types.",
          },
        ]
      : []),
    {
      name: "gradeType",
      label: "Grade type",
      type: "select",
      required: true,
      options: [
        { value: "Midterm", label: "Midterm" },
        { value: "Final", label: "Final" },
      ],
    },
    {
      name: "score",
      label: "Score",
      type: "number",
      step: 0.01,
      required: true,
      description: "Allowed score: 0–100, up to two decimal places.",
    },
    {
      name: "remarks",
      label: "Remarks",
      description:
        "Optional, up to 30 characters. Clear the field to store null.",
    },
  ];
  const schema = existing
    ? z.preprocess((value) => {
        const row = value as Record<string, unknown>,
          result: Record<string, unknown> = {};
        if (row.gradeType !== existing.gradeType)
          result.gradeType = row.gradeType;
        if (Number(row.score) !== Number(existing.score))
          result.score = row.score;
        const remarks =
          typeof row.remarks === "string"
            ? row.remarks.trim() || null
            : row.remarks;
        if (remarks !== existing.remarks) result.remarks = remarks;
        return result;
      }, updateGradeSchema)
    : z.preprocess(
        (value) => {
          const row = value as Record<string, unknown>;
          return {
            ...row,
            remarks:
              typeof row.remarks === "string"
                ? row.remarks.trim() || null
                : row.remarks,
          };
        },
        createGradeSchema.refine(
          (value) =>
            eligible.some((row) => row.enrollmentId === value.enrollmentId),
          {
            path: ["enrollmentId"],
            message: "Choose an eligible assigned enrollment.",
          },
        ),
      );
  return {
    fields,
    schema,
    defaults: existing
      ? {
          gradeType: existing.gradeType,
          score: existing.score,
          remarks: existing.remarks ?? "",
        }
      : { enrollmentId: "", gradeType: "Midterm", score: "", remarks: "" },
  };
}
export function assertFacultyMutation(
  data: FacultyRecords,
  operation: "create" | "update" | "resolve",
  id: number | null,
  values: Record<string, unknown>,
) {
  if (operation === "create") {
    const input = createGradeSchema.parse(values);
    if (
      !data.enrollments.some(
        (row) =>
          row.enrollmentId === input.enrollmentId &&
          row.status === "Enrolled" &&
          data.subjects.some((subject) => subject.subjectId === row.subjectId),
      )
    )
      throw denied();
    return input;
  }
  if (operation === "update") {
    if (!data.grades.some((row) => row.gradeId === id)) throw denied();
    return updateGradeSchema.parse(values);
  }
  if (
    !data.inquiries.some(
      (row) => row.inquiryId === id && row.status === "Pending",
    )
  )
    throw denied();
  return resolveInquirySchema.parse(values);
}
