import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStudentHomeworkMessage,
  filterHomeworkForClass,
  getHomeworkStatus,
  setHomeworkStatus,
  summarizeHomework,
} from "../src/homework.js";

const items = [
  { id: "a", grade: "الثامن", section: "أ", title: "الكسور", subject: "رياضيات", type: "واجب", dueDate: "2026-10-21" },
  { id: "b", grade: "الثامن", section: "ب", title: "المعادلات", subject: "رياضيات", type: "مذكرة" },
];

test("homework records are isolated by grade and section", () => {
  assert.deepEqual(filterHomeworkForClass(items, "الثامن", "أ").map((item) => item.id), ["a"]);
  assert.deepEqual(filterHomeworkForClass(items, "الثامن", "ب").map((item) => item.id), ["b"]);
  assert.deepEqual(filterHomeworkForClass(items, "السابع", "أ"), []);
});

test("status updates retain other students and other records", () => {
  const next = setHomeworkStatus(items, "a", 7, "submitted");
  assert.equal(getHomeworkStatus(next[0], 7), "submitted");
  assert.equal(getHomeworkStatus(next[0], 8), "pending");
  assert.equal(next[1], items[1]);
  assert.equal(items[0].statuses, undefined);
});

test("summary counts default statuses and explicit absence", () => {
  const item = { ...items[0], statuses: { "2": "submitted", "3": "absent" } };
  assert.deepEqual(summarizeHomework(item, [{ id: 1 }, { id: 2 }, { id: 3 }]), {
    pending: 1, submitted: 1, absent: 1,
  });
});

test("parent message contains only that student's incomplete items", () => {
  const target = { id: 1, name: "ليان" };
  const message = buildStudentHomeworkMessage({
    grade: "الثامن",
    section: "أ",
    student: target,
    items: [
      { ...items[0], statuses: { "1": "absent" } },
      { id: "c", grade: "الثامن", section: "أ", title: "قواعد", type: "مذكرة", statuses: { "1": "submitted" } },
    ],
  });
  assert.match(message, /ليان/);
  assert.match(message, /الكسور/);
  assert.match(message, /غائب ويحتاج إلى استدراك/);
  assert.doesNotMatch(message, /قواعد/);
  assert.doesNotMatch(message, /المعادلات/);
});
