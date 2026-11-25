# Enrollments CRUD — Step 11

Implements Lab 04's existing Enrollment entity, preserves Lab 05's Enrollment routes
and studentId query filter, and applies Lab 06 authentication and ownership rules.
No schema, reference PDF, dependency version, or existing demo password was changed.

## Endpoints and permissions

Base URL: `http://127.0.0.1:3000/api/v1`. Every request requires
`Authorization: Bearer <access-token>` and a currently active account.

| Method | Path | Permissions | Success |
|---|---|---|---|
| POST | /enrollments | Admin, Department Head | 201 |
| GET | /enrollments | Admin/Head: all; Student: own; Faculty: assigned Subjects | 200 |
| GET | /enrollments/:id | Same read ownership rules | 200 |
| PUT | /enrollments/:id | Admin, Department Head | 200 |
| DELETE | /enrollments/:id | Admin, Department Head | 204, empty body |

Department Head access covers this single-department prototype; no department table
or multi-department authorization model is introduced.

## Ownership and filtering

`GET /api/v1/enrollments?studentId=:id` remains supported.

- Student list queries always include `enrollment.studentId = authenticated userId`.
  An explicit studentId must match that user; another ID returns 403 even if it does
  not exist. Omitting the filter still returns only that Student's rows.
- Faculty list queries join Subject and require its CURRENT facultyId to match the
  authenticated Faculty account. A studentId filter is an additional intersection,
  never a replacement for the Subject assignment predicate.
- Admin/Head may list all rows or filter by studentId.
- A valid filter with no permitted matches returns 200 with an empty data array;
  a Faculty filter does not reveal whether matching unassigned records exist.
- Direct lookup uses the same SQL ownership predicate. An existing forbidden record
  returns 403; a missing ID returns 404. Only an existence probe is used to distinguish
  these cases; unauthorized contents are never retrieved or serialized.
- Totals are counted after the ownership/filter predicates, not across hidden records.
- Role/status comes from the existing current-account JWT guard; Subject assignment
  is evaluated from MariaDB on each read rather than embedded JWT data.

There are no Subject/Faculty query filters that could override these rules. Unknown
query fields are rejected. Mutation actor IDs come from CurrentUser, never the body.

## Request validation

All POST fields below are required. PUT requires the five editable fields and does
not accept dateEnrolled. Unknown properties, nulls, and numeric body strings are rejected.

| Field | POST | PUT | Rules |
|---|---|---|---|
| studentId | Required | Required | Positive JSON integer, at most 2147483647 |
| subjectId | Required | Required | Positive JSON integer, at most 2147483647; Subject exists |
| semester | Required | Required | Trimmed string, 1–20 characters, no internal control characters |
| schoolYear | Required | Required | Trimmed YYYY-YYYY string; second year equals first year + 1 |
| status | Required | Required | Exactly Enrolled, Dropped, or Completed |
| dateEnrolled | Required | Read-only | Real calendar date YYYY-MM-DD, years 1000–9999, no time component |

Creation and changing the student assignment require an existing active Student account.
A missing Student returns 404; inactive or non-Student targets return 400. An unchanged
historical Student assignment can be retained while updating status even if that account
has since become inactive. No user/password information is exposed in either case.

Semester remains a validated free-text term as in Lab 04; no unapproved semester enum
is invented. Clients should use consistent term names. The existing case-insensitive
database unique index defines equality of the term identity.

Route :id must be a canonical positive decimal integer within the signed INT range.
Zero, leading zeros, negatives, fractions, scientific notation, and text return 400.

## POST example

```http
POST /api/v1/enrollments
Authorization: Bearer <admin-or-head-token>
Content-Type: application/json

{
  "studentId": 1,
  "subjectId": 2,
  "semester": "1st Semester",
  "schoolYear": "2026-2027",
  "dateEnrolled": "2026-08-17",
  "status": "Enrolled"
}
```

Illustrative 201 response (use actual IDs and avoid an already-enrolled combination):

```json
{
  "enrollmentId": 7,
  "studentId": 1,
  "subjectId": 2,
  "semester": "1st Semester",
  "schoolYear": "2026-2027",
  "dateEnrolled": "2026-08-17",
  "status": "Enrolled"
}
```

## GET list example and bounded pagination

```http
GET /api/v1/enrollments?studentId=1&page=1&pageSize=10
Authorization: Bearer <authorized-token>
```

| Query | Default | Bounds |
|---|---:|---|
| studentId | Omitted | Optional positive signed-INT ID, subject to ownership |
| page | 1 | Integer 1–1000000 |
| pageSize | 10 | Integer 1–100 |

These match Subjects pagination. Query strings must be canonical positive decimal
integers; repeated arrays, blank values, unknown fields, or out-of-bounds values return
400. Results are ordered by enrollmentId ascending. A valid distant page is empty,
not 404. Total/totalPages refer only to authorized filtered rows.

Schematic 200 response:

```json
{
  "data": [
    {
      "enrollmentId": 7,
      "studentId": 1,
      "subjectId": 2,
      "semester": "1st Semester",
      "schoolYear": "2026-2027",
      "dateEnrolled": "2026-08-17",
      "status": "Enrolled"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

## GET individual example

```http
GET /api/v1/enrollments/7
Authorization: Bearer <authorized-token>
```

Returns 200 with the same seven-field Enrollment object above, subject to ownership.
Relations, names, emails, account details, password hashes, and credentials are excluded.

## PUT example and academic-history rules

```http
PUT /api/v1/enrollments/7
Authorization: Bearer <admin-or-head-token>
Content-Type: application/json

{
  "studentId": 1,
  "subjectId": 2,
  "semester": "1st Semester",
  "schoolYear": "2026-2027",
  "status": "Completed"
}
```

Returns 200 with all seven fields. Original dateEnrolled is always preserved. Sending
dateEnrolled in PUT returns 400 rather than silently accepting a historical date change.
Missing editable fields also return 400; PUT is not a partial update.

When any Grade exists, studentId, subjectId, semester, and schoolYear cannot change.
Status-only changes remain allowed. Without Grades, identity changes are permitted
subject to valid Student/Subject references and unique enrollment identity.

Duplicate `(studentId, subjectId, semester, schoolYear)` combinations return 409 on
both creation and update, regardless of status/date. The existing unique index handles
concurrent duplicates; no fragile pre-check is used as the only uniqueness protection.

## DELETE example

```http
DELETE /api/v1/enrollments/7
Authorization: Bearer <admin-or-head-token>
```

Returns 204 with no response body. Any existing Grade blocks deletion with 409,
regardless of the Enrollment's status. Missing IDs return 404. Restrictive foreign keys
remain enabled. The deletion audit retains the former ID as contextual metadata.

## Status/error codes

| Code | Meaning |
|---|---|
| 200 | Successful reads/full update |
| 201 | Successful creation |
| 204 | Successful deletion, empty body |
| 400 | Invalid fields/query/route/date, read-only date supplied to PUT, inactive/non-Student target |
| 401 | Missing/invalid/expired JWT or unavailable/inactive authenticated user |
| 403 | Unauthorized mutation role or forbidden Student/Faculty ownership |
| 404 | Missing Enrollment, Subject, or selected Student reference |
| 409 | Duplicate enrollment, grade-protected update/delete, changed concurrent Subject hint, or detected transaction contention |
| 429 | Existing general API rate limit |
| 500 | Unexpected internal/audit failure; mutation rolled back |

Errors use the existing sanitized fixed response, for example:

```json
{ "statusCode": 403, "message": "Forbidden" }
```

```json
{ "statusCode": 409, "message": "Conflict" }
```

## Transactions, auditing, and concurrent operations

Every successful mutation calls the existing AuditLogsService with the SAME active
transaction manager and the authenticated actor userId:

- ENROLLMENT_CREATE
- ENROLLMENT_UPDATE
- ENROLLMENT_DELETE

Audit rows contain tableAffected `enrollments`, recordId, and the database UTC timestamp.
Reads and rejected writes do not create mutation audits. Audit errors propagate and roll
back both sides; no password, token, or request body is placed in audit text.

Create locks the Subject and validates the Student with shared locks. Replace/delete
acquire shared Subject locks before the Enrollment write lock, coordinating with
Subjects CRUD's Subject→Enrollment lock order. The preliminary Subject ID is only a
lock-order hint; the locked Enrollment is rechecked and a changed hint returns 409.

Grade existence uses a CURRENT locking read, not a potentially stale snapshot under
REPEATABLE READ. The Enrollment write lock serializes against Grade FK references.
A Grade transaction that acquired its reference lock first makes the mutation wait;
after it commits, the operation sees the Grade and rejects the restricted change.
If a permitted mutation serializes first, a later Grade write must validate against
that resulting state in its future service. No Grade API is introduced here.

Unique constraints and restrictive FKs remain the database backstops. Detected deadlocks
and lock timeouts return 409; clients may retry. No automatic retry or relaxed constraint
is used to hide a conflict.

## Test isolation and commands

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run test:database
```

HTTP tests bind User/Enrollment repositories to an outer MariaDB transaction with
temporary actors, students, faculty assignments, enrollments, and a Grade. Service
transactions use real savepoints; cleanup rolls back fixtures and verifies absence.
Existing seeded rows/passwords are never updated. Each app is closed after its test.

Concurrency tests use uniquely named COMMITTED temporary fixtures because independent
connections cannot see each other's uncommitted rows. These tests call the actual
EnrollmentsService using separate real transactions. They race duplicate creates and
updates, and hold a Grade INSERT transaction open while an update/delete waits. Cleanup
verifies fixture ownership by generated prefixes/IDs, then removes only those fixtures
and their audit/grade rows in dependency order. Table counts return to their pre-test
baseline. This is explicit scoped cleanup, never a database reset.

Both suites verify the demo credential file remains unchanged. AUTO_INCREMENT gaps
from rollback/cleanup are expected and are not reset. Run suites serially with runInBand.
The existing real-bcrypt login-limit test has a 20-second Jest deadline because the
full regression workload exceeded its original five-second deadline on this host.
Bcrypt cost, production throttles, assertions, and authentication behavior are unchanged.

Final verification: build passed; all 210 HTTP/integration tests passed (95 Enrollment
HTTP, 4 independent-connection concurrency, 80 Subjects, 31 authentication); 2 configuration
unit tests and all 47 database checks passed. Fixture cleanup, original seed data/passwords,
schema consistency, Apache credential-file denial, and reference PDF hashes were verified.

No Grades, Grade Inquiries, User management, frontend, new schema, or dependency upgrade
was added. Local HTTP, single-department scope, process-local rate limits, and the known
Windows Application Control/lint limitation remain. See [authentication security](authentication-security.md),
[Subjects API](subjects-api.md), and [database design](database-design.md).
