import test from "node:test";
import assert from "node:assert/strict";
import { calculateSciencePairSummary, calculateSubjectResult } from "../src/science-summary.js";

function makeBook(work, exam) {
  return {
    columns: [
      { id: "oral", name: "شفهي", type: "شفهي", max: 10 },
      { id: "homework", name: "وظائف", type: "وظائف", max: 10 },
      { id: "official_final_exam", name: "الامتحان الأخير", type: "امتحان نهائي", max: 100 },
    ],
    marks: { "student-1": { oral: work / 2, homework: work / 2, official_final_exam: exam } },
  };
}

test("science result uses the current work-plus-exam average without rounding", () => {
  const result = calculateSubjectResult(makeBook(15, 16), "student-1", 100);
  assert.equal(result.value, 15.5);
  assert.equal(result.maximum, 100);
  assert.equal(result.pendingExam, false);
});

test("science and physics-chemistry results stay separate and total their two values", () => {
  const gradebooks = {
    "الثامن|أ|العلوم": makeBook(32, 68),
    "الثامن|أ|الفيزياء والكيمياء": makeBook(20, 40),
  };
  const result = calculateSciencePairSummary(gradebooks, "الثامن", "أ", "student-1", () => 100);
  assert.equal(result.science, 50);
  assert.equal(result.physicsChemistry, 30);
  assert.equal(result.total, 80);
});

test("combined total stays blank until both subject books exist", () => {
  const gradebooks = { "الثامن|أ|العلوم": makeBook(32, 68) };
  const result = calculateSciencePairSummary(gradebooks, "الثامن", "أ", "student-1", () => 100);
  assert.equal(result.science, 50);
  assert.equal(result.physicsChemistry, null);
  assert.equal(result.total, null);
});
