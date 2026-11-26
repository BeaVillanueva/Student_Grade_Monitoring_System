import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distributionData,
  gradeComparisonRows,
} from "../src/features/shared/dashboard-chart-data.ts";
import type { Enrollment, Grade, Subject } from "../src/api/contracts.ts";

test("chart distributions preserve counts, zero categories and precise shares", () => {
  const data = distributionData({ Enrolled: 1, Dropped: 0, Completed: 2 });
  assert.equal(data.total, 3);
  assert.equal(data.valid, true);
  assert.ok(Math.abs(data.entries[0].percentage! - 100 / 3) < 1e-10);
  assert.equal(data.entries[1].count, 0);
  assert.equal(data.entries[1].percentage, 0);
  assert.ok(
    Math.abs(
      data.entries.reduce((sum, entry) => sum + (entry.percentage ?? 0), 0) -
        100,
    ) < 1e-10,
  );
});

test("empty distributions do not invent percentages and invalid counts are unavailable", () => {
  assert.deepEqual(
    distributionData({ Pending: 0, Resolved: 0 }).entries.map(
      (row) => row.percentage,
    ),
    [null, null],
  );
  assert.equal(distributionData({}).total, 0);
  for (const count of [-1, NaN, Infinity, 1.5])
    assert.equal(distributionData({ Pending: count }).valid, false);
});

test("grade comparison distinguishes recorded zero from missing and separates academic enrollments", () => {
  const enrollments = [
    {
      enrollmentId: 1,
      subjectId: 10,
      semester: "First",
      schoolYear: "2025-2026",
    },
    {
      enrollmentId: 2,
      subjectId: 10,
      semester: "First",
      schoolYear: "2026-2027",
    },
  ] as Enrollment[];
  const grades = [
    { gradeId: 1, enrollmentId: 1, gradeType: "Midterm", score: "0.00" },
    { gradeId: 2, enrollmentId: 2, gradeType: "Final", score: "95.50" },
    { gradeId: 3, enrollmentId: 99, gradeType: "Midterm", score: "88.00" },
  ] as Grade[];
  const subjects = [
    {
      subjectId: 10,
      subjectCode: "TEST",
      subjectName: "Fictional test subject",
    },
  ] as Subject[];
  const rows = gradeComparisonRows(enrollments, grades, subjects);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Midterm, 0);
  assert.equal(rows[0].Final, null);
  assert.equal(rows[1].Midterm, null);
  assert.equal(rows[1].Final, 95.5);
  assert.notEqual(rows[0].term, rows[1].term);
  assert.equal(gradeComparisonRows([], grades, subjects).length, 0);
});
