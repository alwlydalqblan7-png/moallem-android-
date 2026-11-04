import test from "node:test";
import assert from "node:assert/strict";
import { calculateFirstTermResult, createFirstTermColumns, FIRST_TERM_SCHEME_ID } from "../src/semester-grade-scheme.js";

test("first-term columns use the requested weights and subject maximum", () => {
  assert.deepEqual(createFirstTermColumns(200).map(column => column.max), [50, 50, 100, 200]);
  assert.deepEqual(createFirstTermColumns(100).map(column => column.max), [25, 25, 50, 100]);
});

test("semester result is coursework sum averaged with final exam", () => {
  const book = { gradingScheme: FIRST_TERM_SCHEME_ID, columns: createFirstTermColumns(200), marks: { 4: { term1_oral: 40, term1_homework: 50, term1_quiz: 80, term1_exam: 180 } } };
  assert.deepEqual(calculateFirstTermResult(book, 4), { work: 170, exam: 180, value: 175, maximum: 200, pendingExam: false });
});

test("no exam remains marked pending and invalid coursework is clamped", () => {
  const book = { gradingScheme: FIRST_TERM_SCHEME_ID, columns: createFirstTermColumns(100), marks: { 4: { term1_oral: 30, term1_homework: -3, term1_quiz: 25 } } };
  assert.deepEqual(calculateFirstTermResult(book, 4), { work: 50, exam: null, value: 50, maximum: 100, pendingExam: true });
});
