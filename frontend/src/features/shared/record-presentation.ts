import type {
  Enrollment,
  Grade,
  GradeInquiry,
  Subject,
  UserResponse,
} from "../../api/contracts.ts";
import {
  isSafeUser,
  type WorkspaceRecords,
  type WorkspaceResource,
} from "./workspace-data.ts";
export interface ReferenceMaps {
  users: Map<number, UserResponse>;
  subjects: Map<number, Subject>;
  enrollments: Map<number, Enrollment>;
  grades: Map<number, Grade>;
}
export function userLabel(id: number, refs: ReferenceMaps) {
  const user = refs.users.get(id);
  return user
    ? `${user.firstName} ${user.lastName}`
    : `User #${id} — details unavailable`;
}
export function subjectLabel(id: number, refs: ReferenceMaps) {
  const subject = refs.subjects.get(id);
  return subject
    ? `${subject.subjectCode} — ${subject.subjectName}`
    : `Subject #${id} — details unavailable`;
}
export function timestamp(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
export function presentRecord(
  resource: WorkspaceResource,
  record: WorkspaceRecords[WorkspaceResource],
  refs: ReferenceMaps,
  directoryOnly = false,
): Record<string, string> {
  if (resource === "subjects") {
    const row = record as Subject;
    return {
      "Subject code": row.subjectCode,
      "Subject name": row.subjectName,
      Units: String(row.units),
      "Assigned Faculty": userLabel(row.facultyId, refs),
    };
  }
  if (resource === "enrollments") {
    const row = record as Enrollment;
    return {
      Student: userLabel(row.studentId, refs),
      Subject: subjectLabel(row.subjectId, refs),
      Semester: row.semester,
      "School year": row.schoolYear,
      "Enrollment date": row.dateEnrolled,
      Status: row.status,
    };
  }
  if (resource === "grades") {
    const row = record as Grade;
    const enrollment = refs.enrollments.get(row.enrollmentId);
    return {
      Student: enrollment
        ? userLabel(enrollment.studentId, refs)
        : `Enrollment #${row.enrollmentId} — student unavailable`,
      Subject: enrollment
        ? subjectLabel(enrollment.subjectId, refs)
        : `Enrollment #${row.enrollmentId} — subject unavailable`,
      "Grade type": row.gradeType,
      "Recorded score": row.score,
      Remarks: row.remarks ?? "—",
      "Date recorded": timestamp(row.dateRecorded),
    };
  }
  if (resource === "inquiries") {
    const row = record as GradeInquiry;
    const grade = refs.grades.get(row.gradeId);
    const enrollment = grade
      ? refs.enrollments.get(grade.enrollmentId)
      : undefined;
    return {
      Student: userLabel(row.studentId, refs),
      Grade: grade
        ? `${grade.gradeType} · ${grade.score}${enrollment ? ` · ${subjectLabel(enrollment.subjectId, refs)}` : ""}`
        : `Grade #${row.gradeId} — details unavailable`,
      Message: row.message,
      Status: row.status,
      Submitted: timestamp(row.dateSubmitted),
      "Resolved by": row.resolvedBy ? userLabel(row.resolvedBy, refs) : "—",
      "Resolution note": row.resolutionNote ?? "—",
      "Resolved on": timestamp(row.dateResolved),
    };
  }
  const row = record as UserResponse;
  if (directoryOnly)
    return {
      "User ID": String(row.userId),
      "First name": row.firstName,
      "Last name": row.lastName,
      Role: row.role,
    };
  return {
    Name: `${row.firstName} ${row.lastName}`,
    Role: row.role,
    ...(isSafeUser(row)
      ? {
          Email: row.email,
          Status: row.accountStatus,
          "Account created": timestamp(row.createdAt),
        }
      : {}),
  };
}
export const tableFields: Record<WorkspaceResource, string[]> = {
  subjects: ["Subject code", "Subject name", "Units", "Assigned Faculty"],
  enrollments: [
    "Student",
    "Subject",
    "Semester",
    "School year",
    "Enrollment date",
    "Status",
  ],
  grades: [
    "Student",
    "Subject",
    "Grade type",
    "Recorded score",
    "Remarks",
    "Date recorded",
  ],
  inquiries: [
    "Student",
    "Grade",
    "Message",
    "Status",
    "Submitted",
    "Resolution note",
  ],
  users: ["Name", "Email", "Role", "Status", "Account created"],
};
