import test from "node:test";
import assert from "node:assert/strict";
import { buildStudentProfileHtml, collectStudentProfile } from "../src/student-profile.js";

const student = { id: 7, name: "ليان", grade: "الثامن", section: "أ" };

test("student profile joins only the student's class grades, attendance and homework", () => {
  const profile = collectStudentProfile({
    student,
    gradebooks: {
      "الثامن|أ|العلوم": {
        columns: [{ id: "oral", name: "شفهي", max: 10 }, { id: "exam", name: "الامتحان", max: 10 }],
        marks: { "7": { oral: 8, exam: 9 } },
      },
      "الثامن|ب|العلوم": {
        columns: [{ id: "oral", name: "شفهي", max: 10 }],
        marks: { "7": { oral: 1 } },
      },
    },
    attendanceHistory: {
      "الثامن|أ|2026-10-20": { "7": { status: "absent", note: "غائب" } },
      "الثامن|ب|2026-10-21": { "7": { status: "present" } },
    },
    homeworkItems: [
      { id: "a", grade: "الثامن", section: "أ", title: "الكسور", subject: "رياضيات", statuses: { "7": "submitted" } },
      { id: "b", grade: "الثامن", section: "ب", title: "المعادلات", subject: "رياضيات" },
    ],
  });
  assert.equal(profile.grades.length, 1);
  assert.equal(profile.grades[0].subject, "العلوم");
  assert.equal(profile.grades[0].value, 8.5);
  assert.equal(profile.attendance.length, 1);
  assert.deepEqual(profile.attendanceSummary, { present: 0, absent: 1, late: 0 });
  assert.equal(profile.homework.length, 1);
  assert.equal(profile.homework[0].status, "submitted");
});

test("student profile notes are isolated by student id and ordered newest first", () => {
  const profile = collectStudentProfile({
    student,
    notes: [
      { id: "old", studentId: 7, text: "قديم", createdAt: "2026-10-18T09:00:00Z" },
      { id: "new", studentId: "7", text: "جديد", createdAt: "2026-10-20T09:00:00Z" },
      { id: "other", studentId: 8, text: "طالب آخر", createdAt: "2026-10-21T09:00:00Z" },
    ],
  });
  assert.deepEqual(profile.notes.map((note) => note.id), ["new", "old"]);
});

test("printable profile is Arabic RTL and escapes user supplied text", () => {
  const html = buildStudentProfileHtml({
    student: { ...student, name: '<script>alert("x")</script>' },
    grades: [],
    attendance: [],
    homework: [],
    notes: [{ id: 1, studentId: 7, text: "<img src=x onerror=alert(1)>", createdAt: "2026-10-20T00:00:00Z" }],
  }, { school: "مدرسة" });
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert(1)&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
});
