import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "../api/contracts.ts";
import { ROLE_PATHS } from "../auth/policies.ts";
export type NavigationKey =
  | "dashboard"
  | "subjects"
  | "enrollments"
  | "grades"
  | "inquiries"
  | "users"
  | "students"
  | "profile";
export interface NavigationItem {
  key: NavigationKey;
  label: string;
  segment: string;
  icon: LucideIcon;
  description: string;
}
const dashboard: NavigationItem = {
  key: "dashboard",
  label: "Dashboard",
  segment: "",
  icon: LayoutDashboard,
  description: "Overview of your academic workspace.",
};
const subjects: NavigationItem = {
  key: "subjects",
  label: "Subjects",
  segment: "subjects",
  icon: BookOpen,
  description: "Subject catalog and teaching assignments.",
};
const enrollments: NavigationItem = {
  key: "enrollments",
  label: "Enrollments",
  segment: "enrollments",
  icon: ClipboardList,
  description: "Student enrollment records and academic terms.",
};
const grades: NavigationItem = {
  key: "grades",
  label: "Grades",
  segment: "grades",
  icon: GraduationCap,
  description: "Read-only oversight of recorded academic grades.",
};
const inquiries: NavigationItem = {
  key: "inquiries",
  label: "Grade Inquiries",
  segment: "grade-inquiries",
  icon: MessageSquare,
  description: "Grade inquiry records within your permitted scope.",
};
const profile: NavigationItem = {
  key: "profile",
  label: "My Profile",
  segment: "profile",
  icon: UserRound,
  description: "Your verified SGMS account information.",
};
export const ROLE_NAVIGATION: Record<UserRole, readonly NavigationItem[]> = {
  Admin: [
    dashboard,
    subjects,
    enrollments,
    grades,
    inquiries,
    {
      key: "users",
      label: "User Management",
      segment: "users",
      icon: Users,
      description:
        "Account administration will be implemented in a later step.",
    },
    profile,
  ],
  "Department Head": [
    dashboard,
    subjects,
    enrollments,
    grades,
    inquiries,
    {
      key: "users",
      label: "Student & Faculty Directory",
      segment: "directory",
      icon: Users,
      description: "A limited read-only directory of Students and Faculty.",
    },
    profile,
  ],
  Faculty: [
    dashboard,
    {
      ...subjects,
      label: "My Subjects",
      description:
        "This view will be scoped to subjects assigned to your Faculty account.",
    },
    {
      key: "students",
      label: "My Students",
      segment: "students",
      icon: Users,
      description:
        "This view will use students enrolled in your assigned subjects.",
    },
    {
      ...grades,
      label: "Grade Management",
      description:
        "Grade entry and corrections for your assigned subjects will be implemented later.",
    },
    inquiries,
    profile,
  ],
  Student: [
    dashboard,
    {
      ...subjects,
      label: "My Subjects",
      description:
        "This view will derive your subjects from your own enrollment records.",
    },
    {
      ...grades,
      label: "My Grades",
      description: "This view will show only your own recorded grades.",
    },
    {
      ...inquiries,
      label: "My Grade Inquiries",
      description: "This view will show only your own grade inquiries.",
    },
    profile,
  ],
};
export const navigationPath = (role: UserRole, item: NavigationItem) =>
  `${ROLE_PATHS[role]}${item.segment ? `/${item.segment}` : ""}`;
export function currentNavigation(role: UserRole, pathname: string) {
  return ROLE_NAVIGATION[role].find(
    (item) => navigationPath(role, item) === pathname.replace(/\/$/, ""),
  );
}
export function profilePath(role: UserRole) {
  return navigationPath(
    role,
    ROLE_NAVIGATION[role].find((item) => item.key === "profile")!,
  );
}
export function userInitials(firstName: string, lastName: string) {
  return (
    [firstName, lastName]
      .map((value) => Array.from(value.trim())[0] ?? "")
      .join("")
      .toLocaleUpperCase() || "?"
  );
}
