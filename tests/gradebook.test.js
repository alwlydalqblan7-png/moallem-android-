import test from "node:test";
import assert from "node:assert/strict";
import { calculateGradebookTotals, normalizeMarkInput } from "../src/gradebook.js";

test("gradebook uses full configured maximum even while some assessments are ungraded", () => {
  const result = calculateGradebookTotals(
    { homework: 8, exam: 35 },
    [
      { id: "homework", max: 10, type: "أعمال" },
      { id: "activity", max: 10, type: "نشاط" },
      { id: "exam", max: 50, type: "امتحان" },
    ],
  );
  assert.deepEqual(result, { earned: 43, maximum: 70 });
});

test("gradebook clamps persisted and entered marks to each assessment maximum", () => {
  const result = calculateGradebookTotals(
    { oral: 18, homework: -4 },
    [{ id: "oral", max: 10 }, { id: "homework", max: 5 }],
  );
  assert.deepEqual(result, { earned: 10, maximum: 15 });
  assert.equal(normalizeMarkInput("18", 10), 10);
  assert.equal(normalizeMarkInput("-4", 5), 0);
  assert.equal(normalizeMarkInput("", 5), "");
});

test("official general science components total their configured subject maximum", () => {
  const result = calculateGradebookTotals(
    { bio: 150, physics: 100, chemistry: 60 },
    [
      { id: "bio", max: 200, type: "فرع العلوم" },
      { id: "physics", max: 120, type: "فرع العلوم" },
      { id: "chemistry", max: 80, type: "فرع العلوم" },
    ],
  );
  assert.deepEqual(result, { earned: 310, maximum: 400 });
});
