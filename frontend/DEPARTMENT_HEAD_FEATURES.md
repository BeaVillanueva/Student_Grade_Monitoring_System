# Step 14.8 — Department Head features

Implemented and verified locally on 26 November 2026. Development URL:
http://127.0.0.1:5173/login. This step adds Department Head functionality only;
Faculty and Student academic modules remain placeholders.

## Pages and permissions

| Route under `/department-head` | Capability |
| --- | --- |
| `/` | Academic Dashboard: six totals, enrollment/inquiry distributions, grade-type overview, quick actions and manual refresh |
| `/subjects` | Paginated list, detail, create, full update, delete and Faculty assignment |
| `/enrollments` | Paginated list, detail, create, full update and delete; Student filter; immutable enrollment date on updates |
| `/grades` | Read-only list/detail and server-supported Student filter |
| `/grade-inquiries` | Read-only list/detail, Student filter and available resolution information |
| `/directory` | Paginated Student/Faculty directory, limited detail, current-page search and current-page role filter |
| `/profile` | Existing authenticated account's own profile from `/auth/me` |

Subjects and Enrollments reuse Admin forms, confirmations, validation and safe
error handling. Academic-history and active-account rules remain authoritative in
the unchanged backend. No live mutations were performed during verification.

Unlike Admin, Department Head has no user creation, update, activation,
deactivation or deletion controls, and no inquiry resolve/edit/delete/reopen
controls. Grades are read-only for both management roles. The existing route
guards continue to reject access to another role's routes.

## Shared implementation and data safety

`features/shared/management-page.tsx` and `workspace-dashboard.tsx` implement both
management workspaces, using centralized `managementCapabilities` policies.
Admin entry points are thin wrappers. Shared forms, relationship presentation,
tables, pagination, query infrastructure, feedback states and confirmations are
reused. No new dependencies or backend endpoints were needed.

Department Head uses a distinct strict directory service for `GET /users` and
permitted `GET /users/:id`. It accepts exactly `userId`, `firstName`, `lastName`
and `role`, with only Student/Faculty roles. Unexpected full profiles, privileged
roles or private extra fields fail response validation before caching. Directory
tables and details project only those four fields. The account's own profile
remains a separate authenticated `/auth/me` response.

Assignment selectors use directory membership and role without assuming account
status. They do not probe restricted account information. The backend can reject
an assignment; generic safe feedback does not infer whether inactivity caused
the rejection. Admin's existing Active-only selectors are preserved. Updates
omit the immutable enrollment date; unchanged historical Student ownership can
be retained where allowed by the backend.

Relationship names come from complete permitted reference datasets, with no
per-record profile-discovery requests. An inaccessible Admin resolver appears as
`User #<id> — details unavailable`, rather than an invented name or a forbidden
profile request.

Dashboard Student/Faculty totals count all permitted directory entries, not
Active accounts. Complete paginated datasets support all distributions; Subject
totals use the API total. Grade-type counts use all permitted grades, not a
single page. Empty datasets display empty states. Incomplete, duplicated,
changing or excessive paginated results do not become partial global totals.
The existing maximum of 100 pages at 100 records remains in place.

Both workspaces share the existing bounded scheduler (60 scheduled page reads
per 61 seconds, concurrency two), canonical page cache and complete-dataset
safeguards. Detail and identity requests retain their existing behavior. Session
changes cancel requests, rotate cache scope and clear private query/mutation
data. No token or private query persistence was added. No unsupported server-side
search or role filters are sent: search and directory role filtering explicitly
apply only to the currently loaded page; pagination totals stay server totals.

## Verification evidence

These are frontend automated/browser checks, distinct from the earlier actual
Postman results in `docs/postman-test-results.md`.

- TypeScript and production build passed. All 70 automated tests passed,
  including eight new Department Head tests and all 62 existing tests.
- New tests cover policies, strict limited directory responses, permitted GET
  mappings, directory-based selectors, immutable date handling, prohibited form
  construction, four-field presentation, unknown resolver fallback, directory
  totals and Admin-to-Head cache isolation. Unexpected full-profile responses
  are rejected without being cached.
- Offline Chrome Department Head workflows exercised Subjects/Enrollments CRUD,
  confirmations/cancellation, history restrictions, assignment rejection,
  read-only monitoring, server Student filtering, directory details/local role
  filtering and denial of Admin routes. Eleven fixture mutation requests:
  six successful, three expected HTTP 409 conflicts and two expected HTTP 400
  assignment rejections. Zero actual backend requests in these fixture tests;
  zero prohibited mutation requests or runtime exceptions.
- Offline Admin regression retained all CRUD, inquiry resolution, user creation,
  blank-password omission, activation/deactivation, last-Admin restriction and
  self-role-change behavior. Seventeen fixture mutations: 13 successful and four
  expected conflicts. Faculty/Student denial of Admin routes also passed.
- A separate same-document Admin logout/Head login browser check confirmed no
  previous Admin email/profile columns in the Head directory. Safe error,
  manual recovery and empty-directory states passed. No local/session storage
  entries were created.
- All six Department Head pages were checked in headless Chrome at widths 320,
  375, 768, 1366 and 1920 pixels without horizontal page overflow. A mobile
  subject form and keyboard field navigation were checked. Existing accessible
  dialog primitives and focus styling are retained. This is not a full manual
  screen-reader or cross-browser accessibility certification.
- One controlled live Head login returned 200. Fourteen GET responses returned
  200. Dashboard totals: Students 3, Faculty 2, Subjects 2, Enrollments 2,
  Recorded Grades 3, Pending Inquiries 1. All five management lists and permitted
  detail views loaded; the directory contained five permitted entries.
- Three additional Enrollment list/detail navigation cycles succeeded in the
  same session, using the normal cache. The earlier Enrollment verification
  interruption did not recur; its historical root cause remains unconfirmed.
  No backend fix or speculative cause is claimed.
- Live verification allowed only GET and a single login POST. No unexpected
  writes were attempted. Before/after full record snapshots of all seven tables
  matched exactly, including audit entries and migration history.

| Table | Before | After |
| --- | ---: | ---: |
| users | 7 | 7 |
| subjects | 2 | 2 |
| enrollments | 2 | 2 |
| grades | 3 | 3 |
| grade_inquiries | 2 | 2 |
| audit_logs | 22 | 22 |
| sgms_migrations | 1 | 1 |

The dependency audit reported zero known vulnerabilities and the installed
dependency tree had no compatibility errors. Apache SGMS access remained 403;
Vite access to the backend environment and private backup remained 403;
unauthenticated proxied Subjects access remained 401. The loopback binding,
strict port, proxy and filesystem restrictions were preserved.
The frontend source/documentation and production output were also checked
against actual ignored password/secret values and JWT/bcrypt patterns: no
matches were found. Private environment files, dependencies, build output and
the existing backup remain Git-ignored.

## Limits and next step

Browser mutation tests used isolated intercepted fixtures, not real database
writes. Live verification covered reads only. Directory account status remains
unavailable by design; a listed account is not a promise of assignment eligibility.
Large permitted datasets may wait for the request budget or exceed the explicit
complete-dataset safety bound. Manual refresh is available; no polling or fake
statistics were introduced. Existing memory-only sessions require login after
a full reload, and local HTTP development remains unsuitable for production.

No backend, database, credential, schema, security-policy, Postman or Vite
configuration changes were made. No commit or push was performed. Step 14.9
Faculty Dashboard requires separate approval.
