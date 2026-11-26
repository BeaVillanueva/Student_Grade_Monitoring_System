# Consolidated testing evidence

These historical results were not rerun during Step 14.14B. Keep each measurement separate.

| Evidence/provenance              | Result                                                                                                  | Scope                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Actual isolated functional run   | 59/59 scenarios; 248 requests; all 22 method/path pairs; 32 business mutations; 32 corresponding audits | Real isolated frontend/API/database traffic                           |
| Separate behavioral security run | 253/253 checks; 48 additional audits; 80 total isolated audits reconciled                               | Not 253 functional scenarios                                          |
| Frontend automated               | 86/86 tests, no skips/failures                                                                          | Offline tests, not live browser count                                 |
| Safe backend automated           | 5/5 across 2 suites                                                                                     | Auth configuration/route metadata only                                |
| Production checks                | Frontend TypeScript/build pass; backend production TypeScript/Nest build pass                           | Private outputs/source copy in 14.13; original dependencies unchanged |

## User-reported Postman execution

The 95 request definitions cover all 22 endpoints across separate runs. They are not 95 assertions
or one uninterrupted run. Folder counts: Authentication 8, Subjects 6, Enrollments 12, Grades 7,
Grade Inquiries 8, User Management 7, Security/Negative 47. The user confirmed completion of the
functional groups; per-group assertion totals were not supplied.

| Separate run                | Assertions passed | Duration       | Average response time |
| --------------------------- | ----------------: | -------------- | --------------------- |
| Security and Negative Tests |           134/134 | Not supplied   | Not supplied          |
| Genuine Expired JWT Test    |               3/3 | Not supplied   | Not supplied          |
| Login Rate Limiting         |             13/13 | 7.991 seconds  | 348 ms                |
| General API Rate Limiting   |           203/203 | 10.990 seconds | 9 ms                  |

No raw Postman screenshot or Runner export is available; none is invented. Faculty's initial HTTP
401 was traced to four demo file/database password mismatches. Separately approved synchronization
verified all six accounts, preserving Student Two as Inactive; Admin and Department Head were
unchanged in that synchronization. Passwords are omitted.

Subject 2821 DELETE initially returned 401, then 404 after refresh. Audit evidence proves a separate
authorized deletion, but does not identify which request caused it or establish the exact reason for
the first 401. Re-login refreshes the appropriate role token. Repeated DELETE of an absent resource
correctly returns 404.

## Independently verified historical Postman cleanup

| Table           | Before | After |
| --------------- | -----: | ----: |
| users           |      8 |     7 |
| subjects        |      4 |     2 |
| enrollments     |      4 |     2 |
| grades          |      5 |     3 |
| grade_inquiries |      4 |     2 |
| audit_logs      |     21 |    22 |
| sgms_migrations |      1 |     1 |

Private backup and transactional exact-ID/reference checks preceded deletion of inquiries 576/577,
grades 1197/1198, enrollments 3535/3536, subjects 2822/2823, user7074. User 7073 retained for
audits, deactivated and one audit added; all 21 existing audits and demos preserved. No counters
reset/FK disabling. Source: docs/postman-test-results.md. Audit/state evidence supports observed
persisted operations; it cannot uniquely prove the outcome of every rejected HTTP request.

## Final application verification14.13

Classification A accepted for academic demonstration with limitations. All four roles authenticated;
navigation, own/assigned record visibility, management views/forms/validation/cancel and
unauthorized access checked. No final original business mutation; success writes rely on historical
isolated tests. Original snapshot remained 7/2/2/3/2/22/1. Isolated9/4/7/6/8/80/1 is retained
historical evidence, not a new scan.

Representative layouts at 320, 375, 768, 1024, 1366, 1920 pixels passed documented overflow checks;
mobile drawer/focus reviewed. Headless Chrome 158, not all browsers/physical devices/screen readers.
Completed Faculty enrollment with both types recorded correctly has no new-grade eligibility.

## Failed attempts and follow-up remain evidence

First 14.13 browser attempt 28 observations/24 requests stopped on private selector failure. Retest
failed before login because a line comment swallowed helpers (mark-is-not-defined, then
save-is-not-defined). Corrected private harness retained both attempts. Completed main run 92
observations/66 requests included two incomplete statuses and a Faculty timeout screenshot despite
optimistic harness labels; exclude it from successful demonstration figures. Rate-budget
interception delay is plausible, exact cause unconfirmed. Focused follow-up 39 observations/50
requests:44HTTP200, two401, four403; no incomplete/429/mutation/runtime error; four dashboards
verified. These overlapping observations are not additional unique test coverage.

Postman-template broad regex falsely matched runExpiredTokenTest=false. Explicit empty
credential/token slots and safe settings validation passed. Candidate dependency remediation
rejected, no deployment. Prior cleanup/backup safety halts and corrections remain in private
evidence; later success does not certify infrastructure recovery. Documentation tooling errors did
not alter application files and are recorded separately from application testing.

## Evidence boundaries

Source docs/postman-test-results.md records earlier backend 309 HTTP/concurrency tests and47 initial
database checks; do not claim these were rerun against the current retained audit baseline. Private
final verification report and indexed21 historical/12 final screenshots reconcile actual results. Do
not add unrelated scenario/assertion/request/audit metrics together. No historical test was rerun
for this documentation draft.

This is a local academic prototype, not production certification or a vulnerability-free system.
MariaDB 10.4.32 via XAMPP is user-approved as the MySQL-compatible implementation; instructor
acceptance of the substitution has not been confirmed. The deployment uses local HTTP. Frontend and
backend bind to loopback, but MariaDB has not been confirmed loopback-only. A production deployment
needs a separately designed HTTPS, network, secrets, monitoring and operational configuration.

Known infrastructure limitations: MariaDB Aria checksum errors, incomplete privilege metadata
recovery, historical Windows disk I/O retry warnings, same-disk backups, no consistent cold backup
and no restore rehearsal. Cleanup of the isolated test environment and an unrelated legacy database
remains deferred. Detailed recovery reports, unrelated database identities and backup contents stay
private. Documentation approval does not authorize recovery or cleanup.

Known application/tooling limits: development-only dependency advisories remain after a remediation
candidate was rejected; full-project backend TypeScript checking has an existing test-file typing
error (test/auth.e2e-spec.ts:120), although production backend checks pass. Original backend PID
replacements remain unexplained. A historical Faculty timeout has an unconfirmed cause; later
focused checks passed. JWT logout clears frontend memory/cache but does not revoke issued tokens. IP
rate limits are process-local. Single-department scope; no refresh-token endpoint, user deletion,
GPA formula, grade deletion, inquiry reopening or extra dashboard endpoint. Browser, physical device
and assistive-technology coverage is limited; headless Chrome and representative viewport checks are
not accessibility certification.

## Offline Postman artifact validation

Step 14.14A.1 verified valid collection/environment JSON, 95 request definitions, all 22 endpoint
pairs, and 192 script syntax checks. It checked 24 positive and nine negative DTO examples and
offline mutation/cooldown guards. Credential/token slots were empty; allowTestWrites=false,
rateMode=off and runExpiredTokenTest=false. These were offline checks, not live API execution or new
Postman assertions. They were not rerun as live tests during Step 14.14B.
