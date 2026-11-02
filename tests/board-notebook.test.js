import test from "node:test";
import assert from "node:assert/strict";
import { buildBoardLessonPrintHtml, buildBoardLessonsPrintHtml, createBoardLesson, migrateBoardLessons, updateBoardLesson, upsertBoardLesson } from "../src/board-notebook.js";

test("new board lesson requires a title and stores class details and notes", () => {
  assert.throws(() => createBoardLesson({ title: "  " }), /عنوان الدرس/);
  const lesson = createBoardLesson({ id: "lesson-1", title: "المجهَر", grade: "السابع", section: "أ", subject: "العلوم", date: "2026-11-02", content: "أجزاء المجهر" });
  assert.equal(lesson.title, "المجهَر");
  assert.deepEqual([lesson.grade, lesson.section, lesson.subject], ["السابع", "أ", "العلوم"]);
  assert.equal(lesson.strokes.length, 0);
  assert.equal(lesson.status, "not-started");
});

test("legacy board strokes migrate into a lesson without changing old strokes", () => {
  const strokes = [{ color: "#111111", width: 3, points: [[0.2, 0.4]] }];
  const before = structuredClone(strokes);
  const lessons = migrateBoardLessons(null, strokes, "2026-11-02");
  assert.equal(lessons.length, 1);
  assert.equal(lessons[0].title, "الدرس السابق");
  assert.deepEqual(lessons[0].strokes, before);
  assert.deepEqual(strokes, before);
});

test("updating a board lesson preserves other lessons and their order", () => {
  const first = createBoardLesson({ id: "a", title: "أول" });
  const second = createBoardLesson({ id: "b", title: "ثان" });
  const updated = updateBoardLesson([first, second], "a", { favorite: true, status: "completed" });
  assert.equal(updated[0].favorite, true);
  assert.equal(updated[0].status, "completed");
  assert.equal(updated[1].title, "ثان");
  const created = createBoardLesson({ id: "c", title: "جديد" });
  assert.deepEqual(upsertBoardLesson([first, second], created).map((item) => item.id), ["c", "a", "b"]);
});

test("board PDF print output is Arabic RTL, escapes notes, and retains pen strokes", () => {
  const lesson = createBoardLesson({ id: "print", title: "درس <اليوم>", grade: "الثامن", subject: "العلوم", date: "2026-11-02", content: "نقطة <أولى>" });
  lesson.strokes = [{ color: "#c62828", width: 4, points: [[0.2, 0.3], [0.8, 0.7]] }];
  const html = buildBoardLessonPrintHtml(lesson);
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /درس &lt;اليوم&gt;/);
  assert.match(html, /نقطة &lt;أولى&gt;/);
  assert.match(html, /stroke="#c62828"/);
  assert.match(buildBoardLessonsPrintHtml([lesson, lesson]), /class="lesson-page"/);
});
