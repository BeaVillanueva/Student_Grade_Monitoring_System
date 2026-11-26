# Student Grade Monitoring System

SGMS is an individual ITEC 116 Systems Integration and Architecture 2 final project. It monitors
student grades and academic inquiries through a NestJS REST backend and a responsive React
interface. It carries forward Laboratories 04-06 and preserves the ten original Lab 05 method/path
pairs. Subjects and Enrollments provide the two complete CRUD modules; 22 REST method/path pairs are
implemented.

Final SGMS application verification passed with Classification A and documented limitations,
accepted on 26 November 2026. This means local academic demonstration readiness, not production
certification or completed database infrastructure recovery.

## Roles and features

- Admin: manages users, subjects, enrollments; monitors grades/inquiries; resolves inquiries. Cannot
  encode/correct grades.
- Department Head: manages subjects/enrollments; academic oversight; minimal Student/Faculty
  directory. Cannot manage accounts, encode/correct grades or resolve inquiries.
- Faculty: assigned subjects/students; eligible grade encoding and corrections; assigned inquiry
  resolution. No subject/enrollment mutations or user directory list.
- Student: own subjects/enrollments/grades; submits inquiries about own recorded grades and views
  own history. No grade modifications or inquiry resolution.

All four have profiles and role dashboards. Subject API reads permit all four roles/all subjects;
own/assigned frontend views narrow what they display. Ownership is enforced by the backend on
protected academic records. Single-department scope.

## Actual stack and requirements

Verified Node.js v24.21.0; frontend requires Node>=24. Use npm.cmd in Windows PowerShell. Git and a
current browser are needed. The verified npm runtime is 11.19.0. Preserve both lockfiles with npm
ci; never force dependency upgrades.

| Layer              | Lockfile-resolved versions                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Backend            | NestJS core 12.6.1; TypeScript 6.0.3; TypeORM 1.1.3; mysql2 3.24.6; bcrypt 6.0.0                                        |
| Validation/auth    | class-validator 0.15.1; class-transformer 0.5.1; NestJWT 12.0.5; throttler 6.8.0                                        |
| Frontend           | React 19.3.1; ReactDOM 19.3.1; Vite 8.3.8; TypeScript 6.0.3; Tailwind 4.3.5                                             |
| Supporting UI/data | ReactRouter 8.5.3; Axios 1.21.1; TanStackQuery 5.108.4; ReactHookForm 7.92.0; resolvers 7.0.9; Zod 4.6.7; Lucide 1.80.0 |

Local shadcn-style components use installed Radix primitives; this is not a claim of a shadcn
runtime package version. Recharts is not installed. Dashboard values/distributions use actual
permitted API data, no invented GPA/academic records.

Database: XAMPP MariaDB10.4.32, TypeORM type mariadb, mysql2 driver, host 127.0.0.1 port 3306.
MariaDB is user-approved as the MySQL-compatible implementation; instructor acceptance of the
substitution is unconfirmed. Do not describe it as Oracle MySQL Community Server.

## Architecture

Browser React -> relative /api/v1 -> Vite /api proxy -> NestJS controllers -> DTO
validation/JWT+role guards -> services/ownership+business rules -> TypeORM repositories/transactions
-> MariaDB. Responses return through the same layers. Audit insertions use the same transaction as
successful business mutations. No separate audit REST endpoint.

JWT is issued after bcrypt verification; each protected request verifies
HS256/issuer/audience/expiry and reloads the current account role/status. Frontend session tokens
live only in memory; TanStack Query cache is session-scoped. Refreshing the page requires login;
logout clears memory/cache and does not revoke the issued JWT.

## Structure

```text
SGMS/
  .htaccess                 project-local Apache denial
  .gitignore
  README.md
  backend/
    package.json, package-lock.json, nest-cli.json, tsconfig*.json
    .env.example            credential-free template
    scripts/                guarded fresh provisioning/JWT configuration
    src/
      auth/, audit-logs/, common/
      subjects/, enrollments/, grades/, grade-inquiries/, users/
      database/             entities, migration, config, controlled seed
      app.module.ts, main.ts
    test/                   backend integration/concurrency/route tests
  frontend/
    package.json, package-lock.json, vite.config.ts, tsconfig.json
    components.json, index.html
    src/                    app,api,auth,components,features,lib,styles
    test/                   offline tests
    *.md                    frontend design/contracts/features/test notes
  docs/                     architecture/API/security/testing documentation
  postman/                  collection and empty safe environment template
```

References, local .env files, private evidence/backups, dependencies and build outputs are excluded
from Git. Do not publish the raw private review directory or personal reference scans.

## Obtain and install ? instructions, not commands executed during final review

After an approved repository exists, clone its approved URL with git clone <approved-repository-url>
SGMS. No URL is currently assigned. For the project's XAMPP access rule/provisioning probes, use
C:\xampp\htdocs\SGMS. The placeholder URL is not an executable command. Existing workspace users
should preserve their configuration/data and skip fresh provisioning.

From the project root, on a healthy setup:

```powershell
Set-Location C:\xampp\htdocs\SGMS\backend
npm.cmd ci
npm.cmd run build
Set-Location ..\frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
```

These installation/build instructions were reviewed against package scripts but not executed in this
documentation review. The approved current running application must remain untouched. Keep
native-tool Windows security policies enabled; stop if blocked rather than bypassing them.

### Existing initialized workspace

Keep backend/.env and backend/.env.demo private. Do not recreate database/accounts, run seed, reset
tables or regenerate passwords. With existing services available, start commands below are for
future authorized sessions only; do not launch duplicates when ports are already occupied. Current
MariaDB recovery is deferred; stop on a database/service error and obtain review.

### Fresh healthy XAMPP environment only

This is a separate reproduction workflow, not a recovery procedure for the existing database. First
verify Apache denies /SGMS/, /SGMS/backend/.env and backend/package.json with 403 before credentials
are written. The project-local .htaccess must be effective; do not change global Apache settings to
conceal a failed gate.

Review backend/.env.example for the required keys. It has empty secret slots. The existing guarded
provisioning script creates .env itself; do NOT copy the example to .env before running it.
db:provision refuses existing .env, existing SGMS database or either dedicated account, and requires
an authorized local administrator connection. If a password is required, supply SGMS_ADMIN_PASSWORD
privately in the process environment, never in a command/history/screenshot. Default empty-root
behavior is specific to a fresh local XAMPP setup; never weaken a configured account to satisfy it.

After installing/building backend, from backend/:

```powershell
npm.cmd run db:provision
npm.cmd run auth:configure-secret
npm.cmd run migration:show
npm.cmd run migration:run
$env:SGMS_CONFIRM_DEMO_SEED = 'student_grade_monitoring_db'
npm.cmd run seed:demo
Remove-Item Env:SGMS_CONFIRM_DEMO_SEED
```

Provisioning creates only student_grade_monitoring_db and dedicated loopback accounts: runtime
schema DML and separately scoped migration DDL privileges. Generated database credentials go to
ignored .env; auth:configure-secret generates128hex secret after Apache-denial checks. synchronize
stays false; no automatic migrations at startup. This provisioning script queries administrative
metadata and must NOT be executed on the current troubled server under the final-review
restrictions. DDL can partially commit: stop on failure; do not improvise destructive cleanup.

The migration builds six business tables plus TypeORM's technical migration tracking table. Seed is
intentionally controlled, uses fictional data, bcrypt 12 and unique random private passwords in
ignored .env.demo; it refuses an unexpected existing dataset or credential file. Do not use it to
restore current retained audit history. Do not include any generated credential file in submission.

The implementation intentionally enforces the approved local database host, port, name and account
identities. Changing that target would require separately reviewed source/configuration work;
copying a different .env alone is not supported. The setup described here is for a fresh healthy
instance of the approved target, not recovery of the existing server.

## Start the local application

In separate PowerShell terminals, after authorized setup and when the ports are free:

```powershell
Set-Location C:\xampp\htdocs\SGMS\backend
npm.cmd run start:dev
```

```powershell
Set-Location C:\xampp\htdocs\SGMS\frontend
npm.cmd run dev
```

Open http://127.0.0.1:5173/login. Backend http://127.0.0.1:3000, API prefix /api/v1. Vite host
127.0.0.1, port 5173, strictPort; /api forwards without rewriting to127.0.0.1:3000, changeOrigin
false. Filesystem serving is restricted to frontend and denies environment/Git/SQL/key files. Do not
expose either server to the LAN or enable backend CORS for this local workflow. npm.cmd run preview
uses loopback 5174 for a build preview; it is not a complete production/API hosting design.

## API overview

All routes use /api/v1; login alone is public. Head means Department Head. Other routes require a
valid current-account JWT; table includes ownership restrictions. Queries/role variants are not
additional endpoints.

|   # | Method | Path                        | Access                                                              | Lab 05 |
| --: | ------ | --------------------------- | ------------------------------------------------------------------- | ------ |
|   1 | POST   | /api/v1/auth/login          | Public, active credentials, 5/min/IP                                |        |
|   2 | GET    | /api/v1/auth/me             | All roles, self                                                     |        |
|   3 | POST   | /api/v1/subjects            | Admin, Head                                                         |        |
|   4 | GET    | /api/v1/subjects            | All roles                                                           | Yes    |
|   5 | GET    | /api/v1/subjects/:id        | All roles                                                           |        |
|   6 | PUT    | /api/v1/subjects/:id        | Admin, Head                                                         | Yes    |
|   7 | DELETE | /api/v1/subjects/:id        | Admin, Head                                                         |        |
|   8 | POST   | /api/v1/enrollments         | Admin, Head                                                         | Yes    |
|   9 | GET    | /api/v1/enrollments         | Scoped; optional studentId                                          | Yes    |
|  10 | GET    | /api/v1/enrollments/:id     | Admin/Head; own Student; assigned Faculty                           |        |
|  11 | PUT    | /api/v1/enrollments/:id     | Admin, Head                                                         |        |
|  12 | DELETE | /api/v1/enrollments/:id     | Admin, Head                                                         | Yes    |
|  13 | GET    | /api/v1/grades              | Scoped; optional studentId                                          | Yes    |
|  14 | POST   | /api/v1/grades              | Assigned Faculty                                                    |        |
|  15 | PATCH  | /api/v1/grades/:id          | Assigned Faculty                                                    | Yes    |
|  16 | GET    | /api/v1/grade-inquiries     | Scoped; optional studentId                                          |        |
|  17 | POST   | /api/v1/grade-inquiries     | Student, own Grade                                                  | Yes    |
|  18 | PATCH  | /api/v1/grade-inquiries/:id | Assigned Faculty, Admin                                             | Yes    |
|  19 | GET    | /api/v1/users               | Admin; limited Student/Faculty directory for Head                   |        |
|  20 | GET    | /api/v1/users/:id           | Admin; Head directory; Faculty self/assigned Students; Student self | Yes    |
|  21 | POST   | /api/v1/users               | Admin                                                               |        |
|  22 | PATCH  | /api/v1/users/:id           | Admin                                                               |        |

See the [consolidated API reference](docs/api-reference.md),
[database design](docs/system-database.md), [testing results](docs/system-testing-results.md) and
[submission readiness](docs/submission-readiness.md). Detailed module documentation remains
available in docs/. Loaded-page search is not a server search filter.

## Security

bcrypt cost 12; no password/hash in responses. Global whitelist, forbidNonWhitelisted, transform
validation. JWT 30 minutes with current database status/role on every protected request. Roles and
ownership checked in services/guards. Generic401 for bad/unknown/inactive credentials. Login
5/min/IP, general 100/min/IP (in-process, not distributed). Fixed sanitized errors; transactional
audit logging. Restrictive FKs and graded-history rules preserve academic records. .env/private
backups/reference scans never tracked or served; do not put secrets in VITE_ variables. Local Apache
denial protects htdocs; Vite filesystem denial is separately enforced.

## Testing and evidence

Historical actual isolated functional 59/59 scenarios, 248 requests, all 22 pairs, 32 mutations/32
audits. Separate live behavioral security 253/253, 48 additional audits, total 80 isolated audits
reconciled. Offline frontend 86/86 and safe backend 5/5. Production frontend/backend
TypeScript/build pass. These are separate historical results, not one summed count and not rerun for
this README review.

Actual user-reported Postman:95 request definitions across separate runs; security 134/134,
expiredJWT3/3, login limit 13/13(7.991s, 348ms), general limit 203/203(10.990s, 9ms). No unprovided
functional assertion totals/Runner screenshots claimed. See
[actual Postman results](docs/postman-test-results.md) and
[consolidated testing results](docs/system-testing-results.md) for failure/retest/database-cleanup
provenance.

Safe future offline frontend check: npm.cmd run test:api from frontend/. Do not run the full backend
integration/concurrency/database checker, seed or write-enabled Postman collection against the
preserved original database. Isolated target verification and separate approval are required for
mutation-capable tests. The current collection template keeps allowTestWrites=false, rateMode=off,
runExpiredTokenTest=false with empty credential/token slots.

## Known limitations

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

## Academic deliverables and publication

Seven meaningful commits already exist at 43b68d0. Frontend remains untracked pending reviewed
staging approval. No GitHub remote/repository publication yet. Final documentation is applied.
Remaining: approved frontend/documentation commits; repository URL/instructor access; required PDF;
credential-free schema SQL plus controlled seed strategy pending instructor clarification; safe
Postman files; narrated 5-10 minute demonstration; 10-15 minute presentation/slides and Q&A. Links
must be verified before submission. Private backups/raw evidence are not submission artifacts. Final
project rubric remains authoritative.

Repository URL: **Pending**. Repository visibility: **Pending owner decision**. Demonstration video
URL: **Pending**. Instructor clarification on MariaDB and SQL submission format remains pending.
