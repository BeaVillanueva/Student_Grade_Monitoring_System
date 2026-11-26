# SGMS frontend

The completed React/Vite/TypeScript application implements role-based Admin, Department Head,
Faculty and Student workflows over the existing22REST endpoints. All academic values come from
actual permitted API data. Earlier step documents preserve implementation/testing history; their
intermediate placeholder descriptions do not describe the current completed application.

From frontend/ use npm.cmd ci on an authorized healthy setup, npm.cmd run typecheck, npm.cmd run
test:api (offline), npm.cmd run build, and npm.cmd run dev. Do not reinstall dependencies or restart
the preserved running application merely to follow these instructions. Node>=24; both manifest and
lockfile are versioned.

Development URL http://127.0.0.1:5173/login; strictPort; loopback binding. Relative /api/v1 requests
use the /api proxy to127.0.0.1:3000 without path rewrite or backend CORS. The filesystem allowlist
contains only frontend; environment/Git/SQL/key files are denied. Never put secrets in VITE_
variables or source.

Memory-only access token; page refresh requires login. Session cache clears onlogout/authfailure.
Logout does not revoke already issuedJWTs. Permissions/ownership are enforced by the backend, not
only UI visibility.

See DESIGN_SYSTEM.md, API_INTEGRATION.md, AUTHENTICATION.md, NAVIGATION.md, ADMIN_FEATURES.md,
DEPARTMENT_HEAD_FEATURES.md, FACULTY_FEATURES.md, STUDENT_FEATURES.md, UI_REVIEW.md for contracts
and historical development evidence. The design preview /__dev/design-system is development-only.
Local Radix/shadcn-style components, Tailwind semantic tokens and Lucide icons are implemented.
Recharts is not installed.

Shared SVG charts display authorized enrollment and inquiry distributions, grade-type counts and personal Midterm/Final scores. Missing grades display Not recorded; recorded zero displays 0.00. Table actions use consistent compact sizing, with equal Activate/Deactivate widths. Panels refresh every five minutes, guarded against overlapping work, open dialogs, hidden tabs and offline clients. Automatic panel refresh does not persist access tokens or preserve login after a full browser reload.

Historical Step 14.13 verification recorded 86/86 offline frontend tests and successful production TypeScript/build checks. Separate historical runs recorded 59/59 actual isolated functional scenarios and 253/253 behavioral security checks. Step 14.14C.2 subsequently passed 89/89 frontend tests with no failures or skips, TypeScript validation and the production build. Its successful four-role live pass used 37 API requests without academic writes, runtime exceptions or rate-limit responses. Separately, 21 intercepted functional fixture checks, including 10 mocked mutations, and eight intercepted edge-case checks passed; fixture writes did not reach the backend. Steps 14.14C.3 and 14.14C.3A reused these results without rerunning the tests or build. These measurements have different scopes and must not be added together.

User-reported Postman results are
separately documented. Representative headless-Chrome viewport checks are not comprehensive
device/browser/accessibility certification. See root README and consolidated testing documentation
for known limits and failed-harness/retest provenance.

See the [project README](../README.md), [API reference](../docs/api-reference.md),
[database design](../docs/system-database.md) and
[testing results](../docs/system-testing-results.md).
