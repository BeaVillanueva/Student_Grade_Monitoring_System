import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryObserver } from "@tanstack/react-query";
import {
  createQueryFoundation,
  shouldRetryQuery,
} from "../src/lib/query-client.ts";
import { createApiClient, type ApiTransport } from "../src/api/client.ts";
import { ApiError } from "../src/api/errors.ts";
const fake = (): ApiTransport => ({
  request: async <T>() =>
    ({ data: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }) as T,
  cancelPending() {},
  configureAuthentication() {},
});
test("query defaults are restrained and mutations never automatically retry", (t) => {
  const f = createQueryFoundation(fake());
  t.after(() => f.client.clear());
  const defaults = f.client.getDefaultOptions();
  assert.equal(defaults.queries?.staleTime, 60000);
  assert.equal(defaults.queries?.gcTime, 300000);
  assert.equal(defaults.queries?.refetchOnWindowFocus, false);
  assert.equal(defaults.queries?.refetchOnReconnect, false);
  assert.equal(defaults.queries?.refetchInterval, false);
  assert.equal(defaults.mutations?.retry, false);
  for (const kind of [
    "authentication",
    "forbidden",
    "validation",
    "not-found",
    "conflict",
    "rate-limit",
    "cancelled",
    "timeout",
    "response",
    "configuration",
  ] as const)
    assert.equal(shouldRetryQuery(0, new ApiError(kind, "Offline")), false);
  for (const kind of ["network", "server"] as const) {
    const error = new ApiError(
      kind,
      "Offline",
      "protected",
      kind === "server" ? 500 : undefined,
    );
    assert(shouldRetryQuery(0, error));
    assert(!shouldRetryQuery(1, error));
  }
  assert(
    !shouldRetryQuery(0, new ApiError("server", "Offline", "protected", 418)),
  );
});
test("identical requests deduplicate, normalize keys, and anonymous queries are disabled", async (t) => {
  let calls = 0;
  let resolve!: (value: unknown) => void;
  const transport = fake();
  transport.request = <T>() => {
    calls++;
    return new Promise<T>((done) => {
      resolve = (value) => done(value as T);
    });
  };
  const f = createQueryFoundation(transport);
  t.after(() => f.client.clear());
  const observer = new QueryObserver(f.client, f.queries.subjects());
  const unsubscribe = observer.subscribe(() => {});
  unsubscribe();
  assert.equal(calls, 0);
  await f.configureSession({ getAccessToken: () => "offline-placeholder" });
  assert.deepEqual(
    f.keys.list("subjects"),
    f.keys.list("subjects", { page: 1, pageSize: 10 }),
  );
  const first = f.client.fetchQuery(f.queries.subjects());
  const second = f.client.fetchQuery(f.queries.subjects());
  assert.equal(calls, 1);
  resolve({ data: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
  assert.deepEqual(await first, await second);
});
test("session switch cancels, clears private data, rotates keys, and rejects stale query definitions", async (t) => {
  let aborted = false;
  const transport = createApiClient({
    adapter: (config) =>
      new Promise((_resolve, reject) => {
        config.signal?.addEventListener?.("abort", () => {
          aborted = true;
          reject(new ApiError("cancelled", "Request cancelled."));
        });
      }),
  });
  const f = createQueryFoundation(transport);
  t.after(() => f.client.clear());
  await f.configureSession({ getAccessToken: () => "offline-old" });
  const old = f.queries.subjects();
  f.client.setQueryData(f.keys.resource("users"), {
    private: "offline fixture",
  });
  const pending = f.client.fetchQuery(old).catch(() => undefined);
  await f.configureSession({ getAccessToken: () => "offline-new" });
  await pending;
  assert(aborted);
  assert.equal(f.client.getQueryCache().getAll().length, 0);
  assert.notDeepEqual(old.queryKey, f.queries.subjects().queryKey);
  await assert.rejects(
    f.client.fetchQuery({ ...old, retry: false }),
    (e) => e instanceof ApiError && e.kind === "cancelled",
  );
  await f.clearPrivateCache();
  assert(f.getScope().startsWith("anonymous:"));
  assert.equal(f.client.getQueryCache().getAll().length, 0);
});
test("mutation invalidation is scoped and does not trigger a refetch burst", async (t) => {
  const f = createQueryFoundation(fake());
  t.after(() => f.client.clear());
  await f.configureSession({ getAccessToken: () => "offline" });
  const keys = [
    "subjects",
    "enrollments",
    "grades",
    "inquiries",
    "users",
  ] as const;
  for (const key of keys)
    f.client.setQueryData(f.keys.list(key), { offline: true });
  await f.invalidateAfterMutation("grades");
  assert.equal(
    f.client.getQueryState(f.keys.list("grades"))?.isInvalidated,
    true,
  );
  assert.equal(
    f.client.getQueryState(f.keys.list("inquiries"))?.isInvalidated,
    true,
  );
  assert.equal(
    f.client.getQueryState(f.keys.list("subjects"))?.isInvalidated,
    false,
  );
  const oldScope = f.getScope();
  await f.configureSession({ getAccessToken: () => "offline-new" });
  f.client.setQueryData(f.keys.list("grades"), {});
  await f.invalidateAfterMutation("grades", oldScope);
  assert.equal(
    f.client.getQueryState(f.keys.list("grades"))?.isInvalidated,
    false,
  );
  let attempts = 0;
  const options = f.mutation("subjects", async () => {
    attempts++;
    throw new ApiError("server", "Offline");
  });
  const mutation = f.client.getMutationCache().build(f.client, options);
  await assert.rejects(mutation.execute(undefined));
  assert.equal(attempts, 1);
});
