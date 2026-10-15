import test from "node:test";
import assert from "node:assert/strict";
import { officialGradeColumns, officialGradeMaximum } from "../src/official-grade-distribution.js";
test("gradebook uses the supplied 2025-2026 subject maxima", () => {
  for (const [grade, subject, max] of [
    ["السابع", "المعلوماتية", 200], ["الثامن", "المعلوماتية", 200],
    ["العاشر", "الرياضيات", 400], ["الحادي عشر", "الرياضيات", 400],
    ["العاشر", "التربية الرياضية", 200], ["الحادي عشر", "التربية الرياضية", 200],
    ["السابع", "العلوم العامة", 400], ["الثامن", "العلوم العامة", 400],
  ]) {
    assert.equal(officialGradeMaximum(grade, subject), max);
    assert.equal(officialGradeColumns(grade, subject).filter(col => col.id !== "official_final_exam").reduce((sum, col) => sum + col.max, 0), max);
  }
});
test("Arabic includes 20/15/15/50 split", () => {
  assert.deepEqual(officialGradeColumns("السابع", "اللغة العربية").filter(x => x.id !== "official_final_exam").map(x => x.max), [120,90,90,300]);
});
test("general science has two separately graded 200-point parts", () => {
  assert.deepEqual(officialGradeColumns("الثامن", "العلوم العامة").filter(x => x.id !== "official_final_exam").map(x => x.max), [50,50,100,50,50,100]);
});
test("unsupported subjects do not receive invented official maxima", () => {
  assert.equal(officialGradeColumns("التاسع", "المعلوماتية"), null);
});

test("200-point subjects have 50 oral, 50 homework, 100 quiz and 200 exam", () => {
  assert.deepEqual(officialGradeColumns("السابع", "المعلوماتية").map(col => col.max), [50, 50, 100, 200]);
});
