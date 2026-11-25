export const ROLES = [
  'Student',
  'Faculty',
  'Admin',
  'Department Head',
] as const;
export type UserRole = (typeof ROLES)[number];
export type AccountStatus = 'Active' | 'Inactive';
export type EnrollmentStatus = 'Enrolled' | 'Dropped' | 'Completed';
export type InquiryStatus = 'Pending' | 'Resolved';
export type GradeType = 'Midterm' | 'Final';

// MariaDB DECIMAL stores two places but rounds excess input. Validate before writes.
export function assertGradeScore(score: string): void {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(score) || Number(score) > 100) {
    throw new Error(
      'Grade score must be 0–100 with at most two decimal places.',
    );
  }
}
