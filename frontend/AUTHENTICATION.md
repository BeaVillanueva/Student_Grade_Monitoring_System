# Login and authentication - Step 14.5

Step 14.6 replaces the standalone placeholders with a shared application layout and
nested module routes. See [layout and navigation](NAVIGATION.md). The authentication
architecture and limitations below remain applicable.

## Routes and UI

| Path | Access / purpose |
|---|---|
| / | Redirect to the verified role workspace, or /login |
| /login | Public login; authenticated users return to their own workspace |
| /admin | Admin placeholder |
| /department-head | Department Head placeholder |
| /faculty | Faculty placeholder |
| /student | Student placeholder |
| /unauthorized | Protected access-denied page with a link to the verified role destination |
| /__dev/design-system | Development-only component preview, excluded from production |
| unmatched paths | Not-found page |

The login page follows the approved navy two-column concept with compact branding
on small screens, system fonts, labeled fields, visibility toggle, form feedback,
pending/disabled controls, and administrator assistance text. There is no role
selector, registration, unsupported password-reset link, remember-me option,
credential hint, statistic, full dashboard, or sidebar navigation.

## Authentication architecture

`auth/session.ts` is a testable in-memory state machine. `auth/auth-provider.tsx`
supplies the reusable useAuth hook through useSyncExternalStore. Token values live
only inside the state-machine closure, never in React snapshots or query keys.
The provider and API session adapter bridge the existing QueryClient/Axios layer.
Neither passwords, tokens, nor private identity data are written to browser storage,
URLs, files, screenshots, or application logs. No authentication state is restored
after a browser reload.

1. React Hook Form validates through the existing Zod login schema. Password values
   are preserved for submission, then immediately cleared from the form. Concurrent
   submissions share one operation and the form becomes disabled while pending.
2. POST /api/v1/auth/login runs once, without an Authorization header or retries.
3. The access token is held privately in memory and used by the existing restricted
   API adapter for GET /api/v1/auth/me. Cookies are not used and redirects are rejected.
4. The Active current account and matching user ID must be verified before publishing
   authenticated state. The /me role, not the login role snapshot or decoded JWT,
   determines routing. JWT claims are not decoded for authorization.
5. Expiry is conservatively scheduled from request-start time plus the server's
   expiresIn value (1800 seconds). No refresh-token workflow or sliding expiry exists.
6. Logout, local expiry, or a current protected-request 401 immediately clears private
   identity/token state, cancels pending operations, rotates query scope, and clears
   private query/mutation caches. Generation checks prevent late responses or stale
   unauthorized callbacks from restoring or terminating a different session.

Public login failure returns a generic credential error without the protected-session
expiration workflow. Login 429 presents the safe rate-limit message and a submit
cooldown using bounded Retry-After seconds, or 60 seconds when absent. There is no
automatic retry. Network/timeouts/internal errors use the existing sanitized ApiError.

The provider checks local expiry and refreshes /me on focus/visibility changes;
protected navigation also requests an identity refresh. Background refreshes are
deduplicated and throttled to five seconds, with no polling. The placeholder's
Refresh account button permits an explicit fresh check. A verified role change
clears private cache scope and updates route authorization; an Inactive/mismatched
identity or 401 ends the session. Network failure during a check shows feedback
without treating the outage as proof that the account is invalid.

Role/status changes are observed on these checks or subsequent protected responses,
not pushed instantly from the server. Backend current-account authorization remains
the authoritative boundary on every protected API request. An idle/suspended tab
may delay timers; visibility/focus and adapter expiry checks prevent reuse afterward.

Client-side logout does not revoke an already issued JWT on the server. It remains
subject to server expiry and current account status. Password changes likewise do
not add token revocation. The prototype uses loopback HTTP; deployment requires a
separately reviewed HTTPS hosting arrangement. No backend policy was changed.

## Verification

The existing API checks plus 14 authentication tests pass: 47 automated tests total.
They cover state transitions, duplicate submission, verified role precedence,
failure/identity rejection, controlled-clock expiry, protected 401, role/status
changes, logout/cache clearing, stale results, rate-limit cooldown, and all four
role destinations/access decisions. Expiry and account changes are simulated only
through isolated offline dependencies; no database or JWT settings are modified.

Headless Chrome checked 320, 375, 768, 1366, and 1920px viewports with no horizontal
document overflow. Login screenshots were reviewed before any credentials were
entered and remain under ignored browser-test artifacts. Labels, keyboard focus,
password visibility, invalid-input announcements, pending/disabled behavior,
immediate password clearing, and reduced-motion preferences passed browser checks.
Two browser-intercepted offline responses exercised 401 and 429 UI behavior without
sending either login attempt to the backend. No runtime exceptions were observed.

Exactly four controlled live browser logins were made using existing approved Active
demo accounts, one per role: Admin, Department Head, Faculty, and Student. Each
returned 200, verified through /me, reached its own workspace, and was denied another
role's workspace. Public login redirected authenticated users to their own destination.
Logout/protected-route rejection was verified for the first three roles; Student
browser refresh required login again. localStorage, sessionStorage, and IndexedDB
remained empty in the isolated browser. No credential/token values were reported
or copied into frontend artifacts, and no live negative/rate-stress login was made.

Use `npm.cmd run test:api`, `npm.cmd run typecheck`, `npm.cmd run build`, and
`npm.cmd audit`. The login module is lazy loaded to avoid a large initial bundle.
Vite's loopback/proxy/filesystem settings and Apache restrictions remain unchanged.

## Manual follow-up and limitations

Open http://127.0.0.1:5173/login and supply approved credentials privately. Verify
the correct role/name, try another role path, sign out, and confirm protected access
returns to login. Use /__dev/design-system only for development component review.
Do not repeat login attempts unnecessarily: the server permits five/minute/IP.

Real 30-minute waiting, live account deactivation/role modification, screen-reader
output, physical touch devices, other browsers, and exhaustive accessibility checks
were not performed. Expiry/role/status failures are covered offline. Full dashboards,
academic workflows, persistent sessions, and server-side token revocation remain
outside this step. No database records, credentials, backend source, or policies
were modified. Both servers were left running; no commit or push was made.
