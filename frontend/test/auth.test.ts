import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthSession } from "../src/auth/session.ts";
import { ROLE_PATHS, routeAccess } from "../src/auth/policies.ts";
import { ApiError } from "../src/api/errors.ts";
import { createQueryFoundation } from "../src/lib/query-client.ts";
import type { AuthenticationAdapter } from "../src/auth/integration.ts";
import type { LoginResponse, SafeUser } from "../src/api/contracts.ts";
const user: SafeUser = {
  userId: 1,
  firstName: "Offline",
  lastName: "Fixture",
  email: "offline@example.test",
  role: "Admin",
  accountStatus: "Active",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const result: LoginResponse = {
  accessToken: "offline-placeholder",
  tokenType: "Bearer",
  expiresIn: 1800,
  user,
};
const credentials = {
  email: "offline@example.test",
  password: "OfflineOnly42!",
};
function harness() {
  let now = 1000;
  let timer: (() => void) | null = null;
  let cancelled = false;
  let adapter: AuthenticationAdapter | null = null;
  let loginCalls = 0;
  const configured: (AuthenticationAdapter | null)[] = [];
  const auth = {
    login: async (): Promise<LoginResponse> => {
      loginCalls++;
      return result;
    },
    me: async (): Promise<SafeUser> => user,
  };
  const session = createAuthSession(
    {
      auth,
      configureSession: async (value) => {
        adapter = value;
        configured.push(value);
      },
    },
    {
      now: () => now,
      schedule: (fn, delay) => {
        assert.equal(delay, 1800000);
        timer = fn;
        return () => {
          cancelled = true;
          timer = null;
        };
      },
    },
  );
  return {
    session,
    auth,
    configured,
    getAdapter: () => adapter,
    calls: () => loginCalls,
    cancelled: () => cancelled,
    advance: (ms: number) => {
      now += ms;
    },
    expire: () => {
      now += 1800000;
      timer?.();
    },
  };
}
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
test("authentication transitions through verification and exposes no token/password", async () => {
  const h = harness();
  const states: string[] = [];
  h.session.subscribe(() => states.push(h.session.getSnapshot().status));
  assert.equal(h.session.getSnapshot().status, "unauthenticated");
  assert(await h.session.login(credentials));
  assert.deepEqual(states, ["authenticating", "authenticated"]);
  assert.equal(h.session.getSnapshot().user?.role, "Admin");
  assert(!JSON.stringify(h.session.getSnapshot()).includes(result.accessToken));
  assert(
    !JSON.stringify(h.session.getSnapshot()).includes(credentials.password),
  );
  assert.equal(h.getAdapter()?.getAccessToken(), result.accessToken);
  await h.session.logout();
  assert.equal(h.getAdapter(), null);
  assert.equal(h.session.getSnapshot().user, null);
  assert(h.cancelled());
});
test("verified /me role wins over login response role", async () => {
  const h = harness();
  h.auth.me = async () => ({ ...user, role: "Faculty" });
  await h.session.login(credentials);
  assert.equal(h.session.getSnapshot().user?.role, "Faculty");
  assert.equal(ROLE_PATHS[h.session.getSnapshot().user!.role], "/faculty");
  await h.session.logout();
});
test("duplicate submissions share one login operation", async () => {
  const h = harness();
  const a = h.session.login(credentials);
  const b = h.session.login(credentials);
  assert.equal(a, b);
  assert(await a);
  assert.equal(h.calls(), 1);
  await h.session.logout();
});
test("failed public login does not enter expiration workflow or verify /me", async () => {
  const h = harness();
  let verified = false;
  h.auth.login = async () => {
    throw new ApiError(
      "authentication",
      "Authentication failed.",
      "login",
      401,
    );
  };
  h.auth.me = async () => {
    verified = true;
    return user;
  };
  assert.equal(await h.session.login(credentials), false);
  assert.equal(h.session.getSnapshot().status, "unauthenticated");
  assert.equal(h.session.getSnapshot().error?.context, "login");
  assert.equal(verified, false);
  assert.equal(h.getAdapter(), null);
});
test("verification failure or mismatched/inactive identity cannot grant access", async () => {
  for (const me of [
    async () => {
      throw new ApiError("authentication", "Offline", "protected", 401);
    },
    async () => ({ ...user, userId: 2 }),
    async () => ({ ...user, accountStatus: "Inactive" as const }),
  ]) {
    const h = harness();
    h.auth.me = me;
    assert.equal(await h.session.login(credentials), false);
    assert.equal(h.session.getSnapshot().user, null);
    assert.equal(h.getAdapter(), null);
    assert.equal(h.session.getSnapshot().status, "unauthenticated");
  }
});
test("offline clock expiration clears state and invalidates captured adapter", async () => {
  const h = harness();
  await h.session.login(credentials);
  const captured = h.getAdapter();
  h.expire();
  await flush();
  assert.equal(h.session.getSnapshot().status, "expired");
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(captured?.getAccessToken(), null);
  assert.equal(h.getAdapter(), null);
});
test("protected 401 expires session; stale adapter cannot expire a new session", async () => {
  const h = harness();
  await h.session.login(credentials);
  const old = h.getAdapter();
  await old?.onProtectedUnauthorized?.();
  assert.equal(h.session.getSnapshot().status, "expired");
  await h.session.login(credentials);
  await old?.onProtectedUnauthorized?.();
  assert.equal(h.session.getSnapshot().status, "authenticated");
  await h.session.logout();
});
test("role changes rotate private-cache integration and account deactivation expires session", async () => {
  const h = harness();
  await h.session.login(credentials);
  const count = h.configured.length;
  h.auth.me = async () => ({ ...user, role: "Department Head" });
  await h.session.refreshIdentity(true);
  assert.equal(h.session.getSnapshot().user?.role, "Department Head");
  assert.equal(h.configured.length, count + 1);
  h.auth.me = async () => ({ ...user, accountStatus: "Inactive" });
  await h.session.refreshIdentity(true);
  assert.equal(h.session.getSnapshot().status, "expired");
});
test("network check failure preserves session and reports a safe retryable message", async () => {
  const h = harness();
  await h.session.login(credentials);
  h.auth.me = async () => {
    throw new ApiError("network", "Unable to connect.");
  };
  await h.session.refreshIdentity(true);
  assert.equal(h.session.getSnapshot().status, "authenticated");
  assert.equal(h.session.getSnapshot().error?.kind, "network");
  await h.session.logout();
});
test("rate limit creates cooldown without retries or session-expiration behavior", async () => {
  const h = harness();
  let calls = 0;
  h.auth.login = async () => {
    calls++;
    throw new ApiError("rate-limit", "Please wait.", "login", 429, 60);
  };
  assert.equal(await h.session.login(credentials), false);
  assert.equal(h.session.getSnapshot().status, "unauthenticated");
  assert.equal(h.session.getSnapshot().retryAt, 61000);
  assert.equal(await h.session.login(credentials), false);
  assert.equal(calls, 1);
  h.advance(60001);
  await h.session.login(credentials);
  assert.equal(calls, 2);
});
test("late login response after logout never restores a session", async () => {
  const h = harness();
  let finish!: (value: LoginResponse) => void;
  h.auth.login = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const login = h.session.login(credentials);
  await flush();
  await h.session.logout();
  finish(result);
  assert.equal(await login, false);
  assert.equal(h.session.getSnapshot().status, "unauthenticated");
  assert.equal(h.getAdapter(), null);
});
test("late identity result cannot replace a newer session", async () => {
  const h = harness();
  await h.session.login(credentials);
  let finish!: (value: SafeUser) => void;
  h.auth.me = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const check = h.session.refreshIdentity(true);
  await h.session.logout();
  h.auth.me = async () => ({ ...user, role: "Student" });
  await h.session.login(credentials);
  finish({ ...user, role: "Faculty" });
  await check;
  assert.equal(h.session.getSnapshot().user?.role, "Student");
  await h.session.logout();
});
test("logout cancels actual query foundation and removes private query/mutation cache data", async (t) => {
  const f = createQueryFoundation();
  t.after(() => f.client.clear());
  const session = createAuthSession(
    {
      auth: { login: async () => result, me: async () => user },
      configureSession: f.configureSession,
    },
    { now: () => 1000, schedule: () => () => {} },
  );
  await session.login(credentials);
  f.client.setQueryData(f.keys.resource("users"), { offlinePrivate: true });
  await session.logout();
  assert.equal(f.client.getQueryCache().getAll().length, 0);
  assert.equal(f.client.getMutationCache().getAll().length, 0);
  assert(f.getScope().startsWith("anonymous:"));
});
test("protected routes and role destinations cover exactly the four backend roles", () => {
  const base = {
    status: "authenticated" as const,
    user,
    error: null,
    retryAt: null,
  };
  for (const role of [
    "Admin",
    "Department Head",
    "Faculty",
    "Student",
  ] as const) {
    assert.equal(
      routeAccess({ ...base, user: { ...user, role } }, role),
      "allowed",
    );
    for (const other of [
      "Admin",
      "Department Head",
      "Faculty",
      "Student",
    ] as const)
      if (other !== role)
        assert.equal(
          routeAccess({ ...base, user: { ...user, role } }, other),
          "unauthorized",
        );
    assert(ROLE_PATHS[role].startsWith("/"));
  }
  for (const status of ["unauthenticated", "expired"] as const)
    assert.equal(
      routeAccess({ ...base, status, user: null }, "Admin"),
      "login",
    );
  assert.equal(
    routeAccess({ ...base, status: "authenticating", user: null }),
    "loading",
  );
});
