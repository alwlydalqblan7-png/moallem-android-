import test from "node:test";
import assert from "node:assert/strict";
import { mergePreparationBackup, validatePreparationBackup } from "../src/preparation-backup-import.js";

const backup = {
  app: "daftar-altahdir",
  version: 1,
  exportedAt: "2026-10-14T10:00:00.000Z",
  data: {
    preparations: [{ id: 1, title: "درس الكسور", grade: "السابع", content: "محتوى محفوظ" }],
    annualPlan: [{ id: "plan-1", grade: "السابع", subject: "الرياضيات" }],
    weeklySchedule: { الأحد: [{ id: 5, subject: "الرياضيات" }] },
    students: [{ id: 1, name: "ليلى أحمد", grade: "السابع", section: "أ" }],
    books: [{ id: "book-1", title: "كتاب الرياضيات", grade: "السابع" }],
    studentNotes: { "1": [{ text: "ملاحظة محفوظة" }] },
    gradebookRecords: { "السابع|أ|الرياضيات": [{ studentId: 1, score: 9 }] },
  },
};

test("preparation backup import merges mapped records without replacing existing data", () => {
  const current = {
    m2_saved_preparations: JSON.stringify([{ id: 1, title: "تحضير موجود", content: "يبقى" }]),
    m2_students: JSON.stringify([{ id: 1, name: "طالب موجود", grade: "الثامن", section: "أ" }]),
    m2_weekly_schedule: JSON.stringify({ الأحد: [null], الإثنين: [{ subject: "العربية" }] }),
  };
  const result = mergePreparationBackup(backup, current);
  const preparations = JSON.parse(result.data.m2_saved_preparations);
  const students = JSON.parse(result.data.m2_students);
  const schedule = JSON.parse(result.data.m2_weekly_schedule);
  assert.equal(preparations.length, 2);
  assert.equal(preparations[0].title, "تحضير موجود");
  assert.equal(preparations[1].content, "محتوى محفوظ");
  assert.equal(students.length, 2);
  assert.equal(students[0].name, "طالب موجود");
  assert.equal(students[1].name, "ليلى أحمد");
  assert.equal(String(students[1].id).startsWith("students-import-"), true);
  assert.equal(schedule.الأحد[0].subject, "الرياضيات");
  assert.equal(schedule.الإثنين[0].subject, "العربية");
  assert.deepEqual(result.archivedSections, ["studentNotes", "gradebookRecords"]);
  assert.match(result.warnings.join(" "), /PDF/);
  assert.ok(result.data.m2_imported_preparation_archives);
});

test("preparation backup import rejects unknown formats and invalid sections", () => {
  assert.throws(() => validatePreparationBackup({ ...backup, app: "other" }), /غير مدعومة/);
  assert.throws(() => validatePreparationBackup({ ...backup, data: { preparations: {} } }), /غير صالحة/);
  assert.throws(() => validatePreparationBackup({ ...backup, data: { mystery: [] } }), /غير معروفة/);
});
