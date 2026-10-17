import test from "node:test";
import assert from "node:assert/strict";
import { DISTINCT_SCIENCE_SUBJECTS, subjectGradebookKey, parentGradeMessage } from "../src/parent-grade-sharing.js";
test("science and physics and chemistry have independent storage keys", () => {
  assert.equal(new Set(DISTINCT_SCIENCE_SUBJECTS.map(subject => subjectGradebookKey("السابع", "أ", subject))).size, 4);
});
test("parent message includes only provided student's valid marks", () => {
  const message = parentGradeMessage({
    studentName: "طالب أول", grade: "السابع", section: "أ", subject: "العلوم",
    assessments: [{name:"مذاكرة",value:18,max:20},{name:"امتحان",value:"",max:40},{name:"خطأ",value:60,max:20}],
  });
  assert.match(message, /طالب أول/);
  assert.match(message, /مذاكرة: 18 \/ 20/);
  assert.doesNotMatch(message, /امتحان:|خطأ:/);
});
test("student name is required", () => {
  assert.throws(() => parentGradeMessage({studentName:"",assessments:[]}));
});
