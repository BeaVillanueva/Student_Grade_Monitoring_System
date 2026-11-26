import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/auth-provider";
import { ROLE_PATHS } from "@/auth/policies";
import type { LoginRequest } from "@/api/contracts";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/display";
import { FormField } from "@/components/shared/form-field";

export function LoginPage() {
  const auth = useAuth();
  const [now, setNow] = useState(Date.now());
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  useEffect(() => {
    if (!auth.retryAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [auth.retryAt]);
  if (auth.status === "authenticated" && auth.user)
    return <Navigate to={ROLE_PATHS[auth.user.role]} replace />;
  const waiting = auth.status === "authenticating" || isSubmitting;
  const cooldown = Math.max(0, Math.ceil(((auth.retryAt ?? 0) - now) / 1000));
  const submit = handleSubmit(async (values) => {
    const pending = auth.login(values);
    resetField("password");
    await pending;
  });
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border bg-card shadow-panel md:min-h-[620px] md:grid-cols-[0.44fr_0.56fr]">
        <section
          aria-label="About SGMS"
          className="flex flex-col bg-primary px-6 py-6 text-white sm:px-10 md:py-10"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <GraduationCap className="size-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">SGMS</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-200">
                Academic management
              </p>
            </div>
          </div>
          <div className="my-auto hidden py-12 md:block">
            <h2 className="max-w-xs text-3xl font-semibold leading-tight tracking-tight">
              Academic progress,
              <br />
              made accessible.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-200">
              Manage academic records, monitor student grades, and stay
              connected through one secure platform.
            </p>
            <p className="mt-8 flex items-center gap-2 text-sm text-slate-100">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Secure academic access
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-200 md:mt-0">
            Student Grade Monitoring System
          </p>
        </section>
        <section
          className="flex min-w-0 flex-col justify-center px-6 py-9 sm:px-10 md:px-12 md:py-12"
          aria-labelledby="login-title"
        >
          <h1 id="login-title">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your SGMS account.
          </p>
          {(auth.status === "expired" || auth.error) && (
            <div className="mt-6 space-y-3">
              {auth.status === "expired" && (
                <Alert tone="warning" title="Session expired">
                  Please sign in again to continue.
                </Alert>
              )}
              {auth.error && (
                <Alert
                  tone="danger"
                  title={
                    auth.error.kind === "rate-limit"
                      ? "Please wait before signing in"
                      : "Unable to sign in"
                  }
                >
                  {auth.error.message}
                  {cooldown > 0 && (
                    <p className="mt-1">Try again in {cooldown} seconds.</p>
                  )}
                </Alert>
              )}
            </div>
          )}
          <form
            className="mt-5 space-y-5"
            onSubmit={submit}
            noValidate
            aria-label="Sign in"
            aria-busy={waiting}
          >
            <FormField
              label="Email address"
              error={errors.email?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  {...register("email")}
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Enter your email address"
                  disabled={waiting}
                />
              )}
            </FormField>
            <FormField
              label="Password"
              error={errors.password?.message}
              required
            >
              {(props) => (
                <PasswordInput
                  {...props}
                  {...register("password")}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={waiting}
                />
              )}
            </FormField>
            <Button
              type="submit"
              className="mt-1 w-full"
              disabled={waiting || cooldown > 0}
            >
              {waiting ? (
                <>
                  <LoaderCircle
                    className="motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  Signing in…
                </>
              ) : cooldown > 0 ? (
                `Try again in ${cooldown}s`
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <p className="mt-7 text-center text-sm leading-6 text-muted-foreground">
            Need assistance? Contact your administrator.
          </p>
          <p className="mt-9 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} SGMS. All rights reserved.
          </p>
        </section>
      </div>
    </main>
  );
}
