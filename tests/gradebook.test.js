import test from "node:test";
import assert from "node:assert/strict";
import { calculateGradebookTotals, normalizeMarkInput } from "../src/gradebook.js";
import { calculateSciencePairSummary } from "../src/science-summary.js";

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

test("science and physics-chemistry results remain separate and are summed without rounding", () => {
  const gradebooks = {
    "الثامن|أ|العلوم": { columns: [{ id: "oral", max: 20 }, { id: "exam", max: 40 }], marks: { 12: { oral: 15.5, exam: 30.5 } } },
    "الثامن|أ|الفيزياء والكيمياء": { columns: [{ id: "work", max: 50 }, { id: "exam", max: 50 }], marks: { 12: { work: 44.25, exam: 35.75 } } },
  };
  const summary = calculateSciencePairSummary(gradebooks, "الثامن", "أ", 12);
  assert.equal(summary.science, 46);
  assert.equal(summary.physicsChemistry, 80);
  assert.equal(summary.total, 126);
  assert.deepEqual(gradebooks["الثامن|أ|العلوم"].marks[12], { oral: 15.5, exam: 30.5 });
});
