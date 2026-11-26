import type {
  Enrollment,
  Subject,
  Grade,
  GradeInquiry,
} from "../../api/contracts.ts";
import { createInquirySchema } from "../../lib/validation.ts";
import { ApiError } from "../../api/errors.ts";
export interface StudentRecords {
  subjects: Subject[];
  enrollments: Enrollment[];
  grades: Grade[];
  inquiries: GradeInquiry[];
}
export function studentRecords(
  studentId: number,
  subjects: Subject[],
  enrollments: Enrollment[],
  grades: Grade[],
  inquiries: GradeInquiry[],
): StudentRecords {
  if (
    enrollments.some((row) => row.studentId !== studentId) ||
    grades.some(
      (row) =>
        !enrollments.some(
          (enrollment) => enrollment.enrollmentId === row.enrollmentId,
        ),
    ) ||
    inquiries.some(
      (row) =>
        row.studentId !== studentId ||
        !grades.some((grade) => grade.gradeId === row.gradeId),
    )
  )
    throw new ApiError(
      "forbidden",
      "These academic records are not available in your Student workspace.",
      "protected",
      403,
    );
  return {
    subjects: subjects.filter((row) =>
      enrollments.some((enrollment) => enrollment.subjectId === row.subjectId),
    ),
    enrollments,
    grades,
    inquiries,
  };
}
export function studentMetrics(data: StudentRecords) {
  return {
    subjects: new Set(data.enrollments.map((row) => row.subjectId)).size,
    enrollments: data.enrollments.length,
    grades: data.grades.length,
    pending: data.inquiries.filter((row) => row.status === "Pending").length,
    midterm: data.grades.filter((row) => row.gradeType === "Midterm").length,
    final: data.grades.filter((row) => row.gradeType === "Final").length,
    resolved: data.inquiries.filter((row) => row.status === "Resolved").length,
  };
}
export function ownInquiry(data: StudentRecords, values: unknown) {
  const parsed = createInquirySchema.parse(values);
  if (!data.grades.some((row) => row.gradeId === parsed.gradeId))
    throw new ApiError(
      "forbidden",
      "Choose one of your existing grade records.",
      "protected",
      403,
    );
  return parsed;
}
