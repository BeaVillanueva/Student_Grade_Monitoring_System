# SGMS Postman API testing guide — Step 13 preparation

## Preparation record and subsequent testing

The preparation observations below describe the earlier preparation phase. Actual
testing across separate runs and the later audit-preserving cleanup are recorded
in [actual Postman testing results](postman-test-results.md). That report supersedes
the preparation-only execution and cleanup status statements in this guide.

This phase prepares an importable Collection v2.1 and local environment. **No Postman
collection run, HTTP CRUD demonstration, screenshots, or seventh Git commit has occurred.**
Actual Postman execution requires the user's next approval.

Preparation checks on this workspace:

- XAMPP MariaDB 10.4.32 is running on 127.0.0.1:3306.
- The existing configured sgms_app account connected to student_grade_monitoring_db.
  Only read-only connectivity queries were used; no test records were created.
- Port 3000 is available; the backend was NOT started during preparation.
- Postman Desktop, Postman CLI, and Newman were not detected in PATH, common install
  locations, or inspected uninstall registrations. A portable copy elsewhere is unverified.
- Backend build passed; all five configuration/production-route contract tests passed.
- The production inventory remains exactly 22 routes, including the ten original Lab 05 routes.
- No additional application/package was installed. Installation or another Postman
  location must be approved/provided before actual client execution.

## Files and coverage

- `postman/SGMS.postman_collection.json`
- `postman/SGMS.local.postman_environment.json`
- This guide; existing API/permission details are linked at the end.

Collection: **Student Grade Monitoring System (SGMS) API**.
Environment: **SGMS Local Development**.

| Folder | Request definitions |
|---|---:|
| 01 Authentication | 8 |
| 02 Subjects | 6 |
| 03 Enrollments | 12 |
| 04 Grades | 7 |
| 05 Grade Inquiries | 8 |
| 06 User Management | 7 |
| 07 Security and Negative Tests | 47 |
| **Total** | **95** |

These definitions cover all **22 unique production endpoints**. Query variants, role
variants, setup requests, and negative scenarios do not increase the endpoint count.
The normal sequence sends 92 requests when all prerequisites are satisfied; expired
JWT and two rate-loop definitions are skipped by default. Optional loops represent
multiple actual requests, so report executed counts from the real Runner afterward.

Validation completed WITHOUT Postman or network API execution:

- Both JSON files parse; environment structure and 52 declared variables checked.
- Collection validated against the official v2.1 schema. The installed Ajv 8 validator
  used compatibility normalization of legacy draft-04 resolution/meta IDs only; the
  official schema's validation constraints were retained. No new validator package installed.
- All 192 collection/request scripts passed JavaScript syntax checks.
- Variable references resolve to declared or intentionally local variables.
- All 24 positive JSON request bodies passed the actual compiled class-validator DTOs.
- Nine intentionally invalid JSON bodies were rejected by those actual DTOs offline.
- Offline mocked checks verified write gating, optional-test skipping, generated fixture
  values, and cooldown scheduling. These checks are NOT actual Postman/API test passes.
- Passwords/tokens are blank in the template; existing private credentials are absent
  from public artifacts. No fabricated saved responses or screenshots are included.

## 1. Start prerequisites after execution is approved

1. Open the existing XAMPP Control Panel. Start **MySQL** (XAMPP MariaDB); do not reset
   databases or change global settings. Leave Apache's SGMS access protection in place.
2. If Postman is still unavailable, obtain approval before installing it. Use a supported
   client with `pm.execution.skipRequest()` and `pm.execution.setNextRequest()`.
3. From PowerShell:

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\SGMS\backend'
npm.cmd run build
npm.cmd run start:dev
```

The Nest backend defaults to 127.0.0.1:3000 and loads its existing ignored .env. If
port 3000 is occupied, identify its owner and report the conflict; do not stop another
application. Do not rerun database provisioning, seed generation, or migrations for this run.
Do not copy DB passwords or JWT_SECRET into Postman. No signing secret is needed there.

This is loopback HTTP development only. Do not expose the backend to a LAN/public network.

## 2. Import collection and environment

Import the two supplied JSON files into Postman, then select **SGMS Local Development**.
Keep the baseUrl exactly `http://127.0.0.1:3000/api/v1`; scripts reject another target.
Use local/private variable values and avoid sharing/syncing populated credentials.
The supplied templates deliberately contain no real email credentials, passwords, or tokens.

Use existing `backend/.env.demo` locally to populate ONLY these credential mappings:

| Environment keys | Local demo keys |
|---|---|
| adminEmail / adminPassword | DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD |
| headEmail / headPassword | DEMO_HEAD_EMAIL / DEMO_HEAD_PASSWORD |
| facultyEmail / facultyPassword | DEMO_FACULTY_ONE_EMAIL / DEMO_FACULTY_ONE_PASSWORD |
| studentEmail / studentPassword | DEMO_STUDENT_ONE_EMAIL / DEMO_STUDENT_ONE_PASSWORD |
| otherFacultyEmail / otherFacultyPassword | DEMO_FACULTY_TWO_EMAIL / DEMO_FACULTY_TWO_PASSWORD |

Do not paste values into request literals, this guide, source code, screenshots, or Git.
The second Faculty credential is needed to test assignment restrictions without touching
seeded Grades. The inactive-login case uses a NEW managed fixture account, not a changed seed.

Leave all token/resource-ID fields blank initially. Login scripts capture tokens and IDs.
Never type assumed database IDs. The Admin directory request discovers the configured
second Faculty by email; it stops if that account is missing/inactive. For a directory
larger than 100 accounts, select the appropriate page without modifying any account.

## 3. Run controls, tokens, and rate limits

After actual testing is approved, set:

- allowTestWrites = `true` (default `false` deliberately blocks business writes).
- rateMode = `off`.
- runExpiredTokenTest = `false`.

Use ONE Runner iteration and execute folders in the supplied order. Leave scripts enabled.
If a client enforces a script timeout, allow at least 90000 ms for cooldowns. Request
timeout and script timeout are separate. Do not change server throttles to make tests pass.
If the client cannot accommodate a cooldown, pause manually between batches and resume
the correct prerequisite sequence after 61 seconds; do not remove authentication guards.

Successful login automatically saves the corresponding local Token and Id. The fixture
Student login uses its newly created random password; the second Faculty login occurs
later. JWTs expire after 30 minutes. If a token expires mid-session, renew it through
its login request, respecting the five-attempt limit, then resume after checking fixture state.

Ordinary scripts conservatively track attempts and wait when necessary:

- Login limit: five requests per minute per IP. The sequence includes four seeded-role
  logins, fixture Student login, second Faculty login, and later negative logins. The
  sixth ordinary login waits until the tracked window clears; this is an honest cooldown.
- General API: 100 requests/minute/IP. Ordinary scripts pace at a conservative 90
  tracked requests per 61 seconds. The normal sequence also pauses for login cooldown.
- Other clients share the server's IP budget. Wait at least 61 idle seconds before
  a fresh run, and avoid simultaneous manual/CLI runs.
- Unknown rateMode values are rejected. Optional rate requests bypass CLIENT pacing
  only so they can exercise the unchanged SERVER limit; they never spoof forwarding headers.

Missing credentials/IDs prevent sending the affected request. Unexpected HTTP statuses
stop a Runner sequence. Stop and inspect failed assertions; do not repeatedly run setup
requests against an existing fixture set, overwrite IDs, or treat skipped requests as passes.

## 4. Required execution order and CRUD demonstrations

### 01 Authentication

Log in as Admin, Head, Faculty, Student. Expect 200, Bearer token, expiresIn 1800, the
correct role, and safe profiles. The four /auth/me requests must also return 200.

### 02 Subjects

Create a unique test Subject → list/read → full PUT → delete with 204 → verify 404.
The Subject has no Enrollments, so successful deletion is a valid full CRUD demonstration.
Admin creates/deletes, Head updates, and Student/Faculty perform allowed reads.

### 03 Enrollments

Discover other Faculty ID, create a NEW active Student and a run-tagged parent Subject.
Create Enrollment → filtered list/read → full PUT to Completed → delete 204 → verify 404.
PUT omits dateEnrolled and asserts the original date is preserved. No Grades exist yet.
This is the second complete CRUD demonstration. Then create a NEW Enrollment retained
for Grades, log in the fixture Student, and verify its own filtered reads.

### 04 Grades

Assigned Faculty records Midterm, the fixture Student reads it, and Faculty patches it
to 95.00. Then create a second run-tagged Subject/Enrollment assigned to the other
Faculty and record its Grade with that Faculty token. These fixtures make denied
assignment tests safe: no negative mutation targets a seeded Grade.

### 05 Grade Inquiries

The fixture Student submits an own-Grade Pending inquiry. Verify null resolution fields.
Assigned Faculty resolves it. Submit another inquiry and resolve that one as Admin.
Head performs read-only oversight. A final Grade read asserts its score stayed 95.00;
inquiry resolution must never automatically update the Grade.

### 06 User Management

Verify Head's limited directory and Faculty's minimal assigned-Student projection.
Admin creates a separate managed fixture User and deactivates ONLY that new account.
Its generated local credentials are then used by the inactive-login negative request.
No existing demo account is renamed, deactivated, re-roled, or given a new password.

### 07 Security and Negative Tests

Normal mode covers generic invalid/inactive logins; missing/invalid JWTs; role denials;
Student filter/direct-ID ownership; Faculty assignment intersection; duplicate Subject/
Enrollment/Grade/User values; invalid bodies/scores; immutable associations/dates;
repeated resolution; limited directory access; and grade/enrollment-protected deletion.
All responses are checked for forbidden confidential fields and local password values.

The expired-token and rate-loop requests are separate opt-in scenarios described below.

## 5. Expected success for every production endpoint

| Method/path after /api/v1 | Success | Demonstration |
|---|---:|---|
| POST /auth/login | 200 | Role logins/captured JWT |
| GET /auth/me | 200 | Four safe current profiles |
| POST /subjects | 201 | Run-tagged Subject |
| GET /subjects | 200 | Bounded safe list |
| GET /subjects/:id | 200 | Captured Subject ID |
| PUT /subjects/:id | 200 | Full replacement |
| DELETE /subjects/:id | 204 | Unreferenced CRUD Subject |
| POST /enrollments | 201 | Active fixture Student/Subject |
| GET /enrollments?studentId=:id | 200 | Original filter, scoped pagination |
| GET /enrollments/:id | 200 | Captured Enrollment |
| PUT /enrollments/:id | 200 | Full editable fields, original date |
| DELETE /enrollments/:id | 204 | Ungraded CRUD Enrollment |
| POST /grades | 201 | Assigned Faculty only |
| GET /grades?studentId=:id | 200 | Original filter, own Student Grades |
| PATCH /grades/:id | 200 | Score/remarks; association/date immutable |
| POST /grade-inquiries | 201 | Student own Grade, server Pending state |
| GET /grade-inquiries | 200 | Own/assigned/oversight lists |
| PATCH /grade-inquiries/:id | 200 | Faculty/Admin server-owned resolution |
| GET /users | 200 | Head limited directory/Admin setup discovery |
| GET /users/:id | 200 | Role-appropriate safe projection |
| POST /users | 201 | Admin-created fictional accounts |
| PATCH /users/:id | 200 | Admin updates only managed fixture |

Other prepared assertions expect 400 (validation), 401 (authentication), 403 (role/
ownership), 404 (confirmed deleted resource), 409 (duplicate/history restriction),
and 429 (deliberate rate scenarios). Exact bodies come from the implemented DTOs;
Grades return exact two-place decimal strings, not invented numeric response fields.

## 6. Genuine expired-token test

1. While a freshly issued local token is valid, verify /auth/me succeeds with it.
2. Copy that UNMODIFIED token only into local expiredToken. Never edit payload/signature
   or import JWT_SECRET into Postman to fabricate a token.
3. Wait until its actual 30-minute expiry has passed.
4. Set runExpiredTokenTest = `true`, rateMode = `off`, and run only the [EXPIRED] request.
5. The pre-request script requires an expired exp claim; the API must return generic 401.
6. Restore the flag to `false` and clear expiredToken before export.

The claim check is a precondition, not local signature verification. Trusted provenance
comes from the earlier successful login/profile request. Blank/edited tokens do not
establish that genuine expiry protection passed. No expired-token test was executed here.

## 7. Intentional 429 tests — separate Runner runs

Run these only after ordinary testing, not mixed with screenshots of unrelated requests.
Use Collection Runner, NOT the single Send button: setNextRequest loops work in runs.

### Login limit

Wait at least 61 idle seconds. Set rateMode=`login`; clear rateLoginAttempt. Run the
collection with zero Runner delay (other requests skip), or select only [RATE LOGIN].
Expected: five 401 wrong-password responses, then 429 on iteration six. The loop stops.
Only that final assertion proves the rate-limit case; one successful warm-up is insufficient.

### General limit

Have a valid current Admin token first. Wait at least 61 idle seconds after other API
traffic. Set rateMode=`general`; clear rateGeneralAttempt. Use zero Runner delay and
run only [RATE GENERAL] (or the collection in that mode). Expected: 100 profile responses
with 200, then 429 on iteration 101, within the same server window. The loop stops.
If the token expires or other traffic consumes the budget, stop and repeat under clean
conditions rather than claiming the expected sequence occurred.

Restore rateMode=`off`, clear both counters, and wait 61 seconds before normal work.
The export defaults keep both rate scenarios disabled. No rate scenario was executed here.

## 8. Isolated fixture ownership, repeatability, and cleanup

testRunId is generated once for a fresh environment. Test Subjects use that uppercase
prefix; new User emails use the lowercase prefix under sgms.example.test. IDs are captured
from 201 responses, never assumed. Runtime fixture passwords are random local values.

The cleanupManifest records created table/ID pairs, run-identifying email/code/parent
references, request names, and timestamps—no credentials. Successful 201 responses are
captured even if their status was unexpected, helping investigate a failed negative test.
Write scripts require run ownership before targeting existing IDs or academic parents.

Before another full run, save the previous cleanupManifest privately under postman/.local/,
review/clean that run, and import a fresh BLANK environment template. Populate credentials
locally again. A new run ID prevents duplicate-data collisions; do not discard manifests
or silently reuse a partially completed setup. Resume partial runs only after checking IDs.

Subjects/Enrollments CRUD deletions happen BEFORE Grades are created. Academic fixtures
must remain for negative history tests. Grades, Inquiries, and Users have no DELETE API,
so attempting broader cleanup through invented endpoints is incorrect.

After execution, request a reviewed cleanup using the private manifest. Do not run broad
DELETE/TRUNCATE, reset a database, delete by shared demo actor alone, or disable FK checks.
No database cleanup has been executed or automatically embedded in this collection.

A safe database cleanup plan must:

1. Confirm the exact approved SGMS connection and manifest run ID/table allowlist.
2. Verify new User emails and Subject codes match the exact run prefix and IDs. Derive
   Enrollments only from those verified Subjects/Students, Grades only from those
   Enrollments, and Inquiries only from those Grades. Abort any inconsistent ownership.
3. Reconcile already-deleted CRUD IDs against their trusted captured creation records;
   do not guess ownership from an ID or timestamp alone.
4. Review audit rows using BOTH affected table and verified resource IDs, allowed
   test action names, known actors, and the run interval. Preserve DEMO_SEED and all
   unrelated audit/history. Never delete all audits belonging to seeded Admin/Faculty.
5. In one reviewed transaction, preserve all audit rows and remove only approved
   Inquiries, then Grades, Enrollments, Subjects, and unreferenced test-created Users.
   Retain any User referenced as a historical audit actor; deactivate that fixture
   account with an appropriate audit entry instead of deleting its audit history.
6. Verify remaining seed rows, account hashes/status, relationships, and audit history
   before commit; roll back any mismatch. Do not reset AUTO_INCREMENT counters.

This is a cleanup strategy, not permission to execute it during preparation. The existing
database verification expects the seed-only baseline, including its audit row; retaining
test artifacts intentionally requires distinguishing them before interpreting seed counts.

## 9. Real screenshots and final evidence

Only capture evidence AFTER approved actual execution. No screenshots were fabricated.
Useful captures: backend startup; four role login tests; both complete CRUD sequences;
Student own filtered records; assigned Faculty Grade changes; inquiry resolution;
generic 401; role/ownership 403; invalid score 400; duplicate/history 409; deliberate 429.

Show request name, method/path, relevant fictional fields, HTTP status, and Test Results.
For login evidence keep the accessToken key/expiry visible but redact the token value.
Hide passwords, Authorization values, environment secrets, .env/.env.demo, and secret
variable tooltips. Client consoles and raw Runner reports may contain full request bodies
and JWTs—keep them private. Store unredacted evidence only in ignored postman/.local/.
Use actual results; a skipped request is not a pass and an expected status is not evidence.

## 10. Safe export and submission

Export the collection as v2.1 only after genuine verification. Keep credentials referenced
as variables, remove saved response examples containing tokens, and inspect auth helpers,
scripts, descriptions, variables, and URLs for accidentally pasted secrets. This prepared
collection has empty saved response arrays and does not store runtime collection secrets.

Never overwrite the committed blank environment template with a populated export. Keep
private exports under postman/.local/ (ignored), or use the provided blank template for
submission. Every Email/Password/Token value and runtime fixture ID/manifest should be
blank in a fresh submission environment; baseUrl and nonsecret defaults can remain.
Marking a variable Secret masks UI display but does NOT guarantee export redaction.
Review JSON before sharing, and do not include console dumps or unredacted run reports.

Do not create the seventh Git commit until actual Postman execution and verification
have genuinely completed and the user authorizes the next step.

## References

- [Official Postman v2.1 collection schema](https://schema.postman.com/json/collection/v2.1.0/collection.json).
- [Postman script execution, skipping, and Runner workflows](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution/).
- [22 production routes](route-inventory.md), [authentication](authentication-security.md),
  [Subjects](subjects-api.md), [Enrollments](enrollments-api.md),
  [Grades/Inquiries/Users](remaining-modules-api.md).
