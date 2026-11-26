export const USER_ROLES = [
  "Student",
  "Faculty",
  "Admin",
  "Department Head",
] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type AccountStatus = "Active" | "Inactive";
export type EnrollmentStatus = "Enrolled" | "Dropped" | "Completed";
export type InquiryStatus = "Pending" | "Resolved";
export type GradeType = "Midterm" | "Final";
/** Calendar date string YYYY-MM-DD; never convert through a local Date timezone. */
export type DateOnly = string;
export type Timestamp = string;
/** Backend DECIMAL(5,2), for example "92.50". Request scores are numbers. */
export type DecimalScore = string;
export interface DirectoryUser {
  userId: number;
  firstName: string;
  lastName: string;
  role: UserRole;
}
export interface SafeUser extends DirectoryUser {
  email: string;
  accountStatus: AccountStatus;
  createdAt: Timestamp;
}
export type UserResponse = SafeUser | DirectoryUser;
export interface Subject {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  units: number;
  facultyId: number;
}
export interface Enrollment {
  enrollmentId: number;
  studentId: number;
  subjectId: number;
  semester: string;
  schoolYear: string;
  dateEnrolled: DateOnly;
  status: EnrollmentStatus;
}
export interface Grade {
  gradeId: number;
  enrollmentId: number;
  gradeType: GradeType;
  score: DecimalScore;
  remarks: string | null;
  dateRecorded: Timestamp;
}
export interface GradeInquiry {
  inquiryId: number;
  gradeId: number;
  studentId: number;
  message: string;
  status: InquiryStatus;
  dateSubmitted: Timestamp;
  resolvedBy: number | null;
  resolutionNote: string | null;
  dateResolved: Timestamp | null;
}
export interface PageQuery {
  page?: number;
  pageSize?: number;
}
export interface StudentQuery extends PageQuery {
  studentId?: number;
}
export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: 1800;
  user: SafeUser;
}
export type CreateSubjectRequest = Pick<
  Subject,
  "subjectCode" | "subjectName" | "units" | "facultyId"
>;
export type ReplaceSubjectRequest = CreateSubjectRequest;
export type ReplaceEnrollmentRequest = Pick<
  Enrollment,
  "studentId" | "subjectId" | "semester" | "schoolYear" | "status"
>;
export type CreateEnrollmentRequest = ReplaceEnrollmentRequest &
  Pick<Enrollment, "dateEnrolled">;
export interface CreateGradeRequest {
  enrollmentId: number;
  gradeType: GradeType;
  score: number;
  remarks?: string | null;
}
export type UpdateGradeRequest = Partial<
  Omit<CreateGradeRequest, "enrollmentId">
>;
export interface CreateInquiryRequest {
  gradeId: number;
  message: string;
}
export interface ResolveInquiryRequest {
  resolutionNote: string;
}
export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  accountStatus: AccountStatus;
}
export type UpdateUserRequest = Partial<CreateUserRequest>;
export interface RequestOptions {
  signal?: AbortSignal;
}
