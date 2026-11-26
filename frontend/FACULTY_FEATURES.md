# Step 14.9 — Faculty workspace

Implemented and verified locally on 26 November 2026. Start at
http://127.0.0.1:5173/login. Student academic modules remain placeholders.

## Functionality and contracts

| Route | Functionality |
| --- | --- |
| `/faculty` | Assigned subject, distinct Student, recorded grade and Pending inquiry counts; assigned subject overview; Midterm/Final and inquiry status counts; quick actions and refresh |
| `/faculty/subjects` | Read-only assigned subjects, units, enrollment counts and details |
| `/faculty/students` | Read-only enrollment rows, Student names/IDs, subjects, terms, statuses, dates and details |
| `/faculty/grades` | Enrollment-grouped Midterm/Final records, individual grade IDs, scores, remarks, recording dates, encoding and individual edit actions |
| `/faculty/grade-inquiries` | Assigned inquiry monitoring, available resolution information and confirmed Pending inquiry resolution |
| `/faculty/profile` | Existing verified own profile |

The all-subjects response is filtered by the verified Faculty ID before display.
Enrollment, grade and inquiry lists are scoped by the backend and cross-checked
against assigned relationships. Unexpected unassigned/inconsistent relationships
fail closed. Complete paginated datasets provide accurate counts and choices.
Distinct Student IDs determine the dashboard Student total; My Students rows
represent enrollment records and may repeat a Student across terms/subjects.

Tables use explicitly labeled client-side search, filters and pagination over
the complete assigned dataset. No unsupported query parameters are sent. Grades
are grouped by enrollment ID, preserving separate terms and individual grade
IDs. Missing grades display **Not recorded**, never zero. Scores retain their
API decimal strings; calendar enrollment dates are not converted through a
timezone. No averages, GPA, rankings or fabricated statistics were introduced.

Grade creation uses `POST /grades` with `enrollmentId`, `gradeType`, numeric
`score` and optional nullable `remarks`. Only assigned Enrolled enrollments are
offered. The backend still checks Student account eligibility, current Faculty
assignment, duplicate types and other rules. Limited Student responses do not
expose account status, and the UI does not infer it from a rejected request.

Grade editing uses `PATCH /grades/:id` with changed supported fields only:
`gradeType`, `score`, and `remarks`. At least one change is required. Enrollment
identity and `dateRecorded` are never submitted. Existing historical grades
remain editable without creation-only Enrolled/active-account checks. The
backend remains authoritative on assignment and duplicate grade-type conflicts.

Existing shared Zod contracts enforce score 0–100, at most two decimal places,
Midterm/Final types and remarks up to 30 characters. Cleared optional remarks
are submitted as null. Confirmation and duplicate-submit guards protect saves;
conflicts and eligibility failures use sanitized feedback.

Inquiry resolution uses the existing `PATCH /grade-inquiries/:id` endpoint with
only `resolutionNote`. It is available only for assigned Pending records and
requires validation and confirmation. Resolution does not change grades.
Resolved records have no resolution, deletion or reopening controls. Messages
and notes are rendered as React text, without HTML interpretation.

## Shared components and security

The workspace reuses the application shell, authentication/role guards, API
services and schemas, EntityForm confirmation/duplicate-submit behavior,
DataTable, Pagination, summary cards, status badges, feedback states, lookup
presentation/date utilities and toast notifications. EntityForm gained optional
numeric step metadata for decimal scores; existing controls retain step 1.
The existing read budget is shared with permitted Student lookups.

Faculty never requests the general users list. Unique Student IDs are derived
only from assigned enrollments. Individual `GET /users/:id` calls are deduplicated
and cached under the private session scope, scheduled through the same bounded
read queue (60 reads per 61 seconds, concurrency two). Strict response checks
accept only matching four-field Student directory responses. No email/status or
account-creation fields are requested or assumed. Loading or failed names retain
identifiers and offer manual refresh.

Resolver names use already permitted Student/self data only. Other resolver IDs
use the existing unavailable-name fallback without profile discovery requests.
Subjects and enrollments have no mutation controls; user management, grade
deletion, bulk grade operations and other management-role actions are absent.
Session changes cancel requests, rotate query keys and clear private caches;
tokens and private data are not persisted to browser storage.

## Verification evidence

These checks are separate from prior actual Postman test results.

- TypeScript and production build passed. All **79 automated tests** passed:
  nine new Faculty tests plus all 70 existing tests. Coverage includes assigned
  scope, distinct Student totals, limited profile validation, score boundaries,
  decimals, null remarks, historical updates, immutable fields, invalid/foreign
  enrollment rejection, Pending-only resolution, empty states and cache scope.
- Offline Chrome Faculty workflows passed: Midterm creation at 0, Final creation
  at 100, invalid decimals/long remarks rejected before transport, duplicate
  conflict handling, safe eligibility rejection, historical update with changed
  type/score and null remarks, and inquiry resolution without changing grades.
  Six simulated mutation requests: four successful, one expected 409 duplicate
  conflict and one expected 400 eligibility rejection. These were intercepted
  fixtures; **zero actual backend requests** occurred in the offline tests.
- Missing-grade states, grouping across terms, read-only Subjects/Students,
  exclusion of unassigned subjects, strict limited Student responses, deduplicated
  name requests, inaccessible resolver fallback and absence of forbidden
  requests/controls passed. Resolution text containing HTML-like characters was
  displayed as text. No browser runtime exceptions occurred.
- All five Faculty pages were checked at 320, 375, 768, 1366 and 1920 pixels
  without horizontal page overflow. A mobile encoding form and keyboard field
  navigation passed. Existing accessible dialog primitives/focus styling are
  retained; full screen-reader and cross-browser certification was not performed.
- An empty-assignment fixture displayed empty subject/enrollment states, disabled
  encoding and made no Student lookup requests.
- A same-document Admin → Department Head → Faculty logout/login sequence
  excluded prior private profiles and unassigned subjects from the Faculty
  session. No general users-list request occurred during the Faculty session;
  local/session storage remained empty. Offline route checks denied Admin and
  Department Head paths to Faculty.
- Admin regression: 17 simulated mutations, 13 successful and four expected
  conflicts. Department Head regression: 11 simulated mutations, six successful,
  three expected conflicts and two expected assignment rejections. Both retained
  their completed workflows, permission restrictions and responsive checks.
- Dependency audit: zero known vulnerabilities; installed dependency tree valid.
  No packages or lockfile changes were needed.
- Final protection checks: Apache SGMS access returned 403, unauthenticated
  proxied Grades access returned 401, and Vite requests for the backend
  environment and private backup returned 403. A scan of frontend source,
  documentation and production output found no actual ignored password/secret
  values, bcrypt hashes or JWT tokens. Private files remain Git-ignored.

## Controlled live read-only check

One login with the approved Faculty account returned HTTP 200. Six GET responses
returned 200, including one permitted Student lookup and no general users list.
The dashboard matched independently queried assigned database records:

| Metric | Actual |
| --- | ---: |
| Assigned Subjects | 1 |
| Distinct Assigned Students | 1 |
| Recorded Grades | 2 |
| Pending Inquiries | 0 |

My Subjects showed one assigned subject and excluded the other Faculty's subject.
My Students and Grade Management each showed one enrollment row, with the two
individual grades preserved. One resolved inquiry was visible. All four tables
and permitted detail views loaded. The browser verification allowed only GET
and one login POST; no grade/inquiry or other live mutation was attempted.

Full before/after snapshots matched for all seven tables:

| Table | Before | After |
| --- | ---: | ---: |
| users | 7 | 7 |
| subjects | 2 | 2 |
| enrollments | 2 | 2 |
| grades | 3 | 3 |
| grade_inquiries | 2 | 2 |
| audit_logs | 22 | 22 |
| sgms_migrations | 1 | 1 |

## Limitations and next step

Live mutation behavior was not exercised; mutation verification used isolated
offline fixtures. The live Faculty dataset has no Pending inquiry or Enrolled
assignment, so those workflows were verified offline. Complete datasets retain
the existing 100-page/100-record-per-page safety bound. Large name sets can wait
for the shared request budget while identifiers remain usable. The backend's
all-subject response is cached within the session, but unassigned subjects are
excluded from Faculty presentation and selectors. Local HTTP development and
memory-only session limitations remain unchanged.

No backend code, schema, records, credentials, security policies, Vite configuration
or Postman files were changed. Both servers were left running. No commit or push
was performed. Step 14.10 Student Dashboard requires separate approval.
