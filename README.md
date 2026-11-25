# Student Grade Monitoring System (SGMS)

Individual final project for ITEC 116 — Systems Integration and Architecture 2.

## Current scope

Database implementation is complete: six TypeORM entities, an explicit migration,
isolated MariaDB accounts, and a controlled fictional seed. Authentication provides
JWT login and protected profile retrieval, reusable role guards, validation, and rate
limits. Subjects CRUD provides role permissions, bounded pagination, academic-history
restrictions, and transactional audit logging. Enrollments CRUD now enforces Student/
Faculty ownership, immutable enrollment dates, grade-history protection, and atomic audits.
Grades, Grade Inquiries, and Admin-only User management now complete the planned
22-endpoint backend. Frontend and final Postman collection preparation remain deferred.

See [database design and verification](docs/database-design.md) for the full schema,
corrected ERD, domain constraints, seed controls, and documented limitations.
See [authentication and security](docs/authentication-security.md) for endpoint examples,
token configuration, reusable guards, tests, and the local HTTP limitation.
See [Subjects API](docs/subjects-api.md) for all five endpoints, validation, permissions,
request/response examples, and transactional audit behavior.
See [Enrollments API](docs/enrollments-api.md) for ownership filtering, all five endpoints,
date/term rules, auditing, and independent-connection concurrency tests.
See [remaining module APIs](docs/remaining-modules-api.md) and the
[22-route inventory](docs/route-inventory.md) for Grades, Inquiries, Users, and account protections.

## Stack and local configuration

- NestJS, TypeScript, TypeORM, mysql2
- XAMPP MariaDB 10.4.32 at `127.0.0.1:3306`
- Database: `student_grade_monitoring_db`
- Backend: `127.0.0.1:3000`
- JWT, bcrypt, class-validator, class-transformer, and NestJS throttler dependencies
- Postman for later API testing; Git and GitHub for version control

MariaDB is a user-approved substitution for the final-project PDF's MySQL requirement.
Instructor acceptance remains to be confirmed.

## Local development

Initialization used Node.js 24.21.0 and npm 11.19.0. From the project root:

```powershell
Set-Location backend
npm.cmd ci
npm.cmd run build
npm.cmd run migration:show
npm.cmd run test:database
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run start:dev
```

Check port availability before starting the backend. It defaults to loopback port
3000. Database configuration loads the local ignored `backend/.env`. `.env.example`
contains nonsecret settings and blank passwords. Runtime database connections use
the dedicated DML-only SGMS account. Synchronization and automatic migrations are
disabled. Authentication and rate limiting are active. Startup requires the configured
local JWT secret; the ignored environment file already contains it on this workspace.
Fresh setups can use `npm.cmd run auth:configure-secret` after secure provisioning.

The approved database has been provisioned and migrated. Do not rerun provisioning
against an existing database; it deliberately refuses existing targets. Subsequent
schema changes require an approved forward migration. Demo passwords are generated
locally and saved in ignored `backend/.env.demo`; never share or commit that file.

## Workspace privacy

Root `.htaccess` denies direct Apache HTTP access to SGMS. This requires Apache 2.4
to honor local rules; the inspected XAMPP document-root configuration permits overrides.
Runtime verification confirmed HTTP 403 for SGMS and both local credential files.
NestJS runs independently of Apache.

Reference PDFs contain personal information and are excluded from Git. Environment
files, dependencies, build output, logs, and SQL dumps are ignored. Only sanitized
database exports should be explicitly included during approved submission preparation.
Never commit credentials or tokens.
