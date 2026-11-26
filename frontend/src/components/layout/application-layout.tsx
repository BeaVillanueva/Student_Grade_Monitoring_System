import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/auth-provider";
import { ROLE_PATHS } from "@/auth/policies";
import {
  currentNavigation,
  profilePath,
  userInitials,
} from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Avatar } from "@/components/ui/display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipProvider,
} from "@/components/ui/overlays";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toast";
import { useDashboardRefresh } from "@/features/shared/use-dashboard-refresh";

export function ApplicationLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useDashboardRefresh(
    () => auth.refreshIdentity(),
    auth.status === "authenticated",
    false,
  );
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (desktop.matches) setDrawerOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  if (!auth.user) return null;
  const user = auth.user;
  const name = `${user.firstName} ${user.lastName}`;
  const current = currentNavigation(user.role, location.pathname);
  const title =
    current?.label ??
    (location.pathname === "/unauthorized"
      ? "Access denied"
      : "Page not found");
  const logout = () => {
    setDrawerOpen(false);
    void auth.logout();
  };
  return (
    <TooltipProvider delayDuration={250}>
      <ToastProvider>
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <a
            href="#main-content"
            className="sr-only z-[70] rounded-md bg-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to main content
          </a>
          <div
            className={cn(
              "min-h-svh lg:grid",
              collapsed
                ? "lg:grid-cols-[5rem_minmax(0,1fr)]"
                : "lg:grid-cols-[15rem_minmax(0,1fr)]",
            )}
          >
            <aside
              id="desktop-sidebar"
              aria-label="Workspace sidebar"
              className="sticky top-0 hidden h-svh min-h-0 lg:block"
            >
              <Sidebar
                role={user.role}
                collapsed={collapsed}
                onLogout={logout}
              />
            </aside>
            <div className="min-w-0">
              <header className="sticky top-0 z-20 flex min-h-20 min-w-0 items-center justify-between gap-2 border-b bg-card px-4 sm:gap-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:inline-flex"
                    aria-label={
                      collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                    aria-expanded={!collapsed}
                    aria-controls="desktop-sidebar"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? (
                      <PanelLeftOpen aria-hidden="true" />
                    ) : (
                      <PanelLeftClose aria-hidden="true" />
                    )}
                  </Button>
                  <Dialog.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      aria-label="Open navigation menu"
                    >
                      <Menu aria-hidden="true" />
                    </Button>
                  </Dialog.Trigger>
                  <nav
                    aria-label="Breadcrumb"
                    className="min-w-0 text-sm text-muted-foreground"
                  >
                    <ol className="flex min-w-0 items-center gap-2">
                      <li className="hidden sm:block">
                        <Link
                          to={ROLE_PATHS[user.role]}
                          className="rounded-sm hover:text-primary"
                        >
                          Workspace
                        </Link>
                      </li>
                      <li aria-hidden="true" className="hidden sm:block">
                        <ChevronRight className="size-3.5" />
                      </li>
                      <li
                        aria-current="page"
                        className="min-w-0 truncate text-foreground"
                        title={title}
                      >
                        {title}
                      </li>
                    </ol>
                  </nav>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-control shrink-0 items-center gap-2 rounded-md px-1 text-left sm:gap-3 sm:px-2"
                      aria-label={`Account menu for ${name}, ${user.role}`}
                    >
                      <Avatar
                        name={name}
                        initials={userInitials(user.firstName, user.lastName)}
                      />
                      <span className="hidden max-w-48 sm:block">
                        <span
                          title={name}
                          className="block truncate text-sm font-medium"
                        >
                          {name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {user.role}
                        </span>
                      </span>
                      <ChevronDown
                        className="hidden size-4 text-muted-foreground sm:block"
                        aria-hidden="true"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-w-[calc(100vw-2rem)]"
                  >
                    <DropdownMenuItem asChild>
                      <Link to={profilePath(user.role)}>
                        <UserRound className="size-4" aria-hidden="true" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={logout}>
                      <LogOut className="size-4" aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>
              <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
              >
                {auth.error && (
                  <Alert
                    tone="warning"
                    title="Account information could not be refreshed"
                  >
                    {auth.error.message}
                  </Alert>
                )}
                <Outlet />
              </main>
            </div>
          </div>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(19rem,calc(100vw-2rem))] overflow-hidden bg-primary text-white shadow-xl">
              <Dialog.Title className="sr-only">SGMS navigation</Dialog.Title>
              <Dialog.Description className="sr-only">
                Navigate your permitted workspace or sign out.
              </Dialog.Description>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-md text-white hover:bg-white/15 focus-visible:outline-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </Dialog.Close>
              <Sidebar
                role={user.role}
                mobile
                onNavigate={() => setDrawerOpen(false)}
                onLogout={logout}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </ToastProvider>
    </TooltipProvider>
  );
}
