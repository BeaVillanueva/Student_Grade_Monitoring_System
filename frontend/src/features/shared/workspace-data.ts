import type {
  Enrollment,
  Grade,
  GradeInquiry,
  Paginated,
  SafeUser,
  Subject,
  UserResponse,
} from "../../api/contracts.ts";
import { ApiError } from "../../api/errors.ts";
export interface WorkspaceRecords {
  users: UserResponse;
  subjects: Subject;
  enrollments: Enrollment;
  grades: Grade;
  inquiries: GradeInquiry;
}
export type WorkspaceResource = keyof WorkspaceRecords;
export interface CompleteDataset<T> {
  rows: T[];
  total: number;
  complete: true;
}
export function recordId(row: WorkspaceRecords[WorkspaceResource]): number {
  if ("userId" in row) return row.userId;
  if ("subjectCode" in row) return row.subjectId;
  if ("semester" in row) return row.enrollmentId;
  if ("score" in row) return row.gradeId;
  return row.inquiryId;
}
export async function collectComplete<T>(
  read: (page: number) => Promise<Paginated<T>>,
  identify: (row: T) => number,
  signal?: AbortSignal,
  maxPages = 100,
): Promise<CompleteDataset<T>> {
  const rows: T[] = [];
  const seen = new Set<number>();
  let total = 0;
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    if (signal?.aborted) throw new ApiError("cancelled", "Request cancelled.");
    const result = await read(page);
    if (page === 1) {
      total = result.total;
      pages = result.totalPages;
      if (pages > maxPages)
        throw new ApiError(
          "response",
          "The dataset exceeds the safe loading limit. Complete statistics or selection data are unavailable.",
        );
    }
    if (
      result.page !== page ||
      result.total !== total ||
      result.totalPages !== pages
    )
      throw new ApiError(
        "response",
        "Records changed while loading. Refresh to load a consistent dataset.",
      );
    for (const row of result.data) {
      const id = identify(row);
      if (seen.has(id))
        throw new ApiError(
          "response",
          "Records changed while loading. Refresh to load a consistent dataset.",
        );
      seen.add(id);
      rows.push(row);
    }
  }
  if (rows.length !== total)
    throw new ApiError(
      "response",
      "The complete dataset could not be loaded. Please refresh.",
    );
  return { rows, total, complete: true };
}
export const isSafeUser = (user: UserResponse): user is SafeUser =>
  "accountStatus" in user;
export const activeUsers = (
  users: UserResponse[],
  role: "Faculty" | "Student",
) =>
  users.filter(
    (user): user is SafeUser =>
      isSafeUser(user) && user.role === role && user.accountStatus === "Active",
  );
export const assignmentUsers = (
  users: UserResponse[],
  role: "Faculty" | "Student",
  directoryOnly = false,
): UserResponse[] =>
  directoryOnly
    ? users.filter((user) => user.role === role)
    : activeUsers(users, role);
export function dashboardMetrics(
  users: CompleteDataset<UserResponse>,
  enrollments: CompleteDataset<Enrollment>,
  inquiries: CompleteDataset<GradeInquiry>,
  subjectTotal: number,
  gradeTotal: number,
) {
  const enrollmentStates = { Enrolled: 0, Dropped: 0, Completed: 0 };
  const inquiryStates = { Pending: 0, Resolved: 0 };
  for (const row of enrollments.rows) enrollmentStates[row.status]++;
  for (const row of inquiries.rows) inquiryStates[row.status]++;
  return {
    students: users.rows.filter((user) => user.role === "Student").length,
    faculty: users.rows.filter((user) => user.role === "Faculty").length,
    subjects: subjectTotal,
    enrollments: enrollments.total,
    grades: gradeTotal,
    pending: inquiryStates.Pending,
    enrollmentStates,
    inquiryStates,
  };
}
export function userUpdatePayload(
  values: Record<string, unknown>,
  original: SafeUser,
) {
  const output: Record<string, unknown> = {};
  for (const key of [
    "firstName",
    "lastName",
    "email",
    "role",
    "accountStatus",
  ] as const) {
    const candidate =
      typeof values[key] === "string" ? values[key].trim() : values[key];
    const value =
      key === "email" && typeof candidate === "string"
        ? candidate.toLowerCase()
        : candidate;
    if (value !== undefined && value !== original[key]) output[key] = value;
  }
  if (typeof values.password === "string" && values.password !== "")
    output.password = values.password;
  return output;
}
export function enrollmentPayload(
  values: Record<string, unknown>,
  editing: boolean,
) {
  return {
    studentId: values.studentId,
    subjectId: values.subjectId,
    semester: values.semester,
    schoolYear: values.schoolYear,
    status: values.status,
    ...(!editing ? { dateEnrolled: values.dateEnrolled } : {}),
  };
}
