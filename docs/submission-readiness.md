# Academic submission readiness

SGMS passed final application verification with **Classification A**, subject to documented
limitations. This is local academic demonstration readiness, not production certification or
completed infrastructure recovery. Final documentation is applied; frontend and documentation
commits remain pending separate approval.

## Decisions and links

| Item                                                         | Status                                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| MariaDB through XAMPP as the MySQL-compatible implementation | User approved; instructor acceptance unconfirmed                                                      |
| SQL submission format                                        | Instructor clarification pending: schema-only SQL plus controlled seed versus required fictional data |
| GitHub repository visibility                                 | Pending explicit owner decision                                                                       |
| GitHub repository URL                                        | Pending; no remote configured                                                                         |
| Narrated demonstration video URL                             | Pending                                                                                               |

## Required documentation PDF

Prepare the cover page with course/project/author and working repository/video links, table of
contents, project overview, system analysis, system architecture, database design, REST API design,
authentication/security, backend implementation, API testing/validation, conclusion, references and
appendices where applicable. Include the final checklist and selected sanitized figures. Use the
actual implementation and separate evidence sources in the [API reference](api-reference.md),
[database design](system-database.md), [testing report](system-testing-results.md) and
[Postman results](postman-test-results.md).

## SQL reproduction strategy

Do not submit private recovery backups. Prepare a reviewed SGMS-only schema export on a separately
approved healthy environment; exclude unrelated databases, credentials, existing authentication
hashes, privilege metadata, recovery information and account/grant statements. Preserve the required
keys, checks and indexes.

Use the existing guarded fresh provisioning, migration and controlled fictional seed workflow
documented in the [README](../README.md). It creates authorized demonstration accounts with freshly
generated private credentials and bcrypt cost 12; local environment and credential files remain
excluded from submission. Never weaken required password fields or insert bogus hashes. Clarify
schema-only SQL plus seed acceptance with the instructor. Choose and document a single
schema/migration reproduction path; do not blindly import tables and rerun CREATE migrations. No SQL
export has been generated for submission.

## Postman artifacts

Submit [the collection](../postman/SGMS.postman_collection.json) and, if useful,
[the safe environment template](../postman/SGMS.local.postman_environment.json). The collection
contains 95 request definitions covering 22 endpoint pairs. Keep credential/token slots empty,
allowTestWrites=false, rateMode=off and runExpiredTokenTest=false. Never submit an active
credential-bearing export. Offline syntax checks are distinct from historical actual Postman
execution.

## Recorded demonstration: 5-10 minutes

Use screen recording with your own spoken narration. Target about nine minutes:

1. Introduce the problem, SGMS scope and four roles (40 seconds).
2. Show authorized backend startup with npm.cmd run start:dev without errors in a separately
   approved safe environment (35 seconds).
3. Authenticate in Postman, explain JWT protection and show a protected request; conceal passwords
   and token values (45 seconds).
4. Demonstrate complete Subjects CRUD in Postman using approved disposable fixtures: POST, GET/list,
   full PUT, DELETE 204 and confirmation GET 404 (two minutes).
5. Trace actual client-to-controller-to-service-to-repository-to-database code and the response path
   (90 seconds).
6. Show matching fictional database records and audit outcomes while excluding password/hash
   columns; show unauthenticated rejection with HTTP 401 (40 seconds).
7. Tour Admin, Department Head, Faculty and Student frontend capabilities and representative mobile
   navigation (two minutes).
8. Explain separate verified testing results and limitations (50 seconds).

Do not restart or mutate the preserved original environment merely to record. Any future live
demonstration mutations/startup require separate authorization and a verified safe target. Do not
display Authorization headers, JWT response values, password entry or secret-bearing terminals.
Verify the eventual video link is accessible as required, including an appropriate
anonymous/incognito check.

## Presentation: 10-15 minutes plus Q&A

Target twelve minutes: problem/context; actors and scope; architecture and actual request lifecycle;
ERD, normalization and academic-history restrictions; 22 routes and two complete CRUD modules;
JWT/bcrypt/validation/RBAC/ownership/audit logging; four-role UI and responsive evidence; separately
attributed testing results; limitations, lessons and conclusion. Prepare route/schema/code
appendices for questions. Confirm the instructor's schedule without inventing dates.

## Final checklist

- Obtain approval for exact frontend/documentation staging and the two meaningful commits; preserve
  all seven existing commits.
- Decide repository visibility and instructor access, then obtain separate publication approval and
  verify the actual repository URL/history/content.
- Resolve MariaDB and SQL-format instructor clarifications.
- Prepare and review the PDF, SGMS-only sanitized SQL reproduction artifact, safe Postman files,
  narrated video and presentation slides.
- Review selected screenshot copies for unnecessary fictional account identifiers; keep original
  evidence private. No actual Postman Runner screenshot was supplied, so none should be invented.
- Verify file readability, relative links and reproduction instructions in a separately approved
  healthy environment. No restore rehearsal has been completed.
- Submit the required PDF, GitHub link (preferred; source ZIP fallback according to the brief), SQL,
  Postman JSON and video link through the instructed submission process; prepare slides for
  presentation.

## Preserved limitations

MariaDB Aria checksum errors and incomplete privilege recovery remain unresolved. Historical disk
I/O retries, same-disk backup risk, no consistent cold backup or restore rehearsal, and MariaDB not
confirmed loopback-only remain relevant. Isolated test environment cleanup and unrelated legacy
database maintenance remain deferred; detailed recovery reports stay private.

Development-only dependency advisories remain after a remediation candidate was rejected. Production
checks passed, but the full backend project has a test-file typing error. Historical backend PID
replacements and a Faculty timeout have unconfirmed causes. Local HTTP, stateless JWT/local logout
without token revocation, process-local rate limiting and limited browser/device/accessibility
testing remain documented. The system is not described as vulnerability-free or
production-certified.
