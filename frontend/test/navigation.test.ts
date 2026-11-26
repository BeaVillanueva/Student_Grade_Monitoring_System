import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_NAVIGATION,
  currentNavigation,
  navigationPath,
  profilePath,
  userInitials,
} from "../src/app/navigation.ts";
import { ROLE_PATHS, routeAccess } from "../src/auth/policies.ts";
import type { UserRole } from "../src/api/contracts.ts";
const expected: Record<UserRole, string[]> = {
  Admin: [
    "Dashboard",
    "Subjects",
    "Enrollments",
    "Grades",
    "Grade Inquiries",
    "User Management",
    "My Profile",
  ],
  "Department Head": [
    "Dashboard",
    "Subjects",
    "Enrollments",
    "Grades",
    "Grade Inquiries",
    "Student & Faculty Directory",
    "My Profile",
  ],
  Faculty: [
    "Dashboard",
    "My Subjects",
    "My Students",
    "Grade Management",
    "Grade Inquiries",
    "My Profile",
  ],
  Student: [
    "Dashboard",
    "My Subjects",
    "My Grades",
    "My Grade Inquiries",
    "My Profile",
  ],
};
for (const role of Object.keys(expected) as UserRole[])
  test(`${role}: exact approved menu and consistent guarded nested destinations`, () => {
    const items = ROLE_NAVIGATION[role];
    assert.deepEqual(
      items.map((item) => item.label),
      expected[role],
    );
    const paths = items.map((item) => navigationPath(role, item));
    assert.equal(new Set(paths).size, items.length);
    for (const [index, item] of items.entries()) {
      assert(
        paths[index] === ROLE_PATHS[role] ||
          paths[index].startsWith(`${ROLE_PATHS[role]}/`),
      );
      assert.equal(currentNavigation(role, paths[index])?.key, item.key);
      const state = {
        status: "authenticated" as const,
        user: {
          userId: 1,
          firstName: "Offline",
          lastName: "Layout",
          email: "offline@example.test",
          role,
          accountStatus: "Active" as const,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        error: null,
        retryAt: null,
      };
      assert.equal(routeAccess(state, role), "allowed");
      for (const other of Object.keys(expected) as UserRole[])
        if (other !== role) {
          assert.equal(routeAccess(state, other), "unauthorized");
          assert.equal(currentNavigation(other, paths[index]), undefined);
        }
    }
    assert.equal(profilePath(role), `${ROLE_PATHS[role]}/profile`);
    assert.equal(
      currentNavigation(role, `${ROLE_PATHS[role]}/unsupported-module`),
      undefined,
    );
  });
test("breadcrumbs and active state match complete paths rather than misleading prefixes", () => {
  assert.equal(
    currentNavigation("Admin", "/admin/subjects/")?.label,
    "Subjects",
  );
  assert.equal(currentNavigation("Admin", "/admin/subjects-other"), undefined);
  assert.equal(currentNavigation("Admin", "/admin/subjects/1"), undefined);
  assert.equal(
    currentNavigation("Department Head", "/department-head/directory")?.label,
    "Student & Faculty Directory",
  );
  assert.equal(
    currentNavigation("Student", "/student/grades")?.label,
    "My Grades",
  );
});
test("avatar initials handle whitespace and Unicode without exposing unrelated identity fields", () => {
  assert.equal(userInitials(" Layout ", " Fixture "), "LF");
  assert.equal(userInitials("Élodie", "Ångström"), "ÉÅ");
  assert.equal(userInitials("😀", "Test"), "😀T");
  assert.equal(userInitials("", ""), "?");
});
