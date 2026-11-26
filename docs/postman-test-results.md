# Actual Postman testing results - Step 13.7

Report date: November 26, 2026 (Asia/Manila).

## Evidence and scope

The objectives were to exercise all 22 approved REST endpoints, demonstrate
Subjects and Enrollments CRUD, verify role and ownership restrictions, validate
inputs and authentication, and check rate limiting and transactional audit logging.
The ten original Laboratory Activity 05 method/path pairs remain represented.

This report separates three evidence sources:

1. **User-reported actual Postman execution:** the user confirmed completion of all
   95 collection request definitions across separate runs and supplied the assertion
   totals and timing figures below. These runs were not executed by the assistant.
2. **Previously recorded automated backend checks:** implementation-stage tests
   and build results, separate from Postman. They were not rerun for this report.
3. **Independently verified database findings:** read-only inspection followed by
   separately approved, transactionally verified fixture cleanup.

The 95 request definitions are not 95 assertions and were not reported as one
continuous successful run. Optional rate-limit definitions send repeated requests.
No screenshots, raw Runner exports, or complete per-request timing evidence were
provided for this report; none are fabricated or implied.

## Testing environment

- Local Windows development workspace: `C:\xampp\htdocs\SGMS`.
- NestJS and TypeScript backend using TypeORM and the mysql2 driver.
- Existing XAMPP MariaDB 10.4.32 at `127.0.0.1:3306`, database
  `student_grade_monitoring_db`.
- Local API base URL: `http://127.0.0.1:3000/api/v1`.
- JWT access tokens with a 30-minute lifetime, bcrypt password hashing at cost 12,
  class-validator DTO validation, role/ownership guards, and rate limiting.
- Postman collection v2.1 and a local Postman environment; exact Postman client
  version was not supplied. Git tracks public project artifacts.
- Fictional demo accounts and isolated Postman fixtures; no real student data.
- Apache denies direct project access. Local HTTP is a development limitation;
  production transport must use HTTPS.

## Collection and endpoint coverage

| Collection folder | Request definitions | Actual execution reported |
|---|---:|---|
| Authentication | 8 | Completed |
| Subjects | 6 | Completed |
| Enrollments | 12 | Completed |
| Grades | 7 | Completed |
| Grade Inquiries | 8 | Completed |
| User Management | 7 | Completed |
| Security and Negative Tests | 47 | Completed, including separate optional runs |
| **Total** | **95** | **Across separate runs** |

All paths below use the `/api/v1` prefix. Query, role, and negative variants do not
increase the endpoint count.

| Module | Endpoint method/path pairs | Count |
|---|---|---:|
| Authentication | POST `/auth/login`; GET `/auth/me` | 2 |
| Subjects | POST and GET `/subjects`; GET, PUT, DELETE `/subjects/:id` | 5 |
| Enrollments | POST and GET `/enrollments`; GET, PUT, DELETE `/enrollments/:id` | 5 |
| Grades | GET and POST `/grades`; PATCH `/grades/:id` | 3 |
| Grade Inquiries | GET and POST `/grade-inquiries`; PATCH `/grade-inquiries/:id` | 3 |
| Users | GET and POST `/users`; GET and PATCH `/users/:id` | 4 |
| **Total** | See [route inventory](route-inventory.md) for permissions | **22** |

## Actual functional testing results

The user confirmed completion of each module below. Exact functional-module
assertion totals and response-time figures were not supplied.

| Module | User-reported result | Independent database corroboration |
|---|---|---|
| Authentication | Completed, including credential correction and successful retesting | All six demo passwords matched their database hashes; expected roles/statuses remained intact |
| Subjects CRUD | Completed after token refresh and investigation of repeated deletion | Subject 2821 had CREATE, UPDATE, DELETE audit entries and was absent afterward |
| Enrollments CRUD | Completed | Enrollment 3534 had CREATE, UPDATE, DELETE audit entries and was absent afterward |
| Grades | Completed | Grades 1197 and 1198 existed; 1197 had CREATE and UPDATE audits |
| Grade Inquiries | Completed | Inquiries 576 and 577 were created and resolved by assigned Faculty and Admin respectively, with matching audits |
| User Management | Completed | Users 7073 and 7074 had creation audits; managed user 7074 had an update audit and was Inactive |

Database evidence corroborates persisted mutations and deletion outcomes, not
individual GET responses or the exact assertions executed in Postman.

## Actual security and optional-run results

The following figures are **user-reported actual Postman results**:

| Test group | Assertions passed | Duration | Average response time |
|---|---:|---|---|
| Security and Negative Tests | 134/134 | Not supplied | Not supplied |
| Genuine Expired JWT Test | 3/3 | Not supplied | Not supplied |
| Login Rate Limiting Test | 13/13 | 7.991 seconds | 348 ms |
| General API Rate Limiting Test | 203/203 | 10.990 seconds | 9 ms |

These are separate run results. They are not presented as a single collection-wide
assertion total or as 95 individual passes. The genuine expired-token result is
distinct from invalid-token testing. Login is limited to five attempts per minute
per client IP; the general API limit is 100 requests per minute per client IP.

## Authentication issues, token refresh, and retesting

Admin and Department Head initially returned HTTP 200 with their login assertions
passing. Faculty login returned HTTP 401 despite matching Postman and `.env.demo`
plaintext values. Read-only bcrypt comparison established that both Faculty and
both Student file passwords differed from their stored database hashes. Email,
role, and status checks did not explain the active Faculty failure. Collection
login variable references were correct; the origin of the divergence was not proven.

After explicit approval, four strong unique replacements were hashed at cost 12
and synchronized with the ignored credential file. All six demo account passwords
then passed bcrypt comparison. The four replaced passwords no longer matched;
Admin and Department Head credentials were left unchanged. Student Two remained
intentionally Inactive and is expected to receive generic authentication rejection.

During Subjects CRUD, DELETE initially returned 401. After Admin token refresh,
DELETE and a subsequent GET returned 404. Investigation found a committed deletion
audit for subject 2821 by Admin at November 25, 2026, 9:36:07 PM Asia/Manila. An
authentication rejection cannot execute the guarded deletion. The evidence proves
a separate authenticated deletion occurred, but does not identify which Postman
send produced it or establish the exact reason for the first 401.

For retesting, login refreshes the relevant role token stored in the active local
environment; subsequent protected requests use that role's token. In particular,
the Subject DELETE uses `{{adminToken}}` and `{{subjectCrudId}}`, expects HTTP 204
with no body on its first successful deletion, and the confirmation GET expects 404.
Repeating DELETE against the already deleted ID correctly returns 404. The user
subsequently confirmed completion of the functional testing and separate security
runs. Tokens and credentials are deliberately absent from this report.

## Previously recorded automated checks

Before actual Postman testing, implementation-stage verification recorded:

- Backend build passed.
- Five automated configuration/route-contract tests passed.
- 309 automated HTTP/concurrency tests across six suites passed.
- 47 database integration checks passed at the earlier demo-baseline stage.
- Offline Postman artifact checks validated collection structure, script syntax,
  and positive/negative DTO examples; these are not actual Postman execution.

These historical results are not newly executed tests. The baseline-specific
database checker assumes the original seed counts, so it must not be represented
as rerun successfully against the retained audit history and historical fixture user.

## Independent final database verification

Inspection accounted for every remaining Postman fixture using the run prefix
`PMWW4Y89YE331`, exact IDs, relationships, and creation/mutation audit entries.

| Resource | Remaining fixture IDs before cleanup |
|---|---|
| Users | 7073, 7074 |
| Subjects | 2822, 2823 |
| Enrollments | 3535, 3536 |
| Grades | 1197, 1198 |
| Grade Inquiries | 576, 577 |

Subject 2821 and enrollment 3534 were already deleted during CRUD testing and
retained their mutation audits. Twenty test mutation entries, audit IDs 175-194,
plus the original seed entry accounted for all 21 pre-cleanup audit records.

Verification found no orphaned foreign-key relationships, duplicate emails or
subject codes, duplicate enrollment combinations or grade types, invalid domain
values, or inconsistent Student/Faculty and inquiry ownership relationships.
All six domain tables used InnoDB, with the expected keys and constraints present.

Original users 1-6, subjects 1-2, enrollments 1-2, grades 1-3, and inquiries 1-2
were intact and matched their expected seed-defined values. Student Two was
Inactive. All six demo passwords passed bcrypt comparison at cost 12. No application
mutation audits targeted the original records. This is current-state evidence,
not an immutable proof of all historical values or intermediate changes.

No unexpected persisted mutations were found beyond the accounted-for workflow.
Rejected requests are not individually stored in mutation audit logs, and those
logs contain no before/after payloads or Postman request IDs. Therefore database
inspection supports, but cannot independently prove, the absence of side effects
from every individual rejected request.

## Approved audit-preserving cleanup

A private database backup was created before cleanup, with all seven tables
including migration history. Dump completion, per-table row counts, and SHA-256
checksum were verified. The backup is excluded from Git and restricted by Windows
permissions to the current user and SYSTEM. Its contents are not included here.

Cleanup revalidated exact fixture identities, ownership, all incoming foreign-key
references, and expected counts under a serializable transaction. It deleted
inquiries 576-577, grades 1197-1198, enrollments 3535-3536, subjects 2822-2823, and
unreferenced managed user 7074, in that dependency order.

User 7073 was retained because it authored audit entries 189 and 191. It was
deactivated, preserving its other fields. New audit entry 196 records `USER_UPDATE`
for user 7073, attributed to existing Admin user 5, at November 26, 2026,
9:20:53 AM Asia/Manila. No cleanup deletion audit entries were added; this report
records the approved maintenance deletions while preserving all existing history.

| Table | Before cleanup | After cleanup |
|---|---:|---:|
| Users | 8 | 7 |
| Subjects | 4 | 2 |
| Enrollments | 4 | 2 |
| Grades | 5 | 3 |
| Grade Inquiries | 4 | 2 |
| Audit Logs | 21 | 22 |
| Migration History | 1 | 1 |

All 21 pre-existing audit entries were preserved unchanged. Whole-row comparison
verified that no other records changed beyond the approved deletions, account
deactivation, and new audit entry. Original demo records, constraints, and migration
history were preserved. Precommit integrity checks and final read-only verification
passed, with zero orphaned foreign-key relationships.

A preliminary cleanup transaction rolled back because its schema comparison
included the naturally advancing audit auto-increment counter. The corrected
comparison allowed expected counter advancement; no counter was reset. Unused
audit ID 195 is a harmless consequence of that rollback. No tables were reset and
foreign-key enforcement remained enabled. The running backend was left untouched.

## Public environment template verification

The repository's intended-to-be-committed file
`postman/SGMS.local.postman_environment.json` was inspected for this report.
At Step 13.7 review it was untracked; Step 13.8 verifies the staged template before
including it in the approved seventh commit.
All email, password, and token fields are blank, as are fixture identifiers and
the cleanup manifest. No database credentials or JWT signing secret are present.

Safe defaults are:

- `allowTestWrites=false`
- `rateMode=off`
- `runExpiredTokenTest=false`
- `baseUrl=http://127.0.0.1:3000/api/v1`

The user separately confirmed restoring the active Postman environment switches.
The live Postman environment was not directly inspected. Private credentials,
tokens, backup files, and unredacted run exports must remain outside Git.

## Limitations and conclusion

The user reports completing all 95 collection definitions across separate actual
Postman runs, covering the 22 endpoints. The supplied security, genuine-expiration,
and rate-limit assertion totals all passed. Functional-module assertion totals and
timings were not supplied; no additional numbers or visual evidence are claimed.

Independent database checks corroborate the expected mutations, preserved original
records, and successful audit-preserving cleanup. Retained user 7073 is intentionally
Inactive historical test data, not an unexplained leftover. Historical audit resource
IDs may refer to deleted records by design; audit actor references remain valid.

No production deployment, HTTPS behavior, distributed rate limiting, sustained load
benchmark, or new automated regression run is established by this report. The
preparation guide's historical "prepared, not executed" status describes its earlier
phase; this report supplies the later actual-testing record.

Step 13 testing and cleanup evidence is documented for review. The next Git commit
requires explicit approval and a final staged secret/artifact review. This reporting
step does not modify application source or database records and does not create a
commit or push.
