import type { UserRole } from "../api/contracts.ts";
import type { AuthSnapshot } from "./session.ts";
export const ROLE_PATHS: Record<UserRole, string> = {
  Admin: "/admin",
  "Department Head": "/department-head",
  Faculty: "/faculty",
  Student: "/student",
};
export type ManagementRole = "Admin" | "Department Head";
export function managementCapabilities(role: ManagementRole) {
  return {
    role,
    basePath: ROLE_PATHS[role],
    directoryOnly: role === "Department Head",
    canManageSubjects: true,
    canManageEnrollments: true,
    canManageUsers: role === "Admin",
    canResolveInquiries: role === "Admin",
  };
}
export function routeAccess(
  state: AuthSnapshot,
  role?: UserRole,
): "loading" | "login" | "unauthorized" | "allowed" {
  if (state.status === "authenticating") return "loading";
  if (state.status !== "authenticated" || !state.user) return "login";
  return role && state.user.role !== role ? "unauthorized" : "allowed";
}
