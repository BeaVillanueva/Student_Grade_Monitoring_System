# Student Grade Monitoring System (SGMS)

Individual final project for ITEC 116 — Systems Integration and Architecture 2.

## Current scope

Backend initialization only. The generated sample controller and service are not
functional SGMS modules. No database connection, entities, authentication, functional
modules, or frontend are implemented.

## Stack and planned configuration

- NestJS, TypeScript, TypeORM, mysql2
- XAMPP MariaDB 10.4.32 at `127.0.0.1:3306`
- Planned database: `student_grade_monitoring_db`
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
npm.cmd test -- --runInBand
npm.cmd run start:dev
```

Check port availability before starting the backend. It defaults to loopback port
3000. The scaffold reads HOST and PORT from the process environment. `.env.example`
contains planned settings and blank credentials; environment-file loading and
database wiring are deferred. Installed security dependencies are not yet active.

Do not create the database or run migrations until database implementation is approved.

## Workspace privacy

Root `.htaccess` denies direct Apache HTTP access to SGMS. This requires Apache 2.4
to honor local rules; the inspected XAMPP document-root configuration permits overrides.
Runtime verification requires Apache to be running and has not been performed.
NestJS runs independently of Apache.

Reference PDFs contain personal information and are excluded from Git. Environment
files, dependencies, build output, logs, and SQL dumps are ignored. Only sanitized
database exports should be explicitly included during approved submission preparation.
Never commit credentials or tokens.
