# Production REST route inventory — 22 endpoints

Base prefix `/api/v1`. All routes require current-account JWT authentication except
login. Query variants and role variants do not count as separate endpoints.
`Lab 05` marks the ten original method/path pairs; their query filters remain supported.

| # | Method | Path | Access | Lab 05 |
|---:|---|---|---|---|
| 1 | POST | /auth/login | Public, active credentials, 5/min/IP | |
| 2 | GET | /auth/me | All roles, self | |
| 3 | POST | /subjects | Admin, Head | |
| 4 | GET | /subjects | All roles | Yes |
| 5 | GET | /subjects/:id | All roles | |
| 6 | PUT | /subjects/:id | Admin, Head | Yes |
| 7 | DELETE | /subjects/:id | Admin, Head | |
| 8 | POST | /enrollments | Admin, Head | Yes |
| 9 | GET | /enrollments | Scoped; optional studentId | Yes |
| 10 | GET | /enrollments/:id | Admin/Head; own Student; assigned Faculty | |
| 11 | PUT | /enrollments/:id | Admin, Head | |
| 12 | DELETE | /enrollments/:id | Admin, Head | Yes |
| 13 | GET | /grades | Scoped; optional studentId | Yes |
| 14 | POST | /grades | Assigned Faculty | |
| 15 | PATCH | /grades/:id | Assigned Faculty | Yes |
| 16 | GET | /grade-inquiries | Scoped; optional studentId | |
| 17 | POST | /grade-inquiries | Student, own Grade | Yes |
| 18 | PATCH | /grade-inquiries/:id | Assigned Faculty, Admin | Yes |
| 19 | GET | /users | Admin; limited Student/Faculty directory for Head | |
| 20 | GET | /users/:id | Admin; Head directory; Faculty self/assigned Students; Student self | Yes |
| 21 | POST | /users | Admin | |
| 22 | PATCH | /users/:id | Admin | |

Head means Department Head within the single-department prototype. Subjects and
Enrollments are the two complete CRUD modules. Grade association/date changes,
User deletion, inquiry reopening/deletion, and public registration are not exposed.
Audit logging is internal and adds no REST route. No test/health/debug endpoint is included.

The route-contract tests read actual production Nest module/controller metadata,
compare it against these 22 method/path pairs, verify the original ten, and verify
that login is the only Public route. HTTP tests exercise each new production path.

See [authentication](authentication-security.md), [Subjects](subjects-api.md),
[Enrollments](enrollments-api.md), and [remaining modules](remaining-modules-api.md)
for payloads, pagination, error codes, ownership, and business restrictions.
