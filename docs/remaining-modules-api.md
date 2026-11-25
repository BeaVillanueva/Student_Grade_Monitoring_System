# Grades, Grade Inquiries, and User Management — Step 12

Based on Labs 04–06, the final project, and the approved 22-endpoint architecture.
The existing six entities/schema remain unchanged. No frontend or final Postman
collection was prepared. See [complete route inventory](route-inventory.md).

All paths below use `/api/v1` and require `Authorization: Bearer <token>`.
Only the existing login endpoint is public. Current role/status is reloaded from
MariaDB, and the existing 100-per-minute general IP rate limit still applies.

## Shared request/response rules

- List endpoints return `{ data, page, pageSize, total, totalPages }`, ordered by ID.
- page defaults to 1 (maximum 1000000); pageSize defaults to 10 (maximum 100).
- Canonical positive integer route IDs and query values only; no numeric body strings,
  scientific ID notation, repeated query arrays, or unknown fields.
- Grades/inquiries lists accept optional studentId. Students may specify only their
  own ID (otherwise 403). Faculty filters intersect CURRENT assigned Subjects.
  Admin/Head filters apply within the single-department prototype.
- List totals are counted after permission predicates. No permitted matches means
  200 with `data: []`, not disclosure of unauthorized records.
- Unknown query/body properties return 400. PATCH requires at least one allowed field.
- Errors are fixed and sanitized, e.g. `{ "statusCode": 409, "message": "Conflict" }`.
- 200 reads/updates; 201 creation; 400 invalid input/ineligible account; 401 invalid
  authentication; 403 forbidden role/ownership; 404 missing resources; 409 duplicate,
  history/account restriction or transaction contention; 429 rate limit; sanitized
  500 for unexpected/audit failures. An existing out-of-scope direct User ID returns
  403; a nonexistent User returns 404.

## Grades

| Method/path | Permissions | Success |
|---|---|---|
| GET /grades | Student own; Faculty assigned Subjects; Admin/Head monitoring | 200 |
| POST /grades | Assigned Faculty only | 201 |
| PATCH /grades/:id | Assigned Faculty only | 200 |

The original `GET /grades?studentId=:id` and PATCH path/method are preserved.
Ownership is enforced in SQL through Grade→Enrollment→Subject; client filters cannot
replace those predicates. Unassigned Faculty receives 403 on Grade mutations.

POST requires enrollmentId (positive signed INT), gradeType (Midterm or Final),
score (JSON number 0–100 with at most two decimal places). Remarks is optional/null,
trimmed, and at most 30 characters, matching the existing VARCHAR(30).
Scores are checked by class-validator AND the existing `assertGradeScore` pre-write
validator before conversion to DECIMAL(5,2). Decimal values are returned as exact
two-place strings, consistent with the TypeORM decimal storage representation.

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

New Grade recording requires an Enrolled Enrollment and an active Student account.
Dropped/Completed enrollments return 409; inactive/non-Student accounts return 400.
Missing Enrollment/Grade returns 404. Duplicate `(enrollmentId, gradeType)` is 409.
Admin/Head cannot record or modify Grades.

```http
GET /api/v1/grades?studentId=1&page=1&pageSize=10
Authorization: Bearer <authorized-token>
```

GET returns a pagination envelope whose data contains the six-field Grade objects
above. Student requests for another studentId return 403; Faculty requests with no
matching assigned records return an empty scoped list.

```http
PATCH /api/v1/grades/9
Authorization: Bearer <assigned-faculty-token>
Content-Type: application/json

{ "score": 95, "remarks": null }
```

PATCH accepts only gradeType, score, remarks. Enrollment association and dateRecorded
are read-only: attempts to supply them return 400. The original recording date is
preserved. Existing historical Grades can be corrected by assigned Faculty even if
the Enrollment is now Completed/Dropped; the eligibility restriction applies to NEW
recording. A gradeType change cannot create a duplicate. Success returns the six-field
updated Grade. No GPA, weights, automatic formula, or extra grading period is introduced.

## Grade Inquiries

| Method/path | Permissions | Success |
|---|---|---|
| GET /grade-inquiries | Student own; Faculty assigned; Admin/Head oversight | 200 |
| POST /grade-inquiries | Student, concerning own Grade | 201 |
| PATCH /grade-inquiries/:id | Assigned Faculty or Admin; resolution only | 200 |

Messages and resolution notes are trimmed, 1–4000 characters, at most 16000 UTF-8
bytes, and reject NUL. This bounded input fits the existing TEXT columns.

```http
POST /api/v1/grade-inquiries
Authorization: Bearer <student-token>
Content-Type: application/json

{ "gradeId": 9, "message": "Please explain the assessment breakdown." }
```

The server derives studentId from the authenticated account and verifies Grade ownership
through Enrollment. Supplying studentId, status, or resolution fields is rejected.
An inquiry about another Student's Grade returns 403; a missing Grade returns 404.

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

Returns a pagination envelope of the nine-field inquiry objects above. Student reads
require both inquiry.studentId AND the Grade's Enrollment owner to match the actor;
Faculty queries require current Subject assignment. Optional studentId is authorized
exactly as described under shared rules.

```http
PATCH /api/v1/grade-inquiries/11
Authorization: Bearer <assigned-faculty-or-admin-token>
Content-Type: application/json

{ "resolutionNote": "The recorded assessment has been verified." }
```

Success returns the same nine fields with status Resolved, resolvedBy set to the
current actor, and dateResolved generated by the server at UTC second precision.
An empty/missing note is 400. Client status/resolver/time fields are not accepted.
Repeated/concurrent resolution returns 409 and cannot overwrite the winner's note.
There is no reopening or deletion endpoint. Resolution NEVER modifies the Grade.

## User Management

| Method/path | Permissions | Success |
|---|---|---|
| GET /users | Admin directory; Head limited Student/Faculty directory | 200 |
| GET /users/:id | Admin all; Head Student/Faculty; Faculty self/assigned Students; Student self | 200 |
| POST /users | Admin only | 201 |
| PATCH /users/:id | Admin only | 200 |

Admin responses and own Student/Faculty profiles contain only userId, firstName,
lastName, email, role, accountStatus, createdAt. Head directory responses and Faculty
views of assigned Students contain only userId, firstName, lastName, role. They exclude
email and account status. Head can always use `/auth/me` for their own full safe profile;
the User directory itself remains limited to Students/Faculty. Faculty directory lists
are not permitted; Faculty can retrieve minimal enrolled-Student information by ID.

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

Names: trimmed strings, 1–50 characters, no control characters. Email: trimmed,
lowercase, valid email, maximum 100 characters, unique under the existing index.
New/replacement passwords: at least 8 characters, 8–72 UTF-8 bytes, never trimmed;
bcrypt cost 12. Login retains its existing compatibility rules. Roles are exactly
Student, Faculty, Admin, Department Head; statuses Active or Inactive.

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

Returns the shared pagination envelope with role-appropriate projections. Head queries
filter roles in SQL before counting. Unknown filters (e.g. role/email) return 400.

```http
GET /api/v1/users/15
Authorization: Bearer <authorized-token>
```

Returns the safe projection permitted for the actor. Faculty access to another User
requires that User be a Student with an Enrollment in a currently assigned Subject.
Students cannot retrieve another account. Unauthorized existing IDs return 403;
missing IDs return 404. Neither path returns passwordHash.

```http
PATCH /api/v1/users/15
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "accountStatus": "Inactive" }
```

PATCH allows firstName, lastName, email, password, role, accountStatus only and requires
at least one field. Nulls, userId, passwordHash, createdAt, and unknown fields return 400.
New passwords are hashed; absent password leaves the original hash untouched.
createdAt is preserved. Duplicate email returns 409. No permanent User deletion exists.

The last active Admin cannot be deactivated or moved to another role (409). Current
active-Admin rows are locked before account-policy decisions, serializing competing
promotions/deactivations. Actors are rechecked as active Admin inside the transaction.

Role changes cannot invalidate Student Enrollment/inquiry ownership, Faculty Subject
assignments, or inquiry resolution history. Users with Student references must remain
Student; assigned Faculty must remain Faculty; historical resolvers must remain Faculty
or Admin. Status deactivation preserves all records and causes subsequent protected
requests to fail through the existing JWT guard. Audit history is never deleted or rewritten.

Passwords are write-only. Password changes do not add a token denylist; an existing token
remains valid until expiry unless account status/role changes deny its use. This is the
existing scoped JWT design, not a new logout/reset-token system.

## Transactional audit and concurrency

Successful writes reuse AuditLogsService with the SAME transaction manager:
GRADE_CREATE, GRADE_UPDATE, INQUIRY_CREATE, INQUIRY_RESOLVE, USER_CREATE, USER_UPDATE.
Each records actor ID, affected table, record ID, and UTC timestamp only. Passwords,
hashes, tokens, notes, and request payloads are not copied into audit actions. Audit
insertion failure rolls back the corresponding mutation. Audit remains internal.

Academic write locks use Subject → Enrollment → Grade → Inquiry order. Parent IDs
read outside a transaction are hints, rechecked against locked current rows. Grade
creation locks the Enrollment before eligibility checks/insertion, coordinating with
existing Subject reassignment and Enrollment identity/delete restrictions. Inquiry
resolution locks its current state and can transition Pending→Resolved only once.

User writes lock active Admin candidates, then validate actor/target policy. Shared
account locks in academic services coordinate account role changes with new references.
Existing FK/unique constraints remain enabled. Contention/deadlocks return sanitized
409 and may be retried; constraints are never relaxed to force a write through.

## Automated verification and isolation

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run test:database
```

HTTP tests use fictional Users/Subjects/Enrollments/Grades/Inquiries in an outer
transaction. Repository overrides bind real services to it; service transactions use
MariaDB savepoints. Fixtures are rolled back and checked absent. Fault injection rejects
actual audit INSERTs for all six actions and verifies rollback of each business write.

Concurrency tests use independent connections with committed uniquely tagged fixtures,
then verify ownership and remove only those rows in dependency order. Counts return to
their baseline. They cover duplicate Grades, Grade commits blocking Enrollment changes,
single-winner inquiry resolution, last-two-Admin deactivation, and role/assignment races.
The last-Admin edge case scopes the policy population to temporary Admin IDs AFTER
running the real locking query; it never deactivates seeded Admins. That scoping exists
only as a Jest spy, not a production flag or alternate authorization path.

Route tests traverse production module/controller metadata and require exactly the
22 planned method/path pairs, all original ten Lab 05 endpoints, and login as the only
public endpoint. Test fixture controllers are not part of AppModule or the production build.

No schema changes, seed resets/password regeneration, unrelated database/project edits,
Postman collection preparation, frontend, dependency upgrades, or OS-policy bypass occurred.
Known limits remain: single department, one current Faculty per Subject, local HTTP only,
process-local throttling, and the pre-existing Windows Application Control/lint restriction.
Account-policy locks are deliberately coarse for this small prototype and may produce
retryable conflicts under contention. See the earlier security/database documentation.

Final verification: build passed; 309 HTTP/integration tests passed across six suites
(93 new module HTTP, 6 new concurrency, and all 210 prior regression tests); 5 unit/
route-contract tests and all 47 database checks passed. Seed data/passwords, schema
consistency, fixture cleanup, Apache protection, and unchanged PDF hashes were verified.
