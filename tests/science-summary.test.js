import test from "node:test";
import assert from "node:assert/strict";
import { calculateSciencePairSummary, calculateSubjectResult } from "../src/science-summary.js";
import { officialGradeColumns } from "../src/official-grade-distribution.js";

function makeBook(work, exam) {
  return {
    columns: [
      { id: "oral", name: "شفهي", type: "شفهي", max: 100 },
      { id: "homework", name: "وظائف", type: "وظائف", max: 100 },
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

test("official grade 8 science keeps the two 200-point results separate and averages work with exam", () => {
  const columns = officialGradeColumns("الثامن", "العلوم العامة");
  const book = {
    columns,
    marks: {
      "student-1": {
        official_science_0_0: 25,
        official_science_0_1: 25,
        official_science_0_2: 50,
        official_science_exam_0: 150,
        official_science_1_0: 40,
        official_science_1_1: 30,
        official_science_1_2: 80,
        official_science_exam_1: 100,
      },
    },
  };
  const gradebooks = { "الثامن|أ|العلوم العامة": book };
  const pair = calculateSciencePairSummary(gradebooks, "الثامن", "أ", "student-1");
  assert.deepEqual(pair, { science: 125, physicsChemistry: 125, total: 250 });
  const combined = calculateSubjectResult(book, "student-1", 400);
  assert.equal(combined.value, 250);
  assert.equal(combined.maximum, 400);
  assert.equal(combined.pendingExam, false);
});

test("official general science summary marks results pending separately until both exams are entered", () => {
  const book = {
    columns: officialGradeColumns("السابع", "العلوم العامة"),
    marks: { "student-1": { official_science_0_0: 25, official_science_0_1: 25, official_science_0_2: 50 } },
  };
  const result = calculateSubjectResult(book, "student-1", 400);
  assert.equal(result.value, 100);
  assert.equal(result.pendingExam, true);
  assert.equal(result.components[0].value, 100);
  assert.equal(result.components[1].value, 0);
});
