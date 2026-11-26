# Consolidated SGMS API reference

Local base http://127.0.0.1:3000/api/v1; browser /api/v1 uses the Vite /api proxy. Only POST
/auth/login is public. All other routes require Authorization: Bearer <token> and current Active
account/role. JWT access lifetime 1800 seconds. General 100/min/IP, login 5/min/IP; every route may
return 429, unexpected errors sanitized 500. No real token is reproduced.

All canonical ID/path/query rules, exact payloads, validation, success responses and ownership
restrictions are documented below. Only six collection lists paginate: page default 1(max1000000),
pageSize default 10(max100), ID ascending, envelope{data, page, pageSize, total, totalPages}. Only
enrollments/grades/grade-inquiries add optional studentId. No unsupported
search/sort/status/semester filters. Unknown/repeated query properties rejected. Requests use JSON;
unknown properties rejected, numeric body strings rejected. PUT requires all editable fields; PATCH
nonempty subset.

## All 22 endpoints

### 1. POST /api/v1/auth/login

Access: Public, active credentials, 5/min/IP. Authentication: public credential verification. Path:
none. Query: none. Body: email valid/lowercase/trimmed <=100; password string 1-72 UTF-8 bytes,
whitespace preserved. Success HTTP 200: accessToken, tokenType Bearer, expiresIn 1800, user
(seven-field safe profile). Errors: 400 invalid input; 401 generic authentication failure; 429 rate
limit; sanitized 500 unexpected failure.

Login validates bcrypt 12 and rejects inactive/unknown/bad-password with the same 401; /me returns
only the actor.

### 2. GET /api/v1/auth/me

Access: All roles, self. Authentication: JWT required. Path: none. Query: none. Body: None. Success
HTTP 200: safe profile: userId, firstName, lastName, email, role, accountStatus, createdAt. Errors:
400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 429 rate limit;
sanitized 500 unexpected failure.

Login validates bcrypt 12 and rejects inactive/unknown/bad-password with the same 401; /me returns
only the actor.

### 3. POST /api/v1/subjects

Access: Admin, Head. Authentication: JWT required. Path: none. Query: none. Body: See the exact
subjects schema/examples below. Success HTTP 201: resource object with the fields shown below.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404
missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 4. GET /api/v1/subjects

Access: All roles. Authentication: JWT required. Path: none. Query: page, pageSize. Body: None.
Success HTTP 200: pagination envelope of the resource projection. Errors: 400 invalid input; 401
invalid/missing authentication; 403 role/ownership rejection; 429 rate limit; sanitized 500
unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 5. GET /api/v1/subjects/:id

Access: All roles. Authentication: JWT required. Path: :id canonical positive signed INT1-2147483647
(no leading zeros, scientific notation or fractions). Query: none. Body: None. Success HTTP 200:
resource object with the fields shown below. Errors: 400 invalid input; 401 invalid/missing
authentication; 403 role/ownership rejection; 404 missing referenced/target resource where
applicable; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 6. PUT /api/v1/subjects/:id

Access: Admin, Head. Authentication: JWT required. Path: :id canonical positive signed
INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none. Body: See the
exact subjects schema/examples below. Success HTTP 200: resource object with the fields shown below.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404
missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 7. DELETE /api/v1/subjects/:id

Access: Admin, Head. Authentication: JWT required. Path: :id canonical positive signed
INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none. Body: None.
Success HTTP 204: Empty response body. Errors: 400 invalid input; 401 invalid/missing
authentication; 403 role/ownership rejection; 404 missing referenced/target resource where
applicable; 409 unique/history/state restriction where specified below; 429 rate limit; sanitized
500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 8. POST /api/v1/enrollments

Access: Admin, Head. Authentication: JWT required. Path: none. Query: none. Body: See the exact
enrollments schema/examples below. Success HTTP 201: resource object with the fields shown below.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404
missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 9. GET /api/v1/enrollments

Access: Scoped; optional studentId. Authentication: JWT required. Path: none. Query: page, pageSize,
optional studentId. Body: None. Success HTTP 200: pagination envelope of the resource projection.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 429
rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 10. GET /api/v1/enrollments/:id

Access: Admin/Head; own Student; assigned Faculty. Authentication: JWT required. Path: :id canonical
positive signed INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none.
Body: None. Success HTTP 200: resource object with the fields shown below. Errors: 400 invalid
input; 401 invalid/missing authentication; 403 role/ownership rejection; 404 missing
referenced/target resource where applicable; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 11. PUT /api/v1/enrollments/:id

Access: Admin, Head. Authentication: JWT required. Path: :id canonical positive signed
INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none. Body: See the
exact enrollments schema/examples below. Success HTTP 200: resource object with the fields shown
below. Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection;
404 missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 12. DELETE /api/v1/enrollments/:id

Access: Admin, Head. Authentication: JWT required. Path: :id canonical positive signed
INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none. Body: None.
Success HTTP 204: Empty response body. Errors: 400 invalid input; 401 invalid/missing
authentication; 403 role/ownership rejection; 404 missing referenced/target resource where
applicable; 409 unique/history/state restriction where specified below; 429 rate limit; sanitized
500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 13. GET /api/v1/grades

Access: Scoped; optional studentId. Authentication: JWT required. Path: none. Query: page, pageSize,
optional studentId. Body: None. Success HTTP 200: pagination envelope of the resource projection.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 429
rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 14. POST /api/v1/grades

Access: Assigned Faculty. Authentication: JWT required. Path: none. Query: none. Body: See the exact
grades schema/examples below. Success HTTP 201: resource object with the fields shown below. Errors:
400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404 missing
referenced/target resource where applicable; 409 unique/history/state restriction where specified
below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 15. PATCH /api/v1/grades/:id

Access: Assigned Faculty. Authentication: JWT required. Path: :id canonical positive signed
INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none. Body: See the
exact grades schema/examples below. Success HTTP 200: resource object with the fields shown below.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404
missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 16. GET /api/v1/grade-inquiries

Access: Scoped; optional studentId. Authentication: JWT required. Path: none. Query: page, pageSize,
optional studentId. Body: None. Success HTTP 200: pagination envelope of the resource projection.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 429
rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 17. POST /api/v1/grade-inquiries

Access: Student, own Grade. Authentication: JWT required. Path: none. Query: none. Body: See the
exact grade-inquiries schema/examples below. Success HTTP 201: resource object with the fields shown
below. Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection;
404 missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 18. PATCH /api/v1/grade-inquiries/:id

Access: Assigned Faculty, Admin. Authentication: JWT required. Path: :id canonical positive signed
INT1-2147483647 (no leading zeros, scientific notation or fractions). Query: none. Body: See the
exact grade-inquiries schema/examples below. Success HTTP 200: resource object with the fields shown
below. Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection;
404 missing referenced/target resource where applicable; 409 unique/history/state restriction where
specified below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 19. GET /api/v1/users

Access: Admin; limited Student/Faculty directory for Head. Authentication: JWT required. Path: none.
Query: page, pageSize. Body: None. Success HTTP 200: pagination envelope of the resource projection.
Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 429
rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 20. GET /api/v1/users/:id

Access: Admin; Head directory; Faculty self/assigned Students; Student self. Authentication: JWT
required. Path: :id canonical positive signed INT1-2147483647 (no leading zeros, scientific notation
or fractions). Query: none. Body: None. Success HTTP 200: resource object with the fields shown
below. Errors: 400 invalid input; 401 invalid/missing authentication; 403 role/ownership rejection;
404 missing referenced/target resource where applicable; 429 rate limit; sanitized 500 unexpected
failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 21. POST /api/v1/users

Access: Admin. Authentication: JWT required. Path: none. Query: none. Body: See the exact users
schema/examples below. Success HTTP 201: resource object with the fields shown below. Errors: 400
invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404 missing
referenced/target resource where applicable; 409 unique/history/state restriction where specified
below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

### 22. PATCH /api/v1/users/:id

Access: Admin. Authentication: JWT required. Path: :id canonical positive signed INT1-2147483647 (no
leading zeros, scientific notation or fractions). Query: none. Body: See the exact users
schema/examples below. Success HTTP 200: resource object with the fields shown below. Errors: 400
invalid input; 401 invalid/missing authentication; 403 role/ownership rejection; 404 missing
referenced/target resource where applicable; 409 unique/history/state restriction where specified
below; 429 rate limit; sanitized 500 unexpected failure.

Ownership, exact business restrictions and response projection: see the resource section below; list
totals are computed after scope predicates.

## Detailed resource contracts and fictional examples

The following consolidated module contracts describe final API behavior. Their examples use
illustrative IDs; no example was submitted in this review. Placeholder password/token strings are
not usable credentials.

## Endpoints and permissions

Base URL: `http://127.0.0.1:3000/api/v1`. Every request requires an Authorization Bearer token and a
currently active account. Existing JWT/role guards and rate limits apply.

| Method | Path          | Allowed roles          | Success      |
| ------ | ------------- | ---------------------- | ------------ |
| POST   | /subjects     | Admin, Department Head | 201          |
| GET    | /subjects     | All four roles         | 200          |
| GET    | /subjects/:id | All four roles         | 200          |
| PUT    | /subjects/:id | Admin, Department Head | 200          |
| DELETE | /subjects/:id | Admin, Department Head | 204, no body |

All four roles means Student, Faculty, Admin, Department Head. Faculty and Students have read-only
access to all Subjects. GET list and PUT preserve Lab 05 methods/paths.

## Validation

POST and PUT accept exactly the following fields. PUT requires ALL four editable fields; it is a
full replacement, not a partial update.

| Field       | Rules                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| subjectCode | String, trimmed and uppercased, 1–20 characters; starts with A–Z/0–9; remaining characters A–Z, 0–9, space, underscore, hyphen |
| subjectName | String, trimmed, 1–100 characters, no internal control characters                                                              |
| units       | Positive JSON integer, maximum 2147483647 (signed INT limit)                                                                   |
| facultyId   | Positive JSON integer, maximum 2147483647; existing active Faculty account                                                     |

Unknown fields, including subjectId and actorId, are rejected. Numeric strings, nulls, booleans, and
fractional numbers are not accepted for numeric body fields. Subject IDs are generated by MariaDB;
actor IDs come only from the JWT-verified current account.

`:id` must be a canonical positive decimal integer within the signed INT range. Zero, negatives,
fractions, scientific notation, leading zeros, and text return 400. A valid ID that does not exist
returns 404.

## POST example

```http
POST /api/v1/subjects
Authorization: Bearer <admin-or-head-token>
Content-Type: application/json

{
  "subjectCode": "ITEC116",
  "subjectName": "Systems Integration and Architecture 2",
  "units": 3,
  "facultyId": 3
}
```

Example 201 response (all IDs are illustrative; use actual returned IDs):

```json
{
  "subjectId": 7,
  "subjectCode": "ITEC116",
  "subjectName": "Systems Integration and Architecture 2",
  "units": 3,
  "facultyId": 3
}
```

Creation records SUBJECT_CREATE in the same transaction.

## GET list example and pagination

```http
GET /api/v1/subjects?page=1&pageSize=10
Authorization: Bearer <token-for-any-role>
```

Only `page` and `pageSize` query parameters are supported:

| Parameter | Default | Bounds            |
| --------- | ------: | ----------------- |
| page      |       1 | Integer 1–1000000 |
| pageSize  |      10 | Integer 1–100     |

Query strings must contain canonical positive decimal integers. Unknown parameters, repeated arrays,
empty values, fractions, and scientific notation return 400. Results are ordered by subjectId
ascending. No search/filter feature is added.

Schematic 200 response:

```json
{
  "data": [
    {
      "subjectId": 7,
      "subjectCode": "ITEC116",
      "subjectName": "Systems Integration and Architecture 2",
      "units": 3,
      "facultyId": 3
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

Total describes all Subjects. A valid distant page returns `data: []`, not 404. An empty table has
total/totalPages zero. Concurrent writes can affect offset pages between requests; this prototype
does not provide cross-request snapshot pagination.

## GET individual example

```http
GET /api/v1/subjects/7
Authorization: Bearer <token-for-any-role>
```

Returns 200 with the same five-field Subject object above, or 404. No Faculty/User relations, names,
emails, hashes, or account details are serialized.

## PUT example and academic restrictions

```http
PUT /api/v1/subjects/7
Authorization: Bearer <admin-or-head-token>
Content-Type: application/json

{
  "subjectCode": "ITEC116",
  "subjectName": "Updated Systems Integration",
  "units": 3,
  "facultyId": 3
}
```

Returns 200 with the five-field updated Subject. Successful updates, including a complete PUT with
unchanged values, record SUBJECT_UPDATE with the current actor.

Faculty reassignment returns 409 when ANY Grade belongs to an Enrollment for this Subject. Other
fields may be edited while retaining the same active Faculty. Reassignment is allowed if Enrollments
exist but have no Grades. Every POST/PUT revalidates Faculty.

## DELETE example

```http
DELETE /api/v1/subjects/7
Authorization: Bearer <admin-or-head-token>
```

Success returns 204 with an empty body and records SUBJECT_DELETE. Any Enrollment blocks deletion,
including Dropped/Completed records. The audit keeps the former ID as contextual metadata;
AuditLog.recordId is not an FK to the deleted Subject.

## Error codes

| Code | Meaning                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| 400  | Invalid body/route/query, missing PUT fields, inactive Faculty, or existing user whose role is not Faculty |
| 401  | Missing/invalid/expired JWT or unavailable/inactive authenticated account                                  |
| 403  | Faculty/Student attempts a mutation                                                                        |
| 404  | Missing Subject or target Faculty ID                                                                       |
| 409  | Duplicate normalized code, blocked reassignment/deletion, or detected transaction contention               |
| 429  | Existing general API rate limit                                                                            |
| 500  | Unexpected internal failure, including rejected audit insertion; mutation rolled back                      |

The existing unique index enforces subject code uniqueness, including concurrent duplicates.
Normalization uses uppercase and the database collation is case-insensitive. Fixed errors never
expose SQL, hashes, credentials, request data, or stack traces:

```json
{ "statusCode": 409, "message": "Conflict" }
```

```json
{ "statusCode": 500, "message": "Internal server error" }
```

## Transactional audit logging

Reusable AuditLogsModule exports `AuditLogsService.record(manager, entry)`. It requires the caller's
active transaction manager and never opens another connection. Each successful mutation stores actor
userId, SUBJECT_CREATE/UPDATE/DELETE, tableAffected `subjects`, recordId, and the database-generated
UTC timestamp. Reads and rejected operations do not create mutation audits. Passwords, tokens, and
request bodies are never written to audits.

The business mutation and audit insertion share one TypeORM transaction. An audit failure propagates
and rolls back both. There is no best-effort audit or swallowed error.

PUT/DELETE lock the Subject row for update. Faculty validation takes a shared row lock against
concurrent account changes. Reassignment locks existing Enrollments before checking Grades,
coordinating with Grade→Enrollment FK locks. Subject locks coordinate with new Enrollment FK checks.
Existing restrictive FKs remain the final safeguard. Deadlocks/timeouts return sanitized 409;
callers may retry. Future mutation modules must preserve these lock/transaction conventions.

## Automated tests and limitations

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run test:database
```

Subjects tests create temporary Users, Subjects, Enrollments, and a Grade in an outer uncommitted
transaction. User/Subject repository overrides bind the tested services to that transaction. Real
service transactions use MariaDB savepoints, allowing mutation and audit rollback tests while
preserving fixtures. Every test rolls back, closes its application, and checks temporary rows are
absent. Seeded accounts/data are never updated; the demo credential file is checked unchanged.
AUTO_INCREMENT gaps are expected.

Tests cover both mutating roles, all-role reads, JWT/403 rejection, duplicates, DTO/PUT/ query/ID
validation, Faculty eligibility, missing IDs, academic restrictions, pagination, audit actor/action
records, actual database rejection of audit INSERTs, rollback after an audit has been inserted, and
confidential-data exclusion. Fault injection uses Jest spies only; no production testing flag or
endpoint was added.

Verified results: build passed; 80 Subjects HTTP tests and all 31 existing authentication HTTP tests
passed (111 combined); 2 configuration unit tests and all 47 database checks passed. Reference PDF
hashes, the approved schema, and demo passwords are unchanged.

No other CRUD API, frontend, schema migration, or dependency upgrade was introduced.
Single-department scope, local HTTP, process-local rate limits, and the previously confirmed Windows
Application Control/lint limitation remain. See
[authentication security](authentication-security.md) and [database design](database-design.md).

## Endpoints and permissions

Base URL: `http://127.0.0.1:3000/api/v1`. Every request requires
`Authorization: Bearer <access-token>` and a currently active account.

| Method | Path             | Permissions                                               | Success         |
| ------ | ---------------- | --------------------------------------------------------- | --------------- |
| POST   | /enrollments     | Admin, Department Head                                    | 201             |
| GET    | /enrollments     | Admin/Head: all; Student: own; Faculty: assigned Subjects | 200             |
| GET    | /enrollments/:id | Same read ownership rules                                 | 200             |
| PUT    | /enrollments/:id | Admin, Department Head                                    | 200             |
| DELETE | /enrollments/:id | Admin, Department Head                                    | 204, empty body |

Department Head access covers this single-department prototype; no department table or
multi-department authorization model is introduced.

## Ownership and filtering

`GET /api/v1/enrollments?studentId=:id` remains supported.

- Student list queries always include `enrollment.studentId = authenticated userId`. An explicit
  studentId must match that user; another ID returns 403 even if it does not exist. Omitting the
  filter still returns only that Student's rows.
- Faculty list queries join Subject and require its CURRENT facultyId to match the authenticated
  Faculty account. A studentId filter is an additional intersection, never a replacement for the
  Subject assignment predicate.
- Admin/Head may list all rows or filter by studentId.
- A valid filter with no permitted matches returns 200 with an empty data array; a Faculty filter
  does not reveal whether matching unassigned records exist.
- Direct lookup uses the same SQL ownership predicate. An existing forbidden record returns 403; a
  missing ID returns 404. Only an existence probe is used to distinguish these cases; unauthorized
  contents are never retrieved or serialized.
- Totals are counted after the ownership/filter predicates, not across hidden records.
- Role/status comes from the existing current-account JWT guard; Subject assignment is evaluated
  from MariaDB on each read rather than embedded JWT data.

There are no Subject/Faculty query filters that could override these rules. Unknown query fields are
rejected. Mutation actor IDs come from CurrentUser, never the body.

## Request validation

All POST fields below are required. PUT requires the five editable fields and does not accept
dateEnrolled. Unknown properties, nulls, and numeric body strings are rejected.

| Field        | POST     | PUT       | Rules                                                             |
| ------------ | -------- | --------- | ----------------------------------------------------------------- |
| studentId    | Required | Required  | Positive JSON integer, at most 2147483647                         |
| subjectId    | Required | Required  | Positive JSON integer, at most 2147483647; Subject exists         |
| semester     | Required | Required  | Trimmed string, 1–20 characters, no internal control characters   |
| schoolYear   | Required | Required  | Trimmed YYYY-YYYY string; second year equals first year + 1       |
| status       | Required | Required  | Exactly Enrolled, Dropped, or Completed                           |
| dateEnrolled | Required | Read-only | Real calendar date YYYY-MM-DD, years 1000–9999, no time component |

Creation and changing the student assignment require an existing active Student account. A missing
Student returns 404; inactive or non-Student targets return 400. An unchanged historical Student
assignment can be retained while updating status even if that account has since become inactive. No
user/password information is exposed in either case.

Semester remains a validated free-text term as in Lab 04; no unapproved semester enum is invented.
Clients should use consistent term names. The existing case-insensitive database unique index
defines equality of the term identity.

Route :id must be a canonical positive decimal integer within the signed INT range. Zero, leading
zeros, negatives, fractions, scientific notation, and text return 400.

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

| Query     | Default | Bounds                                                |
| --------- | ------: | ----------------------------------------------------- |
| studentId | Omitted | Optional positive signed-INT ID, subject to ownership |
| page      |       1 | Integer 1–1000000                                     |
| pageSize  |      10 | Integer 1–100                                         |

These match Subjects pagination. Query strings must be canonical positive decimal integers; repeated
arrays, blank values, unknown fields, or out-of-bounds values return 400. Results are ordered by
enrollmentId ascending. A valid distant page is empty, not 404. Total/totalPages refer only to
authorized filtered rows.

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

Returns 200 with the same seven-field Enrollment object above, subject to ownership. Relations,
names, emails, account details, password hashes, and credentials are excluded.

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

Returns 200 with all seven fields. Original dateEnrolled is always preserved. Sending dateEnrolled
in PUT returns 400 rather than silently accepting a historical date change. Missing editable fields
also return 400; PUT is not a partial update.

When any Grade exists, studentId, subjectId, semester, and schoolYear cannot change. Status-only
changes remain allowed. Without Grades, identity changes are permitted subject to valid
Student/Subject references and unique enrollment identity.

Duplicate `(studentId, subjectId, semester, schoolYear)` combinations return 409 on both creation
and update, regardless of status/date. The existing unique index handles concurrent duplicates; no
fragile pre-check is used as the only uniqueness protection.

## DELETE example

```http
DELETE /api/v1/enrollments/7
Authorization: Bearer <admin-or-head-token>
```

Returns 204 with no response body. Any existing Grade blocks deletion with 409, regardless of the
Enrollment's status. Missing IDs return 404. Restrictive foreign keys remain enabled. The deletion
audit retains the former ID as contextual metadata.

## Status/error codes

| Code | Meaning                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| 200  | Successful reads/full update                                                                                             |
| 201  | Successful creation                                                                                                      |
| 204  | Successful deletion, empty body                                                                                          |
| 400  | Invalid fields/query/route/date, read-only date supplied to PUT, inactive/non-Student target                             |
| 401  | Missing/invalid/expired JWT or unavailable/inactive authenticated user                                                   |
| 403  | Unauthorized mutation role or forbidden Student/Faculty ownership                                                        |
| 404  | Missing Enrollment, Subject, or selected Student reference                                                               |
| 409  | Duplicate enrollment, grade-protected update/delete, changed concurrent Subject hint, or detected transaction contention |
| 429  | Existing general API rate limit                                                                                          |
| 500  | Unexpected internal/audit failure; mutation rolled back                                                                  |

Errors use the existing sanitized fixed response, for example:

```json
{ "statusCode": 403, "message": "Forbidden" }
```

```json
{ "statusCode": 409, "message": "Conflict" }
```

## Transactions, auditing, and concurrent operations

Every successful mutation calls the existing AuditLogsService with the SAME active transaction
manager and the authenticated actor userId:

- ENROLLMENT_CREATE
- ENROLLMENT_UPDATE
- ENROLLMENT_DELETE

Audit rows contain tableAffected `enrollments`, recordId, and the database UTC timestamp. Reads and
rejected writes do not create mutation audits. Audit errors propagate and roll back both sides; no
password, token, or request body is placed in audit text.

Create locks the Subject and validates the Student with shared locks. Replace/delete acquire shared
Subject locks before the Enrollment write lock, coordinating with Subjects CRUD's Subject→Enrollment
lock order. The preliminary Subject ID is only a lock-order hint; the locked Enrollment is rechecked
and a changed hint returns 409.

Grade existence uses a CURRENT locking read, not a potentially stale snapshot under REPEATABLE READ.
The Enrollment write lock serializes against Grade FK references. A Grade transaction that acquired
its reference lock first makes the mutation wait; after it commits, the operation sees the Grade and
rejects the restricted change. If a permitted mutation serializes first, a later Grade write must
validate against that resulting state in its future service. No Grade API is introduced here.

Unique constraints and restrictive FKs remain the database backstops. Detected deadlocks and lock
timeouts return 409; clients may retry. No automatic retry or relaxed constraint is used to hide a
conflict.

## Test isolation and commands

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run test:database
```

HTTP tests bind User/Enrollment repositories to an outer MariaDB transaction with temporary actors,
students, faculty assignments, enrollments, and a Grade. Service transactions use real savepoints;
cleanup rolls back fixtures and verifies absence. Existing seeded rows/passwords are never updated.
Each app is closed after its test.

Concurrency tests use uniquely named COMMITTED temporary fixtures because independent connections
cannot see each other's uncommitted rows. These tests call the actual EnrollmentsService using
separate real transactions. They race duplicate creates and updates, and hold a Grade INSERT
transaction open while an update/delete waits. Cleanup verifies fixture ownership by generated
prefixes/IDs, then removes only those fixtures and their audit/grade rows in dependency order. Table
counts return to their pre-test baseline. This is explicit scoped cleanup, never a database reset.

Both suites verify the demo credential file remains unchanged. AUTO_INCREMENT gaps from
rollback/cleanup are expected and are not reset. Run suites serially with runInBand. The existing
real-bcrypt login-limit test has a 20-second Jest deadline because the full regression workload
exceeded its original five-second deadline on this host. Bcrypt cost, production throttles,
assertions, and authentication behavior are unchanged.

Final verification: build passed; all 210 HTTP/integration tests passed (95 Enrollment HTTP, 4
independent-connection concurrency, 80 Subjects, 31 authentication); 2 configuration unit tests and
all 47 database checks passed. Fixture cleanup, original seed data/passwords, schema consistency,
Apache credential-file denial, and reference PDF hashes were verified.

No Grades, Grade Inquiries, User management, frontend, new schema, or dependency upgrade was added.
Local HTTP, single-department scope, process-local rate limits, and the known Windows Application
Control/lint limitation remain. See [authentication security](authentication-security.md),
[Subjects API](subjects-api.md), and [database design](database-design.md).

## Shared request/response rules

- List endpoints return `{ data, page, pageSize, total, totalPages }`, ordered by ID.
- page defaults to 1 (maximum 1000000); pageSize defaults to 10 (maximum 100).
- Canonical positive integer route IDs and query values only; no numeric body strings, scientific ID
  notation, repeated query arrays, or unknown fields.
- Grades/inquiries lists accept optional studentId. Students may specify only their own ID
  (otherwise 403). Faculty filters intersect CURRENT assigned Subjects. Admin/Head filters apply
  within the single-department prototype.
- List totals are counted after permission predicates. No permitted matches means 200 with
  `data: []`, not disclosure of unauthorized records.
- Unknown query/body properties return 400. PATCH requires at least one allowed field.
- Errors are fixed and sanitized, e.g. `{ "statusCode": 409, "message": "Conflict" }`.
- 200 reads/updates; 201 creation; 400 invalid input/ineligible account; 401 invalid authentication;
  403 forbidden role/ownership; 404 missing resources; 409 duplicate, history/account restriction or
  transaction contention; 429 rate limit; sanitized 500 for unexpected/audit failures. An existing
  out-of-scope direct User ID returns 403; a nonexistent User returns 404.

## Grades

| Method/path       | Permissions                                                   | Success |
| ----------------- | ------------------------------------------------------------- | ------- |
| GET /grades       | Student own; Faculty assigned Subjects; Admin/Head monitoring | 200     |
| POST /grades      | Assigned Faculty only                                         | 201     |
| PATCH /grades/:id | Assigned Faculty only                                         | 200     |

The original `GET /grades?studentId=:id` and PATCH path/method are preserved. Ownership is enforced
in SQL through Grade→Enrollment→Subject; client filters cannot replace those predicates. Unassigned
Faculty receives 403 on Grade mutations.

POST requires enrollmentId (positive signed INT), gradeType (Midterm or Final), score (JSON number
0–100 with at most two decimal places). Remarks is optional/null, trimmed, and at most 30
characters, matching the existing VARCHAR(30). Scores are checked by class-validator AND the
existing `assertGradeScore` pre-write validator before conversion to DECIMAL(5, 2). Decimal values
are returned as exact two-place strings, consistent with the TypeORM decimal storage representation.

```http
POST /api/v1/grades
Authorization: Bearer <assigned-faculty-token>
Content-Type: application/json

{
  "enrollmentId": 7,
  "gradeType": "Midterm",
  "score": 92.5,
  "remarks": "Passed"
}
```

Illustrative 201 response (IDs/timestamps are examples, not existing fixture credentials):

```json
{
  "gradeId": 9,
  "enrollmentId": 7,
  "gradeType": "Midterm",
  "score": "92.50",
  "remarks": "Passed",
  "dateRecorded": "2026-11-25T01:00:00.000Z"
}
```

New Grade recording requires an Enrolled Enrollment and an active Student account. Dropped/Completed
enrollments return 409; inactive/non-Student accounts return 400. Missing Enrollment/Grade
returns 404. Duplicate `(enrollmentId, gradeType)` is 409. Admin/Head cannot record or modify
Grades.

```http
GET /api/v1/grades?studentId=1&page=1&pageSize=10
Authorization: Bearer <authorized-token>
```

GET returns a pagination envelope whose data contains the six-field Grade objects above. Student
requests for another studentId return 403; Faculty requests with no matching assigned records return
an empty scoped list.

```http
PATCH /api/v1/grades/9
Authorization: Bearer <assigned-faculty-token>
Content-Type: application/json

{ "score": 95, "remarks": null }
```

PATCH accepts only gradeType, score, remarks. Enrollment association and dateRecorded are read-only:
attempts to supply them return 400. The original recording date is preserved. Existing historical
Grades can be corrected by assigned Faculty even if the Enrollment is now Completed/Dropped; the
eligibility restriction applies to NEW recording. A gradeType change cannot create a duplicate.
Success returns the six-field updated Grade. No GPA, weights, automatic formula, or extra grading
period is introduced.

## Grade Inquiries

| Method/path                | Permissions                                         | Success |
| -------------------------- | --------------------------------------------------- | ------- |
| GET /grade-inquiries       | Student own; Faculty assigned; Admin/Head oversight | 200     |
| POST /grade-inquiries      | Student, concerning own Grade                       | 201     |
| PATCH /grade-inquiries/:id | Assigned Faculty or Admin; resolution only          | 200     |

Messages and resolution notes are trimmed, 1–4000 characters, at most 16000 UTF-8 bytes, and reject
NUL. This bounded input fits the existing TEXT columns.

```http
POST /api/v1/grade-inquiries
Authorization: Bearer <student-token>
Content-Type: application/json

{ "gradeId": 9, "message": "Please explain the assessment breakdown." }
```

The server derives studentId from the authenticated account and verifies Grade ownership through
Enrollment. Supplying studentId, status, or resolution fields is rejected. An inquiry about another
Student's Grade returns 403; a missing Grade returns 404.

Illustrative 201 response:

```json
{
  "inquiryId": 11,
  "gradeId": 9,
  "studentId": 1,
  "message": "Please explain the assessment breakdown.",
  "status": "Pending",
  "dateSubmitted": "2026-11-25T02:00:00.000Z",
  "resolvedBy": null,
  "resolutionNote": null,
  "dateResolved": null
}
```

```http
GET /api/v1/grade-inquiries?page=1&pageSize=10
Authorization: Bearer <authorized-token>
```

Returns a pagination envelope of the nine-field inquiry objects above. Student reads require both
inquiry.studentId AND the Grade's Enrollment owner to match the actor; Faculty queries require
current Subject assignment. Optional studentId is authorized exactly as described under shared
rules.

```http
PATCH /api/v1/grade-inquiries/11
Authorization: Bearer <assigned-faculty-or-admin-token>
Content-Type: application/json

{ "resolutionNote": "The recorded assessment has been verified." }
```

Success returns the same nine fields with status Resolved, resolvedBy set to the current actor, and
dateResolved generated by the server at UTC second precision. An empty/missing note is 400. Client
status/resolver/time fields are not accepted. Repeated/concurrent resolution returns 409 and cannot
overwrite the winner's note. There is no reopening or deletion endpoint. Resolution NEVER modifies
the Grade.

## User Management

| Method/path      | Permissions                                                                   | Success |
| ---------------- | ----------------------------------------------------------------------------- | ------- |
| GET /users       | Admin directory; Head limited Student/Faculty directory                       | 200     |
| GET /users/:id   | Admin all; Head Student/Faculty; Faculty self/assigned Students; Student self | 200     |
| POST /users      | Admin only                                                                    | 201     |
| PATCH /users/:id | Admin only                                                                    | 200     |

Admin responses and own Student/Faculty profiles contain only userId, firstName, lastName, email,
role, accountStatus, createdAt. Head directory responses and Faculty views of assigned Students
contain only userId, firstName, lastName, role. They exclude email and account status. Head can
always use `/auth/me` for their own full safe profile; the User directory itself remains limited to
Students/Faculty. Faculty directory lists are not permitted; Faculty can retrieve minimal
enrolled-Student information by ID.

```http
POST /api/v1/users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "firstName": "Fictional",
  "lastName": "Student",
  "email": "fictional.student@sgms.example.test",
  "password": "<new-local-password>",
  "role": "Student",
  "accountStatus": "Active"
}
```

Names: trimmed strings, 1–50 characters, no control characters. Email: trimmed, lowercase, valid
email, maximum 100 characters, unique under the existing index. New/replacement passwords: at least
8 characters, 8–72 UTF-8 bytes, never trimmed; bcrypt cost 12. Login retains its existing
compatibility rules. Roles are exactly Student, Faculty, Admin, Department Head; statuses Active or
Inactive.

Illustrative 201 response:

```json
{
  "userId": 15,
  "firstName": "Fictional",
  "lastName": "Student",
  "email": "fictional.student@sgms.example.test",
  "role": "Student",
  "accountStatus": "Active",
  "createdAt": "2026-11-25T03:00:00.000Z"
}
```

```http
GET /api/v1/users?page=1&pageSize=10
Authorization: Bearer <admin-or-head-token>
```

Returns the shared pagination envelope with role-appropriate projections. Head queries filter roles
in SQL before counting. Unknown filters (e.g. role/email) return 400.

```http
GET /api/v1/users/15
Authorization: Bearer <authorized-token>
```

Returns the safe projection permitted for the actor. Faculty access to another User requires that
User be a Student with an Enrollment in a currently assigned Subject. Students cannot retrieve
another account. Unauthorized existing IDs return 403; missing IDs return 404. Neither path returns
passwordHash.

```http
PATCH /api/v1/users/15
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "accountStatus": "Inactive" }
```

PATCH allows firstName, lastName, email, password, role, accountStatus only and requires at least
one field. Nulls, userId, passwordHash, createdAt, and unknown fields return 400. New passwords are
hashed; absent password leaves the original hash untouched. createdAt is preserved. Duplicate email
returns 409. No permanent User deletion exists.

The last active Admin cannot be deactivated or moved to another role (409). Current active-Admin
rows are locked before account-policy decisions, serializing competing promotions/deactivations.
Actors are rechecked as active Admin inside the transaction.

Role changes cannot invalidate Student Enrollment/inquiry ownership, Faculty Subject assignments, or
inquiry resolution history. Users with Student references must remain Student; assigned Faculty must
remain Faculty; historical resolvers must remain Faculty or Admin. Status deactivation preserves all
records and causes subsequent protected requests to fail through the existing JWT guard. Audit
history is never deleted or rewritten.

Passwords are write-only. Password changes do not add a token denylist; an existing token remains
valid until expiry unless account status/role changes deny its use. This is the existing scoped JWT
design, not a new logout/reset-token system.

## Transactional audit and concurrency

Successful writes reuse AuditLogsService with the SAME transaction manager: GRADE_CREATE,
GRADE_UPDATE, INQUIRY_CREATE, INQUIRY_RESOLVE, USER_CREATE, USER_UPDATE. Each records actor ID,
affected table, record ID, and UTC timestamp only. Passwords, hashes, tokens, notes, and request
payloads are not copied into audit actions. Audit insertion failure rolls back the corresponding
mutation. Audit remains internal.

Academic write locks use Subject → Enrollment → Grade → Inquiry order. Parent IDs read outside a
transaction are hints, rechecked against locked current rows. Grade creation locks the Enrollment
before eligibility checks/insertion, coordinating with existing Subject reassignment and Enrollment
identity/delete restrictions. Inquiry resolution locks its current state and can transition
Pending→Resolved only once.

User writes lock active Admin candidates, then validate actor/target policy. Shared account locks in
academic services coordinate account role changes with new references. Existing FK/unique
constraints remain enabled. Contention/deadlocks return sanitized 409 and may be retried;
constraints are never relaxed to force a write through.

## Automated verification and isolation

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run test:database
```

HTTP tests use fictional Users/Subjects/Enrollments/Grades/Inquiries in an outer transaction.
Repository overrides bind real services to it; service transactions use MariaDB savepoints. Fixtures
are rolled back and checked absent. Fault injection rejects actual audit INSERTs for all six actions
and verifies rollback of each business write.

Concurrency tests use independent connections with committed uniquely tagged fixtures, then verify
ownership and remove only those rows in dependency order. Counts return to their baseline. They
cover duplicate Grades, Grade commits blocking Enrollment changes, single-winner inquiry resolution,
last-two-Admin deactivation, and role/assignment races. The last-Admin edge case scopes the policy
population to temporary Admin IDs AFTER running the real locking query; it never deactivates seeded
Admins. That scoping exists only as a Jest spy, not a production flag or alternate authorization
path.

Route tests traverse production module/controller metadata and require exactly the 22 planned
method/path pairs, all original ten Lab 05 endpoints, and login as the only public endpoint. Test
fixture controllers are not part of AppModule or the production build.

No schema changes, seed resets/password regeneration, unrelated database/project edits, Postman
collection preparation, frontend, dependency upgrades, or OS-policy bypass occurred. Known limits
remain: single department, one current Faculty per Subject, local HTTP only, process-local
throttling, and the pre-existing Windows Application Control/lint restriction. Account-policy locks
are deliberately coarse for this small prototype and may produce retryable conflicts under
contention. See the earlier security/database documentation.

Final verification: build passed; 309 HTTP/integration tests passed across six suites (93 new module
HTTP, 6 new concurrency, and all 210 prior regression tests); 5 unit/ route-contract tests and all
47 database checks passed. Seed data/passwords, schema consistency, fixture cleanup, Apache
protection, and unchanged PDF hashes were verified.

## Authentication request and response

POST /api/v1/auth/login body: {"email":"learner@example.invalid","password":"<private-password>"};
placeholder only. Success200 has accessToken, tokenType:"Bearer", expiresIn:1800, user. GET
/api/v1/auth/me has no body/query and returns userId, firstName, lastName, email, role,
accountStatus, createdAt directly. No password/hash ever returned. JWT invalid/expired/missing or
current inactive account ->401; re-login obtains a new token. Frontend memory-only logout does not
revoke existing JWTs. Exact guard/service/configuration evidence: backend/src/auth and
backend/src/common.
