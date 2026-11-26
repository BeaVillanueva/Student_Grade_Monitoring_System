# Application layout and navigation - Step 14.6

Step 14.7 subsequently connects the Admin routes to functional pages; see
[Admin features](ADMIN_FEATURES.md). The layout and other-role placeholders remain
as described below; earlier placeholder/testing statements describe Step 14.6.

## Shared architecture

`src/components/layout/application-layout.tsx` provides the authenticated shell:
desktop sidebar, top bar, breadcrumbs, account menu, skip link, and an Outlet main
region. It is lazy loaded through React Router. Login and the development-only
`/__dev/design-system` route remain outside it.

`src/app/navigation.ts` defines each role's labels, relative path segments, icons,
and descriptions. Both App's nested route generation and Sidebar's links consume
this configuration. The existing role policies/AuthenticationGuard remain the
authorization layer; there is no second permission implementation in the menu.
Backend authorization remains authoritative on every protected API request.

The desktop sidebar changes between 240px and 80px at widths of at least 1024px.
Its collapsed links keep accessible names and tooltips. Smaller viewports use a
modal Radix Dialog drawer with a labeled title/description, trapped focus, Escape
and close controls, and trigger-focus restoration. It closes on route selection,
route changes, and transition to a desktop viewport. Collapse/drawer state remains
in React memory and is never written to browser storage.

The top bar shows route-derived breadcrumbs, a sidebar toggle, verified full name
and role, initials avatar, and an account menu. Name/role text is visually compacted
on small screens while remaining available through the account button's accessible
name. Profile, explicit account refresh, and sign out work from the account menu.
The sidebar also exposes My Profile and Sign out. Account refresh errors use safe
existing authentication feedback. There are no notification counters or invented
notification APIs.

## Role route mapping

Dashboard is the index route at each prefix. Every listed destination is protected
by that prefix's exact backend role. Other-role paths redirect to /unauthorized.

| Role / prefix | Label -> relative path |
|---|---|
| Admin: /admin | Dashboard -> index; Subjects -> subjects; Enrollments -> enrollments; Grades -> grades; Grade Inquiries -> grade-inquiries; User Management -> users; My Profile -> profile |
| Department Head: /department-head | Dashboard -> index; Subjects -> subjects; Enrollments -> enrollments; Grades -> grades; Grade Inquiries -> grade-inquiries; Student & Faculty Directory -> directory; My Profile -> profile |
| Faculty: /faculty | Dashboard -> index; My Subjects -> subjects; My Students -> students; Grade Management -> grades; Grade Inquiries -> grade-inquiries; My Profile -> profile |
| Student: /student | Dashboard -> index; My Subjects -> subjects; My Grades -> grades; My Grade Inquiries -> grade-inquiries; My Profile -> profile |

This is 25 frontend navigation destinations, not new REST endpoints. Unknown paths
within a role prefix show a shell-contained not-found page; /unauthorized also keeps
the current verified role's shell and working sign out. Public unmatched paths
retain the standalone not-found page.

## Read-only profile and placeholders

`features/profile/profile-page.tsx` displays full name, email, exact role, account
status with text/icon, and account creation date from the existing verified /auth/me
identity. It uses the authentication store rather than /users/:id, which would
exclude a Department Head's own record. The creation timestamp is displayed in the
browser's local timezone. There are no editing, recovery, or password-change controls.

`features/workspace/module-placeholder.tsx` clearly identifies unimplemented modules.
Dashboard contains an academic-workspace explanation only. No statistics cards,
academic rows, fake counts, nonfunctional CRUD buttons, or module fetches exist.
Faculty subject views will be scoped to assigned subjects; Student subject views
will derive from their own enrollments. Faculty My Students will use permitted
enrollments and individual profile lookups, not the forbidden Users list endpoint.
Department Head's directory will retain the backend's limited projection.

## Session preservation

The prior memory-only session, role guards, expiration, protected 401 handling,
request cancellation, and private-cache clearing remain in place. A verified role
change updates the central menu and rejects the old role's routes. Inactive identity
and current protected 401 return to login. Background identity checks retain their
existing throttling; no polling or new API endpoint has been introduced.

## Verification performed

- TypeScript and production build passed. The layout is code split; no bundle-size
  warning was emitted by the verified build. No dependency was added in this step.
- All 53 automated tests passed, including six new navigation/initials tests and
  existing authentication, query, DTO, and 22-endpoint contract coverage.
- Offline intercepted authentication fixtures exercised the actual UI for all four
  roles and every one of the 25 navigation destinations. Fixtures lived only in the
  isolated browser test harness, never in application source or the database.
- All roles were checked at 320, 375, 768, 1366, and 1920px, with no horizontal
  document overflow. Mobile/desktop screenshots were visually reviewed and remain
  under ignored browser artifacts.
- Menu labels, active-link aria-current semantics, breadcrumbs, read-only profile
  fields, 240/80px desktop collapse, collapsed tooltips, drawer Tab containment,
  Escape/focus restoration, route-change closure, account keyboard navigation,
  cross-role rejection, and logout passed browser checks.
- Offline role changes updated navigation; inactive identity and protected 401
  expired the session. No unexpected academic API calls or runtime exceptions
  occurred. All 15 API requests in the final browser pass were fulfilled by the
  offline authentication interceptor: zero backend requests or live login attempts.
- Local/session browser storage remained empty. Reduced-motion preference support
  remains in the shared stylesheet; no drawer animation was added.
- Dependency audit reported zero vulnerabilities. Vite sensitive-file denial,
  Apache protection, and the unauthenticated API proxy remained effective.

Two initial browser harness attempts needed timing/input corrections: focus return
is asynchronous, and the Radix account trigger was opened with keyboard events
rather than a synthetic click. The corrected checks passed without weakening focus
behavior or modifying authentication. These are test-harness corrections, not
backend failures.

## Limitations

No live login was necessary in this step; live role authentication was verified in
Step 14.5. This step does not establish new live academic integration results.
Screen-reader output, non-Chrome browsers, physical touch devices, forced-colors,
and exhaustive accessibility certification remain unverified. Token expiry remains
covered by the existing offline clock tests, not a new 30-minute wait. Dashboard
and academic modules remain pending their approved steps.

Both servers remain running. Backend code, database records, credentials, policies,
Vite security settings, and Apache configuration were not modified. No commit or
push was made.
