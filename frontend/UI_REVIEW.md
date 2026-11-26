# Step 14.11 — Responsive design, UI/UX and visual consistency

Completed locally on 26 November 2026. URL: http://127.0.0.1:5173/login.
This step changes presentation and accessibility only. Academic definitions,
payloads, eligibility rules, role policies, private-cache boundaries, request
budget and backend contracts remain unchanged.

## Findings and improvements

The existing navy two-column login and role shells were retained. Initial
browser screenshots and structural/keyboard checks identified these issues:

| Observed issue | Implemented correction |
| --- | --- |
| Login reserved vertical space for absent authentication feedback | Feedback container renders only when feedback exists |
| Mobile dialogs had tight usable width and no visible form Cancel action | Responsive 16px/24px padding, bounded vertical scrolling, overscroll containment, visible Cancel and separated form actions |
| Programmatically opened record dialogs trapped focus but failed to return it to the opener | Shared dialog remembers and restores connected opener focus while preserving supplied autofocus handlers |
| Dashboard labels could wrap inconsistently and shift numbers | Consistent label area, stable icon sizing, full-height cards and tabular numbers |
| Summary headings skipped a semantic level under the page title | Existing visual headings expose accessible level 2 |
| Narrow grade columns split “Not recorded” into fragments | Minimum cell width inside the contained horizontal table scroll region |
| Technical schema defaults exposed `NaN` in form feedback | Small presentation-only formatter replaces default technical messages; specific validation messages and schemas are preserved |
| Long unbroken profile names caused 45px page overflow at 320px | Explicit one-column shrinking profile grid and anywhere name wrapping |
| Long loading/detail text needed stronger wrapping | Shared text wrapping, nonshrinking spinner and consistent loading padding |
| Secondary text needed stronger contrast across neutral surfaces | Secondary foreground adjusted from #64748B to #5B6B82; original navy/accent/background/semantic palette retained |

Breadcrumb and truncated account names now provide full-text titles. Page-header
actions and descriptions retain wrapping and consistent spacing. Tables preserve
all permitted actions, exact decimal strings, calendar dates, individual grades
and enrollment-based grouping. Missing grades still say **Not recorded**.
Existing dialogs/details provide full text where management cells are truncated.

## Changed and created files

Modified:

- `src/components/ui/overlays.tsx`: dialog sizing, wrapping and focus restoration.
- `src/features/shared/entity-form.tsx`: visible Cancel, busy state, action spacing
  and readable validation feedback.
- `src/components/shared/summary-card.tsx`: label/value/icon alignment and heading semantics.
- `src/components/shared/data-table.tsx`: cell width, wrapping and header line height.
- `src/components/layout/headers.tsx`: description/action wrapping.
- `src/components/layout/application-layout.tsx`: full breadcrumb/account-name titles.
- `src/components/feedback/states.tsx`: loading layout and polite announcement.
- `src/features/auth/login-page.tsx`: remove empty feedback spacing.
- `src/features/profile/profile-page.tsx`: long-name grid containment.
- `src/styles/globals.css`: secondary contrast, shared text wrapping and mobile table spacing.
- `README.md`: link to this handoff.

Created `src/lib/validation-feedback.ts`, `test/ui-feedback.test.ts` and this report.
No dependencies or lockfiles were changed. No academic feature implementation
was rebuilt or expanded.

## Verification results

- All **86 automated tests passed**, including the new UI feedback test and all
  85 existing tests. TypeScript and final production build passed.
- Headless Chrome checked **150 role-page/viewport combinations**: all 25 existing
  role pages, including four profiles, at 320, 375, 768, 1024, 1366 and 1920px.
  Login was additionally checked at all six widths. No horizontal page overflow
  was found. Wide tables retain a keyboard-focusable contained scroll region.
- Basic DOM accessibility checks passed for labels, named visible buttons, one
  visible main landmark and one visible page heading. There were 162 page/state
  checks in the main browser review. Chrome's accessibility tree was inspected.
- Mobile drawers trapped and returned focus for all four roles; desktop collapse
  semantics and keyboard-visible collapsed tooltips passed for all roles.
  Representative record-dialog Tab cycling stayed within the dialog. Cancel
  returned focus to a deliberately focused action-button opener after the fix.
- **54 form/viewport checks** covered Subject create/edit, Enrollment create/edit,
  User create/edit, Grade encode/edit and a long resolution note at all six widths.
  Dialog bounds/scroll containment and reachable Cancel actions passed. The mobile
  Student inquiry form additionally covered long message and invalid-selection
  feedback. A long account-name profile passed at all six widths after its fix.
- Delayed intercepted responses produced an announced loading state and then a
  populated dashboard. Student fixture checks covered empty records, safe errors,
  manual recovery, validation and plain-text HTML-like inquiry content.
- 200% **CSS zoom** was checked on all four profile pages. Reduced-motion media
  emulation was verified. This was not a full browser-UI zoom matrix.
- Measured text contrast: navy on white 11.50:1, accent on white 5.17:1, secondary
  on white 5.43:1 and secondary on neutral #F1F5F9 4.95:1. Textual status labels
  and icons remain present; statuses are not communicated by color alone.
- Academic workflow regressions passed with isolated intercepted fixtures:
  Admin 17 mutations (13 successful, four expected conflicts); Department Head
  11 (six successful, three conflicts, two eligibility rejections); Faculty six
  (four successful, one conflict, one eligibility rejection); Student two
  successful inquiry submissions. These generated **zero actual backend requests**.
- A same-document Admin → Department Head → Faculty → Student logout/login
  sequence passed private-data isolation. Role routes, forbidden-control absence,
  own/assigned scope, missing grades and academic history behavior were preserved.
- No runtime exceptions occurred in the successful browser suites. Early UI
  harness attempts incorrectly treated persistent information announcements as
  unfinished loading; the wait was narrowed to loading spinners. Test timeout
  allowances were extended for the unchanged bounded scheduler. These harness
  corrections did not change production request scheduling or add forbidden calls.
- Dependency audit reported **zero known vulnerabilities**; the installed
  dependency tree remained valid. Apache SGMS denial returned 403; unauthenticated
  proxied API access returned 401; Vite backend-environment/private-backup access
  returned 403. Credentials, backups, dependencies, output and screenshots remain
  Git-ignored. The final scan covered 110 frontend source/documentation/build files
  and found zero actual ignored-secret values, bcrypt hashes or JWT token matches.

No live academic mutations or login requests were needed for this UI step.
Protection checks were non-mutating. Backend and frontend servers were not stopped.

## Screenshot evidence — offline fixtures only

All screenshots use fictional intercepted fixtures. The login screenshot has
empty credential fields. Numbers and names in these images are **test fixtures**,
not current production/demo database statistics. Screenshots are private local
review artifacts under the ignored dependency cache and were not staged.

Exact base directory:
`C:\xampp\htdocs\SGMS\frontend\node_modules\.cache\sgms-ui-review-step-14-11`

| View | File within that directory |
| --- | --- |
| Login | `01-login-offline-no-credentials.png` |
| Admin Dashboard | `02-admin-dashboard-offline.png` |
| Admin Subjects | `03-admin-subjects-offline.png` |
| Department Head Dashboard | `04-head-dashboard-offline.png` |
| Faculty Dashboard | `05-faculty-dashboard-offline.png` |
| Faculty Grade Management | `06-faculty-grades-offline.png` |
| Student Dashboard | `07-student-dashboard-offline.png` |
| Student My Grades | `08-student-grades-offline.png` |
| Mobile Student Dashboard | `09-student-dashboard-mobile-offline.png` |
| Mobile Student inquiry/validation | `10-student-inquiry-mobile-offline.png` |

## Limits and handoff

Browser verification used available headless Chrome on Windows. No physical
phone/tablet, Safari, Firefox or screen-reader certification was performed.
Automated accessibility checks were targeted DOM/keyboard/accessibility-tree
checks, not a full axe audit or WCAG certification. No additional accessibility
dependency was installed. Contrast measurements cover selected token pairs,
not every rendered pixel/compositing combination. Screenshot inspection and
geometry checks do not constitute an exhaustive overlap or layout-shift audit;
no quantitative CLS measurement was performed.

Private screenshots reside in an ignored cache and can be removed by future
dependency/cache cleanup. Review them before clearing that directory. Existing
local HTTP and memory-only session limitations remain unchanged.

Git remains at `43b68d0` with seven commits and the existing untracked `frontend/`
tree. No files were staged, committed or pushed. Backend code, records, credentials,
API/security policies, Vite proxy/filesystem restrictions and reference PDFs were
preserved. Step 14.12 End-to-End Integration and Security Testing requires approval.
