import type { Enrollment, Grade, Subject } from "../../api/contracts.ts";

export function distributionData(values: Record<string, number>) {
  const entries = Object.entries(values);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const valid =
    entries.every(([, count]) => Number.isSafeInteger(count) && count >= 0) &&
    Number.isSafeInteger(total);
  return {
    valid,
    total,
    entries: entries.map(([label, count]) => ({
      label,
      count,
      percentage: valid && total > 0 ? (count / total) * 100 : null,
    })),
  };
}

export function gradeComparisonRows(
  enrollments: Enrollment[],
  grades: Grade[],
  subjects: Subject[],
) {
  const names = new Map(
    subjects.map((subject) => [subject.subjectId, subject]),
  );
  const records = new Map(
    grades.map((grade) => [
      `${grade.enrollmentId}:${grade.gradeType}`,
      grade,
    ]),
  );
  return enrollments.map((enrollment) => {
    const subject = names.get(enrollment.subjectId);
    const score = (type: "Midterm" | "Final") => {
      const grade = records.get(`${enrollment.enrollmentId}:${type}`);
      return grade ? Number(grade.score) : null;
    };
    return {
      enrollmentId: enrollment.enrollmentId,
      subject: subject
        ? `${subject.subjectCode} · ${subject.subjectName}`
        : `Subject #${enrollment.subjectId}`,
      term: `${enrollment.semester} · ${enrollment.schoolYear}`,
      Midterm: score("Midterm"),
      Final: score("Final"),
    };
  });
}
