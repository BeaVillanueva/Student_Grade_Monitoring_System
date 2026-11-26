import { Link, NavLink } from "react-router";
import { GraduationCap, LogOut } from "lucide-react";
import type { UserRole } from "@/api/contracts";
import { ROLE_PATHS } from "@/auth/policies";
import {
  ROLE_NAVIGATION,
  navigationPath,
  type NavigationItem,
} from "@/app/navigation";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";
export function Sidebar({
  role,
  collapsed = false,
  onNavigate,
  onLogout,
  mobile = false,
}: {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  mobile?: boolean;
}) {
  function itemLink(item: NavigationItem) {
    const Icon = item.icon;
    const link = (
      <NavLink
        to={navigationPath(role, item)}
        end
        onClick={onNavigate}
        aria-label={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            "flex min-h-control min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/10 focus-visible:outline-white",
            collapsed && "justify-center px-2",
            isActive && "bg-white/15 text-white",
          )
        }
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span className={collapsed ? "sr-only" : "min-w-0"}>{item.label}</span>
      </NavLink>
    );
    return (
      <li key={item.key}>
        {collapsed ? <Tooltip content={item.label}>{link}</Tooltip> : link}
      </li>
    );
  }
  const signOut = (
    <button
      type="button"
      onClick={onLogout}
      aria-label={collapsed ? "Sign out" : undefined}
      className={cn(
        "flex min-h-control w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/10 focus-visible:outline-white",
        collapsed && "justify-center px-2",
      )}
    >
      <LogOut className="size-5 shrink-0" aria-hidden="true" />
      <span className={collapsed ? "sr-only" : ""}>Sign out</span>
    </button>
  );
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-primary px-3 py-5 text-white",
        mobile && "pt-6",
      )}
    >
      <Link
        to={ROLE_PATHS[role]}
        onClick={onNavigate}
        aria-label="SGMS dashboard"
        className={cn(
          "mx-1 flex min-h-control items-center gap-3 rounded-md px-2 focus-visible:outline-white",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <GraduationCap className="size-6" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span>
            <span className="block text-xl font-bold tracking-tight">SGMS</span>
            <span className="block text-[10px] uppercase tracking-wide text-slate-200">
              Academic portal
            </span>
          </span>
        )}
      </Link>
      <div className="mx-2 my-5 border-t border-white/20" />
      <nav
        aria-label={mobile ? "Mobile primary navigation" : "Primary navigation"}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
            Workspace
          </p>
        )}
        <ul className="space-y-1">
          {ROLE_NAVIGATION[role]
            .filter((item) => item.key !== "profile")
            .map(itemLink)}
        </ul>
        <div className="mt-8">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
              Account
            </p>
          )}
          <ul>
            {ROLE_NAVIGATION[role]
              .filter((item) => item.key === "profile")
              .map(itemLink)}
          </ul>
        </div>
      </nav>
      <div className="mt-4 border-t border-white/20 pt-3">
        {collapsed ? <Tooltip content="Sign out">{signOut}</Tooltip> : signOut}
      </div>
    </div>
  );
}
