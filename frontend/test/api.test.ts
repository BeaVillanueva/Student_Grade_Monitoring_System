import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import { createApiClient } from "../src/api/client.ts";
import { ApiError, normalizeApiError } from "../src/api/errors.ts";
import { createServices } from "../src/api/services.ts";
import {
  gradeResponseSchema,
  userResponseSchema,
} from "../src/api/response-schemas.ts";

// These fixtures are confined to offline tests. No API/server/database is contacted.
const time = "2026-01-01T00:00:00.000Z";
const user = {
  userId: 1,
  firstName: "Offline",
  lastName: "Fixture",
  email: "offline@example.test",
  role: "Admin" as const,
  accountStatus: "Active" as const,
  createdAt: time,
};
const subject = {
  subjectId: 1,
  subjectCode: "OFFLINE",
  subjectName: "Offline contract fixture",
  units: 3,
  facultyId: 1,
};
const enrollment = {
  enrollmentId: 1,
  studentId: 1,
  subjectId: 1,
  semester: "Test",
  schoolYear: "2026-2027",
  dateEnrolled: "2026-08-17",
  status: "Enrolled" as const,
};
const grade = {
  gradeId: 1,
  enrollmentId: 1,
  gradeType: "Midterm" as const,
  score: "92.50",
  remarks: null,
  dateRecorded: time,
};
const inquiry = {
  inquiryId: 1,
  gradeId: 1,
  studentId: 1,
  message: "Offline contract fixture",
  status: "Pending" as const,
  dateSubmitted: time,
  resolvedBy: null,
  resolutionNote: null,
  dateResolved: null,
};
const login = {
  accessToken: "offline-placeholder",
  expiresIn: 1800,
  tokenType: "Bearer",
  user,
};
function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
) {
  return { config, data, status, statusText: "", headers: new AxiosHeaders() };
}
function httpFailure(status: number, config?: InternalAxiosRequestConfig) {
  return new AxiosError(
    "Private internal detail",
    "ERR_BAD_RESPONSE",
    config,
    undefined,
    {
      config: config!,
      data: { message: "Private internal detail" },
      status,
      statusText: "",
      headers: new AxiosHeaders({ "retry-after": "60" }),
    },
  );
}

test("all 22 service mappings match actual compiled backend controller metadata", async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    if (config.method === "delete") return response(config, "", 204);
    if (config.url === "/auth/login") return response(config, login);
    if (config.url === "/auth/me") return response(config, user);
    const item = config.url!.startsWith("/subjects")
      ? subject
      : config.url!.startsWith("/enrollments")
        ? enrollment
        : config.url!.startsWith("/grades")
          ? grade
          : config.url!.startsWith("/grade-inquiries")
            ? inquiry
            : user;
    return response(
      config,
      config.method === "get" && !/\/1$/.test(config.url!)
        ? { data: [item], page: 1, pageSize: 10, total: 1, totalPages: 1 }
        : item,
    );
  };
  const s = createServices(createApiClient({ adapter }));
  await s.auth.login({ email: user.email, password: "OfflineOnly42!" });
  await s.auth.me();
  const { subjectId: _sid, ...subjectInput } = subject;
  await s.subjects.list();
  await s.subjects.get(1);
  await s.subjects.create({
    subjectCode: " offline ",
    subjectName: subject.subjectName,
    units: 3,
    facultyId: 1,
  });
  await s.subjects.replace(1, subjectInput);
  assert.equal(await s.subjects.remove(1), undefined);
  const { enrollmentId: _eid, ...enrollmentInput } = enrollment;
  const { dateEnrolled: _date, ...enrollmentUpdate } = enrollmentInput;
  await s.enrollments.list({ studentId: 1 });
  await s.enrollments.get(1);
  await s.enrollments.create(enrollmentInput);
  await s.enrollments.replace(1, enrollmentUpdate);
  assert.equal(await s.enrollments.remove(1), undefined);
  await s.grades.list({ studentId: 1 });
  const result = await s.grades.create({
    enrollmentId: 1,
    gradeType: "Midterm",
    score: 92.5,
    remarks: null,
  });
  assert.equal(result.score, "92.50");
  await s.grades.update(1, { score: 95 });
  await s.inquiries.list();
  await s.inquiries.create({ gradeId: 1, message: "Offline contract fixture" });
  await s.inquiries.resolve(1, {
    resolutionNote: "Offline resolution fixture",
  });
  await s.users.list();
  await s.users.get(1);
  await s.users.create({
    firstName: "Offline",
    lastName: "Fixture",
    email: user.email,
    password: "OfflineOnly42!",
    role: "Student",
    accountStatus: "Active",
  });
  await s.users.update(1, { accountStatus: "Inactive" });
  assert.equal(calls.length, 22);
  const paths = calls
    .map(
      (c) =>
        `${c.method!.toUpperCase()} /api/v1${c.url!.replace(/\/1$/, "/:id")}`,
    )
    .sort();
  const backend = createRequire(
    new URL("../../backend/package.json", import.meta.url),
  );
  backend("reflect-metadata");
  const metadata = Reflect as typeof Reflect & {
    getMetadata: (key: string, target: object) => unknown;
  };
  const { RequestMethod } = backend("@nestjs/common");
  const { PATH_METADATA, METHOD_METADATA } = backend(
    "@nestjs/common/constants",
  );
  const expected: string[] = [];
  for (const [folder, name] of [
    ["auth", "Auth"],
    ["subjects", "Subjects"],
    ["enrollments", "Enrollments"],
    ["grades", "Grades"],
    ["grade-inquiries", "GradeInquiries"],
    ["users", "Users"],
  ]) {
    const controller = backend(`./dist/${folder}/${folder}.controller.js`)[
      `${name}Controller`
    ];
    const prefix = metadata.getMetadata(PATH_METADATA, controller) as string;
    for (const key of Object.getOwnPropertyNames(controller.prototype)) {
      if (key === "constructor") continue;
      const fn = controller.prototype[key];
      const method = metadata.getMetadata(METHOD_METADATA, fn) as
        number | undefined;
      if (method === undefined) continue;
      const suffix = metadata.getMetadata(PATH_METADATA, fn) as string;
      expected.push(
        `${RequestMethod[method]} /api/v1/${prefix}${suffix === "/" ? "" : `/${suffix}`}`,
      );
    }
  }
  assert.deepEqual(paths, expected.sort());
  for (const c of calls) {
    assert.equal(c.baseURL, "/api/v1");
    assert.equal(c.timeout, 15000);
    assert.equal(c.fetchOptions?.redirect, "error");
  }
  const createSubject = calls.find(
    (c) => c.method === "post" && c.url === "/subjects",
  )!;
  assert.equal(JSON.parse(createSubject.data).subjectCode, "OFFLINE");
  const createGrade = calls.find(
    (c) => c.method === "post" && c.url === "/grades",
  )!;
  assert.equal(typeof JSON.parse(createGrade.data).score, "number");
  const putEnrollment = calls.find(
    (c) => c.method === "put" && c.url === "/enrollments/1",
  )!;
  assert(!("dateEnrolled" in JSON.parse(putEnrollment.data)));
  assert.deepEqual(
    calls.find((c) => c.method === "get" && c.url === "/grades")!.params,
    { page: 1, pageSize: 10, studentId: 1 },
  );
});

test("authorization is scoped, public requests omit it, and unsafe paths never reach adapter", async () => {
  const seen: InternalAxiosRequestConfig[] = [];
  const client = createApiClient({
    adapter: async (config) => {
      seen.push(config);
      return response(config, {});
    },
  });
  client.configureAuthentication({
    getAccessToken: () => "offline-placeholder",
  });
  await client.request({ method: "GET", path: "/subjects" });
  await client.request({
    method: "POST",
    path: "/auth/login",
    access: "public",
    body: {},
  });
  assert.equal(
    seen[0].headers.get("Authorization"),
    "Bearer offline-placeholder",
  );
  assert.equal(seen[1].headers.get("Authorization"), undefined);
  for (const path of [
    "https://external.invalid/api/v1/subjects",
    "//external.invalid/subjects",
    "/../backend/.env",
    "/subjects/../users",
    "/subjects?x=1",
    "/subjects#x",
    "/subjects/%2e%2e/users",
    "/subjects\\users",
    "/subjects/1/",
  ]) {
    await assert.rejects(
      client.request({ method: "GET", path }),
      (e) => e instanceof ApiError && e.kind === "configuration",
    );
  }
  assert.equal(seen.length, 2);
});

for (const status of [400, 401, 403, 404, 409, 429, 500, 502, 418])
  test(`HTTP ${status} normalizes without internal details`, () => {
    const safe = normalizeApiError(httpFailure(status), "protected");
    assert.equal(safe.status, status);
    assert(!JSON.stringify(safe).includes("Private internal detail"));
    assert.equal(safe.stack, undefined);
    assert(!("config" in safe));
    assert(!("cause" in safe));
    if (status === 429) assert.equal(safe.retryAfterSeconds, 60);
  });
test("login and protected 401 use separate messages and hooks", async () => {
  let notified = 0;
  const client = createApiClient({
    adapter: async (config) => {
      throw httpFailure(401, config);
    },
  });
  client.configureAuthentication({
    getAccessToken: () => null,
    onProtectedUnauthorized: () => {
      notified++;
    },
  });
  await assert.rejects(
    client.request({ method: "POST", path: "/auth/login", access: "public" }),
    (e) =>
      e instanceof ApiError &&
      e.context === "login" &&
      e.message.includes("credentials"),
  );
  assert.equal(notified, 0);
  await assert.rejects(
    client.request({ method: "GET", path: "/auth/me" }),
    (e) =>
      e instanceof ApiError &&
      e.context === "protected" &&
      e.message.includes("expired"),
  );
  assert.equal(notified, 1);
});
test("network, timeout, cancellation and unknown exceptions are sanitized", () => {
  assert.equal(
    normalizeApiError(new AxiosError("private", "ERR_NETWORK"), "protected")
      .kind,
    "network",
  );
  for (const code of ["ETIMEDOUT", "ECONNABORTED"])
    assert.equal(
      normalizeApiError(new AxiosError("private", code), "protected").kind,
      "timeout",
    );
  assert.equal(
    normalizeApiError(new CanceledError("private"), "protected").kind,
    "cancelled",
  );
  assert.equal(
    normalizeApiError(new Error("private"), "protected").kind,
    "network",
  );
});
test("cancellation and session generation prevent stale results and stale unauthorized callbacks", async () => {
  let finish!: () => void;
  let notify = 0;
  const client = createApiClient({
    adapter: (config) =>
      new Promise((_resolve, reject) => {
        finish = () => reject(httpFailure(401, config));
      }),
  });
  client.configureAuthentication({
    getAccessToken: () => "offline-old",
    onProtectedUnauthorized: () => {
      notify++;
    },
  });
  const request = client.request({ method: "GET", path: "/auth/me" });
  client.configureAuthentication({
    getAccessToken: () => "offline-new",
    onProtectedUnauthorized: () => {
      notify++;
    },
  });
  finish();
  await assert.rejects(
    request,
    (e) => e instanceof ApiError && e.kind === "cancelled",
  );
  assert.equal(notify, 0);
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    client.request({ method: "GET", path: "/subjects", signal: abort.signal }),
    (e) => e instanceof ApiError && e.kind === "cancelled",
  );
});
test("malformed JSON/HTML responses and incorrect response contracts fail safely", async () => {
  const client = createApiClient({
    adapter: async (config) => response(config, "<html>not JSON</html>"),
  });
  await assert.rejects(
    client.request({ method: "GET", path: "/subjects" }),
    (e) => e instanceof ApiError && !e.message.includes("<html>"),
  );
  assert(!gradeResponseSchema.safeParse({ ...grade, score: 92.5 }).success);
  assert(
    !userResponseSchema.safeParse({
      ...user,
      passwordHash: "offline-not-a-hash",
    }).success,
  );
  assert(
    userResponseSchema.safeParse({
      userId: 1,
      firstName: "Offline",
      lastName: "Fixture",
      role: "Student",
    }).success,
  );
  const services = createServices(
    createApiClient({
      adapter: async (config) => response(config, { incorrect: true }),
    }),
  );
  await assert.rejects(
    services.subjects.get(1),
    (e) => e instanceof ApiError && e.kind === "response",
  );
});
test("unsupported query fields, readonly body fields, invalid IDs fail before transport", () => {
  let calls = 0;
  const s = createServices(
    createApiClient({
      adapter: async (config) => {
        calls++;
        return response(config, {});
      },
    }),
  );
  assert.throws(
    () => s.subjects.list({ search: "offline" } as never),
    ApiError,
  );
  assert.throws(() => s.enrollments.replace(1, enrollment as never), ApiError);
  assert.throws(() => s.subjects.get(0), ApiError);
  assert.equal(calls, 0);
});
