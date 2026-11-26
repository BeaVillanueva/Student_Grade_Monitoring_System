import type {
  LoginRequest,
  LoginResponse,
  SafeUser,
} from "../api/contracts.ts";
import type { AuthenticationAdapter } from "./integration.ts";
import { ApiError, normalizeApiError } from "../api/errors.ts";

export type AuthStatus =
  "unauthenticated" | "authenticating" | "authenticated" | "expired";
export interface AuthSnapshot {
  status: AuthStatus;
  user: SafeUser | null;
  error: ApiError | null;
  retryAt: number | null;
}
interface Dependencies {
  auth: {
    login(
      input: LoginRequest,
      options?: { signal?: AbortSignal },
    ): Promise<LoginResponse>;
    me(options?: { signal?: AbortSignal }): Promise<SafeUser>;
  };
  configureSession(adapter: AuthenticationAdapter | null): Promise<void>;
}
interface Clock {
  now(): number;
  schedule(callback: () => void, delay: number): () => void;
}
const realClock: Clock = {
  now: () => Date.now(),
  schedule: (callback, delay) => {
    const id = setTimeout(callback, delay);
    return () => clearTimeout(id);
  },
};

/** No persistence, token getter export, JWT-claim authorization, or credentials in snapshots. */
export function createAuthSession(
  dependencies: Dependencies,
  clock: Clock = realClock,
) {
  let snapshot: AuthSnapshot = {
    status: "unauthenticated",
    user: null,
    error: null,
    retryAt: null,
  };
  const listeners = new Set<() => void>();
  let token: string | null = null;
  let generation = 0;
  let expiresAt = 0;
  let cancelExpiry: (() => void) | undefined;
  let loginController: AbortController | undefined;
  let activeLogin: Promise<boolean> | null = null;
  let verification: Promise<void> | null = null;
  let lastVerifiedAt = 0;
  let lifecycle = Promise.resolve();
  function publish(next: AuthSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function configure(adapter: AuthenticationAdapter | null) {
    lifecycle = lifecycle
      .catch(() => {})
      .then(() => dependencies.configureSession(adapter));
    return lifecycle;
  }
  async function end(status: "unauthenticated" | "expired") {
    generation++;
    token = null;
    expiresAt = 0;
    cancelExpiry?.();
    cancelExpiry = undefined;
    loginController?.abort();
    loginController = undefined;
    activeLogin = null;
    verification = null;
    publish({ status, user: null, error: null, retryAt: null });
    await configure(null);
  }
  function adapterFor(ticket: number): AuthenticationAdapter {
    return {
      getAccessToken: () =>
        ticket === generation && clock.now() < expiresAt ? token : null,
      onProtectedUnauthorized: async () => {
        if (ticket === generation && snapshot.status === "authenticated")
          await end("expired");
      },
    };
  }
  function expireIfNeeded() {
    if (token && clock.now() >= expiresAt) {
      void end("expired");
      return true;
    }
    return snapshot.status === "expired";
  }
  function login(input: LoginRequest): Promise<boolean> {
    if (activeLogin) return activeLogin;
    if (snapshot.status === "authenticated") return Promise.resolve(false);
    if (snapshot.retryAt && clock.now() < snapshot.retryAt)
      return Promise.resolve(false);
    const ticket = ++generation;
    const startedAt = clock.now();
    const controller = new AbortController();
    loginController = controller;
    publish({
      status: "authenticating",
      user: null,
      error: null,
      retryAt: null,
    });
    const operation = (async () => {
      try {
        await configure(null);
        if (ticket !== generation) return false;
        const result = await dependencies.auth.login(input, {
          signal: controller.signal,
        });
        if (ticket !== generation) return false;
        token = result.accessToken;
        expiresAt = startedAt + result.expiresIn * 1000;
        if (clock.now() >= expiresAt) {
          await end("expired");
          return false;
        }
        await configure(adapterFor(ticket));
        if (ticket !== generation) return false;
        const user = await dependencies.auth.me({ signal: controller.signal });
        if (ticket !== generation) return false;
        if (
          user.userId !== result.user.userId ||
          user.accountStatus !== "Active"
        )
          throw new ApiError(
            "authentication",
            "Authentication failed. Please sign in again.",
            "login",
            401,
          );
        if (clock.now() >= expiresAt) {
          await end("expired");
          return false;
        }
        lastVerifiedAt = clock.now();
        cancelExpiry?.();
        cancelExpiry = clock.schedule(() => {
          if (ticket === generation) void end("expired");
        }, expiresAt - clock.now());
        publish({ status: "authenticated", user, error: null, retryAt: null });
        return true;
      } catch (error) {
        if (ticket !== generation) return false;
        token = null;
        expiresAt = 0;
        await configure(null);
        if (ticket !== generation) return false;
        const normalized = normalizeApiError(error, "login");
        const safe =
          normalized.kind === "authentication"
            ? new ApiError(
                "authentication",
                "Authentication failed. Check your credentials.",
                "login",
                401,
              )
            : normalized;
        publish({
          status: "unauthenticated",
          user: null,
          error: safe.kind === "cancelled" ? null : safe,
          retryAt:
            safe.kind === "rate-limit"
              ? clock.now() + (safe.retryAfterSeconds ?? 60) * 1000
              : null,
        });
        return false;
      } finally {
        if (ticket === generation) {
          activeLogin = null;
          loginController = undefined;
        }
      }
    })();
    activeLogin = operation;
    return operation;
  }
  function refreshIdentity(force = false): Promise<void> {
    if (expireIfNeeded() || snapshot.status !== "authenticated")
      return Promise.resolve();
    if (verification) return verification;
    if (!force && clock.now() - lastVerifiedAt < 5000) return Promise.resolve();
    const ticket = generation;
    const operation = (async () => {
      try {
        const user = await dependencies.auth.me();
        if (ticket !== generation) return;
        if (
          user.userId !== snapshot.user?.userId ||
          user.accountStatus !== "Active"
        ) {
          await end("expired");
          return;
        }
        if (user.role !== snapshot.user.role) {
          await configure(adapterFor(ticket));
          if (ticket !== generation) return;
        }
        lastVerifiedAt = clock.now();
        publish({ ...snapshot, user, error: null });
      } catch (error) {
        if (ticket !== generation) return;
        const safe = normalizeApiError(error, "protected");
        if (safe.status === 401) await end("expired");
        else if (safe.kind !== "cancelled")
          publish({ ...snapshot, error: safe });
      } finally {
        if (ticket === generation) verification = null;
      }
    })();
    verification = operation;
    return operation;
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    login,
    logout: () => end("unauthenticated"),
    refreshIdentity,
    expireIfNeeded,
  };
}
export type AuthSession = ReturnType<typeof createAuthSession>;
