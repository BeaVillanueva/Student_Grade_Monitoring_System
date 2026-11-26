import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/feedback/states";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthenticationGuard, HomeRedirect } from "@/auth/route-guards";
import { UnauthorizedPage, NotFoundPage } from "@/features/auth/route-pages";
import { ROLE_PATHS } from "@/auth/policies";
import { ROLE_NAVIGATION } from "./navigation";
import { ModulePlaceholder } from "@/features/workspace/module-placeholder";
import { ProfilePage } from "@/features/profile/profile-page";
import type { UserRole } from "@/api/contracts";
const LoginPage = lazy(() =>
  import("@/features/auth/login-page").then((module) => ({
    default: module.LoginPage,
  })),
);
const AdminPage = lazy(() => import("@/features/admin/admin-page"));
const DepartmentHeadPage = lazy(
  () => import("@/features/department-head/department-head-page"),
);
const FacultyPage = lazy(() => import("@/features/faculty/faculty-page"));
const StudentPage = lazy(() => import("@/features/student/student-page"));
const ApplicationLayout = lazy(() =>
  import("@/components/layout/application-layout").then((module) => ({
    default: module.ApplicationLayout,
  })),
);

const DesignSystemPreview = import.meta.env.DEV
  ? lazy(() => import("./design-system-preview"))
  : null;

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState label="Loading SGMS…" />}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          {Object.entries(ROLE_PATHS).map(([role, path]) => (
            <Route
              key={role}
              element={<AuthenticationGuard role={role as UserRole} />}
            >
              <Route path={path} element={<ApplicationLayout />}>
                {ROLE_NAVIGATION[role as UserRole].map((item) =>
                  item.segment ? (
                    <Route
                      key={item.key}
                      path={item.segment}
                      element={
                        item.key === "profile" ? (
                          <ProfilePage />
                        ) : role === "Admin" ? (
                          <AdminPage page={item.key} />
                        ) : role === "Department Head" ? (
                          <DepartmentHeadPage page={item.key} />
                        ) : role === "Faculty" ? (
                          <FacultyPage page={item.key} />
                        ) : role === "Student" ? (
                          <StudentPage page={item.key} />
                        ) : (
                          <ModulePlaceholder item={item} />
                        )
                      }
                    />
                  ) : (
                    <Route
                      key={item.key}
                      index
                      element={
                        role === "Admin" ? (
                          <AdminPage page={item.key} />
                        ) : role === "Department Head" ? (
                          <DepartmentHeadPage page={item.key} />
                        ) : role === "Faculty" ? (
                          <FacultyPage page={item.key} />
                        ) : role === "Student" ? (
                          <StudentPage page={item.key} />
                        ) : (
                          <ModulePlaceholder item={item} />
                        )
                      }
                    />
                  ),
                )}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          ))}
          <Route element={<AuthenticationGuard />}>
            <Route element={<ApplicationLayout />}>
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
            </Route>
          </Route>
          {DesignSystemPreview && (
            <Route
              path="/__dev/design-system"
              element={
                <Suspense
                  fallback={<LoadingState label="Loading component preview…" />}
                >
                  <DesignSystemPreview />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
