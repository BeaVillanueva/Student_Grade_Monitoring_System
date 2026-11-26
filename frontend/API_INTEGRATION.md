# API foundation - Step 14.4

This is the Step 14.4 foundation record. Step 14.5 subsequently implements the
memory-only session and login flow described in [authentication](AUTHENTICATION.md).
Its development preview is now at `/__dev/design-system`, separate from `/login`.

No login page, session workflow, dashboard, or runtime mock data is implemented.
The development-only design-system preview remains intact. Mounting AppProviders
creates a memory-only QueryClient; it does not initiate API requests.

## Architecture

- `src/api/client.ts`: private Axios instance, relative `/api/v1`, 15-second timeout,
  JSON handling, fetch adapter, cookies omitted, redirects rejected, AbortSignal
  cancellation, and generation checks that discard stale session responses.
- Only canonical SGMS paths are accepted. External URLs, protocol-relative URLs,
  encoded paths, traversal, query strings inside paths, and fragments are rejected
  before token lookup or network dispatch. Callers cannot override the instance's
  base URL, adapter, headers, or fetch options through service request options.
- `src/auth/integration.ts`: future AuthenticationAdapter interface. Tokens are
  supplied on demand from a future memory-only session; no storage is accessed.
- Public login never receives Authorization. Only protected SGMS requests may
  receive it. Protected 401 may notify the configured adapter; login 401 does not.
- `src/api/errors.ts`: ApiError contains only safe kind/message/status/context and
  bounded numeric Retry-After seconds. No raw Axios config, error cause, headers,
  payload, or stack is retained. Display its message; never log request bodies.
- `src/api/contracts.ts` and `response-schemas.ts`: exact flat records and runtime
  shape checks. SafeUser and DirectoryUser remain distinct. Unexpected additional
  response fields are rejected rather than displayed. No nested relations invented.
- `src/lib/validation.ts`: strict Zod request schemas, Unicode-aware string/byte
  validation using the same validator version as backend class-validator, explicit
  body numbers, canonical grade decimals, date-only enrollment dates, and separate
  login versus account-password requirements. Validated data is submitted; response
  decimal strings remain strings. Backend validation and academic rules still apply.

## Service coverage

Every service accepts an optional `{ signal }`. DELETE returns Promise<void> and
the transport short-circuits HTTP 204 before body validation. No requests execute
merely by importing these modules.

| Module | Functions and method/path after /api/v1 |
|---|---|
| auth.ts | login POST /auth/login; me GET /auth/me |
| subjects.ts | list GET /subjects; create POST /subjects; get GET /subjects/:id; replace PUT /subjects/:id; remove DELETE /subjects/:id |
| enrollments.ts | list GET /enrollments; create POST /enrollments; get GET /enrollments/:id; replace PUT /enrollments/:id; remove DELETE /enrollments/:id |
| grades.ts | list GET /grades; create POST /grades; update PATCH /grades/:id |
| inquiries.ts | list GET /grade-inquiries; create POST /grade-inquiries; resolve PATCH /grade-inquiries/:id |
| users.ts | list GET /users; create POST /users; get GET /users/:id; update PATCH /users/:id |

Total: 22 method/path pairs. Services enforce page/pageSize (defaults 1/10, size
maximum 100); academic lists additionally accept studentId. No server search,
sorting, or other filters are assumed. Query callers supply numeric values; URL
serialization turns them into query strings. Null/blank query values are rejected
instead of relying on DTO optional-value edge behavior.

Subject PUT submits all four editable fields. Enrollment PUT submits all five
editable fields and excludes dateEnrolled. Grade/User PATCH requires a nonempty
editable update; remarks may be null, other editable fields may not. Score requests
are numbers 0-100 with at most two decimal places; responses remain decimal strings.
Inquiry ownership and resolution metadata are server-controlled. Business rules
requiring database checks remain server-authoritative; the client cannot predict
every generic 400/409 cause.

## Query and future session integration

`query-client.ts` exposes queryFoundation, scoped key factories, query definitions,
mutation options, configureSession, clearPrivateCache, and invalidation. These are
interfaces for Step 14.5, not a completed authentication/session implementation.

- Keys include an opaque in-memory session generation; no token/email is in a key.
- Queries are disabled until a configured adapter supplies a token. Identical query
  keys deduplicate requests. Page defaults normalize equivalent keys.
- Stale time 60 seconds; inactive-cache retention five minutes. No polling,
  window-focus refetching, reconnect refetching, persistence, or global fan-out.
- GET queries retry at most once, after one second, only for network errors or
  HTTP 5xx. Validation, 401, 403, 404, 409, 429, timeout, cancellation, response
  contract, and configuration errors do not retry. Mutations never retry.
- Successful mutation options mark affected resource keys stale without immediate
  refetch bursts. A later screen can explicitly refresh its visible query; stale
  queries otherwise refetch on their next mount. Related academic keys are included;
  user changes also invalidate identity and academic projections.
- Future login/account changes must await configureSession(adapter) before querying.
  It rotates the scope, aborts transport requests, cancels queries, and clears query
  and mutation caches. Call clearPrivateCache on future logout/invalid session.
- Old query/mutation definitions and old unauthorized responses cannot act on a new
  session generation. Session adapters should make unauthorized notifications
  idempotent when several protected requests fail together.
- Login results should flow into the future memory-only session, not persistent
  storage. No refresh/logout endpoint is invented. The backend's 30-minute token
  lifetime and current-account role/status checks remain unchanged.

The shared server rate limit is 100 requests/minute per IP. These defaults restrain
background traffic but are not a client-side guarantee against 429; concurrent
clients and manual refreshes share that budget. UI handling must respect 429 and
avoid repeated automatic retries or eager full-dataset pagination.

## Verification and limits

Run `npm.cmd run test:api`, `npm.cmd run typecheck`, and `npm.cmd run build`.
The Node test runner uses its standard no-process-isolation mode to avoid creating
test worker subprocesses in the restricted workspace. It does not disable any
Windows security policy. All HTTP adapters/fixtures in test files are offline and
never imported by application runtime.

Tests compare all 22 service calls with compiled backend controller metadata and
exercise serialization, 204, safe errors, path restrictions, authorization scope,
cancellation, session races, response shapes, retry rules, deduplication, cache
clearing, and scoped invalidation. Eleven schema groups check 92 positive/negative
cases against actual compiled DTO validation plus service nonempty-PATCH rules.
Additional tests cover query validation and the backend grade decimal rule.
The backend's existing dist artifacts are read only; no Nest app or database is
initialized by these contract tests. This finite matrix is not exhaustive proof
that every possible input has identical behavior.

Live verification is limited to unauthenticated read-only protected requests via
the Vite proxy, expected to return 401, and sensitive-file denial probes. No live
login, academic mutation, destructive request, or rate-limit stress test is used.
Authenticated integration is deferred to approved Step 14.5. Full browser session
behavior and forms remain future work; no successful authenticated results are
claimed here. TypeScript types describe wire data, while runtime Zod schemas check
actual response shapes and reject unexpected changes safely.

Recorded Step 14.4 results: all 33 offline tests passed, including the 92-case
DTO/service-boundary matrix; TypeScript and production build passed. In isolated
Chrome, the real browser Axios adapter issued exactly two unauthenticated GETs:
`/api/v1/auth/me` and `/api/v1/subjects`, both returning safely normalized 401.
The preview remained available with zero automatic API calls on mount and zero
runtime exceptions. Vite returned 403 for backend environment files and the private
backup; Apache still denied SGMS access. Dependency checks passed and the frontend
audit reported zero vulnerabilities. Both existing servers remained running.
