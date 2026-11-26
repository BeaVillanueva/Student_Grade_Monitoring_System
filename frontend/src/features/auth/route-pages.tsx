import { Link } from "react-router";
import { useAuth } from "@/auth/auth-provider";
import { ROLE_PATHS } from "@/auth/policies";
import { Button } from "@/components/ui/button";
export function UnauthorizedPage() {
  const auth = useAuth();
  return (
    <section className="mx-auto max-w-xl py-10">
      <h1>Access denied</h1>
      <p className="mt-4 text-muted-foreground">
        Your current role does not have access to that workspace.
      </p>
      <Button asChild className="mt-6">
        <Link to={auth.user ? ROLE_PATHS[auth.user.role] : "/login"}>
          Go to my workspace
        </Link>
      </Button>
    </section>
  );
}
export function NotFoundPage() {
  const auth = useAuth();
  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <h1>Page not found</h1>
      <p className="mt-4 text-muted-foreground">
        The requested page is unavailable.
      </p>
      <Button asChild className="mt-6">
        <Link to={auth.user ? ROLE_PATHS[auth.user.role] : "/login"}>
          Return to SGMS
        </Link>
      </Button>
    </section>
  );
}
