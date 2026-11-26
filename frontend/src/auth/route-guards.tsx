import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { LoadingState } from "@/components/feedback/states";
import type { UserRole } from "../api/contracts.ts";
import { useAuth } from "./auth-provider";
import { ROLE_PATHS, routeAccess } from "./policies.ts";
export function AuthenticationGuard({ role }: { role?: UserRole }) {
  const auth = useAuth();
  const location = useLocation();
  useEffect(() => {
    auth.expireIfNeeded();
    void auth.refreshIdentity();
  }, [
    location.pathname,
    auth.status,
    auth.expireIfNeeded,
    auth.refreshIdentity,
  ]);
  const decision = routeAccess(auth, role);
  if (decision === "loading")
    return <LoadingState label="Verifying your account…" />;
  if (decision === "login") return <Navigate to="/login" replace />;
  if (decision === "unauthorized")
    return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
export function HomeRedirect() {
  const auth = useAuth();
  return (
    <Navigate
      to={
        auth.user && auth.status === "authenticated"
          ? ROLE_PATHS[auth.user.role]
          : "/login"
      }
      replace
    />
  );
}
