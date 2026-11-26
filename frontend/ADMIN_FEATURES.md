# Functional Admin dashboard and management - Step 14.7

## Completed routes

| Route | Functional scope |
|---|---|
| /admin | Actual totals, enrollment/inquiry distributions, quick actions, refresh and failure/empty/loading states |
| /admin/subjects | Paginated Subjects; view; confirmed create/full update/delete; Active Faculty selection |
| /admin/enrollments | Paginated Enrollments; view; confirmed create/full update/delete; Active Student/valid Subject assignment |
| /admin/grades | Read-only paginated grade monitoring, related Student/Subject labels, backend studentId filter |
| /admin/grade-inquiries | Paginated inquiries/details, submission/resolution information, confirmed Pending-only resolution |
| /admin/users | Paginated users/details, confirmed create/edit/activate/deactivate; no deletion |

Existing Admin role guards still control these routes. Other roles retain their
approved placeholders; shared shell, profile, memory-only authentication and query
scope behavior remain intact. No new backend endpoint or permission was introduced.

## Dashboard and bounded data loading

Student/Faculty totals include Active and Inactive accounts and are counted from
complete Users datasets. Enrollment and inquiry distributions also use complete
paginated datasets. Subject and Grade totals use the API's total metadata, not the
number of records on the first page. Pending inquiries use the actual Pending enum.
Status categories are Enrolled/Dropped/Completed and Pending/Resolved only.

Status bars use semantic definition lists with exact counts and rounded percentages;
the visual bars are hidden from assistive technology. Recharts was unnecessary, so
no chart package or other dependency was installed. No GPA, pass rate, ranking,
attendance, trend, or other unsupported statistic was introduced.

`features/shared/workspace-queries.ts` shares canonical page caches with complete
dataset queries. Complete reads use pageSize 100, detect changed totals, duplicate
IDs and missing rows, and stop at 100 pages (up to 10,000 records per resource).
Incomplete or oversized aggregates produce an error, never partial global totals.
Large datasets may wait in the read queue; the loading message explains this.

The shared read queue permits at most 60 page reads per 61 seconds, two concurrent
reads, and cancellation of queued reads. Remaining capacity is reserved for account
checks, explicit detail reads and mutations. This is conservative client pacing,
not a guarantee against the shared 100/minute backend limit: other clients and
browser reloads also consume that budget. Existing bounded retry rules still apply;
429 and mutations are never automatically retried.

Related names/records are joined locally from permitted complete Users, Subjects,
Enrollments and Grades responses as needed. Reference data is cached/deduplicated;
there are no per-row request waterfalls. Explicit View/Edit actions may retrieve
one current detail record through an existing GET endpoint. Missing references are
identified honestly by ID, and failed lookup loads block assignment forms rather
than inventing names or available accounts.

The existing mutation invalidation marks related page/complete caches stale. The
visible management list is explicitly refreshed after success; other views refresh
their stale queries on mount. Manual refresh invalidates relevant cached data before
reloading. Cross-resource summaries are not atomic database snapshots: the API has
no transactional summary endpoint. Pagination detects several forms of concurrent
change, but no complete cross-resource point-in-time guarantee is claimed.

## Forms, restrictions and privacy

- Shared EntityForm uses React Hook Form, strict Zod schemas, linked validation
  messages, explicit review/confirmation and pending guards. All creates/updates,
  resolution, status changes and deletion require confirmation.
- Subject PUT submits all four editable fields. Active Faculty options and local
  selection validation are required. Duplicate codes, graded reassignment and
  enrollment-protected deletion remain backend decisions; generic 409 is handled
  without inventing a particular conflict cause.
- Enrollment create requires an Active Student, existing Subject, term, consecutive
  school year, calendar date and status. Updates omit dateEnrolled entirely. An
  unchanged inactive historical Student assignment can be retained; newly assigned
  Students must be Active. Grades protect academic identity/term/deletion.
- Admin Grades has View only, with no create/edit/delete controls or mutation path.
  Scores remain backend decimal strings. Enrollment dates remain date-only strings;
  recorded timestamps are displayed in the browser's local timezone.
- Pending inquiry resolution requires a valid note and confirmation. It submits
  only resolutionNote; no Grade mutation, inquiry deletion or reopening exists.
- User edit starts with a blank optional new-password field. Blank passwords and
  unchanged profile values are omitted from PATCH. Existing passwords/hashes/JWTs
  are never retrieved or displayed. Create/password validation retains the backend's
  minimum-character and UTF-8-byte requirements.
- Password fields are cleared when a confirmed save begins. Mutation variables are
  undefined, not credential-bearing objects; a short-lived operation ref is cleared
  after completion, and the mutation has zero inactive-cache retention. Only safe
  API results enter mutation state. No browser storage or credential logging exists.
- User changes targeting the current actor force /auth/me refresh. Role changes
  rotate private scope and redirect; deactivation/401 ends the session. A changed
  scope prevents subsequent stale Admin refetches or success notifications.
- Last Active Admin and academic relationship restrictions remain enforced by the
  backend. There is no user deletion or unsupported self-service recovery endpoint.

Client search is explicitly labeled as searching the current loaded page only;
server pagination totals remain visible. Enrollments/Grades/Inquiries support the
existing studentId backend filter. No unsupported server search/sort/status filters
or new API parameters were introduced. Quick actions open functional creation forms
or the inquiry list; they are not decorative buttons.

## Files

New implementation files:

- src/features/admin/admin-page.tsx
- src/features/admin/dashboard.tsx
- src/features/admin/management-page.tsx
- src/features/shared/workspace-data.ts
- src/features/shared/workspace-queries.ts
- src/features/shared/read-budget.ts
- src/features/shared/entity-form.tsx
- src/features/shared/record-fields.ts
- src/features/shared/record-presentation.ts
- test/admin.test.ts

App.tsx now selects the Admin implementation while preserving other roles. The
application layout supplies the existing ToastProvider to feature pages. Supporting
documentation was updated; no backend or Vite security configuration changed.

## Verification evidence

### Automated/offline

TypeScript and production build passed. All 62 frontend tests passed, including
nine new Admin data/payload/selection/budget/cancellation tests and the existing
22-endpoint, DTO, session, authorization and navigation coverage. The test matrix
checks data beyond page one, rejects incomplete aggregates, preserves calendar dates,
omits blank passwords, verifies flat-ID joins and validates resolution-only payloads.

An actual React Strict Mode remount issue was found during offline browser testing:
cancelling an aggregate had cancelled its shared canonical page. Canonical reads
now use their own query/session signal, while aggregate cancellation stops further
pagination. A regression test verifies remount reuse. Logout still cancels all
session queries and clears their private caches.

Browser mutation testing intercepted every API request with isolated fixtures. The
fixtures were never added to application runtime or the database. The final workflow
pass made 17 simulated mutation requests: 13 succeeded, and four returned expected
409 conflicts. It covered Subjects CRUD/cancel/history restrictions, Enrollments
CRUD/immutable date/protected deletion, read-only Grades/student filtering, confirmed
inquiry resolution without Grade changes, Users create/edit/blank-password omission/
activation, last-Admin rejection, self-role-change identity refresh, and denial of
all other roles at Admin routes. Zero requests reached the backend in these passes.

All six pages were checked at 320, 375, 768, 1366 and 1920px with no horizontal
document overflow. Create-form dialogs also fit 320px. Screenshot review, validation,
confirmation, safe read-error/manual recovery, empty tables and empty status summaries
passed. No runtime exceptions or unexpected academic endpoints occurred.

### Actual live read-only verification

Two controlled Admin logins were used, both successful. The initial run verified
Dashboard and Subjects but stopped during Enrollment verification; its specific
interruption was not established. A diagnostic repeat completed all five management
tables and detail views without intervening application/backend changes. No blind
credential retries or rate-limit stress tests were performed.

The final successful run used one login followed by 14 successful GET responses.
A browser guard allowed GET and the single login only; all other writes would have
been blocked. No unexpected writes were attempted. Actual dashboard values were:

| Metric | Verified value |
|---|---:|
| Total Students | 3 |
| Total Faculty | 2 |
| Total Subjects | 2 |
| Total Enrollments | 2 |
| Total Recorded Grades | 3 |
| Pending Grade Inquiries | 1 |

Student count includes the intentionally retained Inactive historical fixture
account as well as the original demo Student accounts. These are existing database
records, not new frontend fixtures.

Live tables showed two Subjects, two Enrollments, three Grades, two Inquiries and
seven Users; each first record's read-only detail view worked. A full before/after
database row comparison confirmed all records unchanged, including account hashes,
original demo data, all 22 audit entries and migration history. No values of hashes,
credentials, tokens or private backups were printed or copied to frontend files.

| Table | Before and after |
|---|---:|
| users | 7 |
| subjects | 2 |
| enrollments | 2 |
| grades | 3 |
| grade_inquiries | 2 |
| audit_logs | 22 |
| sgms_migrations | 1 |

### Security and limits

Dependency audit reported zero vulnerabilities. Final sensitive-file/secret checks
passed: Vite and Apache blocked private paths, the unauthenticated proxy returned
401, and no private credential values or tokens were copied into frontend files.
Private environments, dependencies, build output and browser artifacts stay excluded.
No live creation, update, deletion,
deactivation or resolution was performed. Backend mutation/database integration
suites were not rerun because this step prohibits live writes; frontend DTO/controller
contract tests read existing compiled backend metadata without starting a Nest app.

Screen-reader output, other browsers, physical touch devices and exhaustive
accessibility certification remain unverified. The complete-dataset cap and
non-atomic multi-resource summaries are intentional prototype limitations. The
initial live interruption did not reproduce, but its exact cause is unconfirmed.
Other role modules remain for their approved steps. No commit or push was made;
both servers remain running.
