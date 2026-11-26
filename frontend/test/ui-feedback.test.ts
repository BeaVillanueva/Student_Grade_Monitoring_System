import { test } from "node:test";
import assert from "node:assert/strict";
import { validationFeedback } from "../src/lib/validation-feedback.ts";
test("UI validation feedback replaces technical schema defaults without changing specific validation rules", () => {
  assert.equal(
    validationFeedback("Invalid input: expected number, received NaN"),
    "Enter a valid value for this field.",
  );
  assert.equal(
    validationFeedback("Invalid option: expected one of Midterm|Final"),
    "Choose one of the available options.",
  );
  for (const message of [
    "Use a score from 0–100 with up to two decimal places.",
    "Enter 1–4000 characters without NUL.",
    "Provide at least one editable field.",
  ])
    assert.equal(validationFeedback(message), message);
  assert.equal(validationFeedback(undefined), undefined);
  assert.equal(validationFeedback(""), undefined);
});
