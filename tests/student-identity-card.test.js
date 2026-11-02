import test from "node:test";
import assert from "node:assert/strict";
import { buildStudentIdentityCardHtml } from "../src/student-profile.js";

test("prints an Arabic RTL student identity card without private follow-up details", () => {
  const html = buildStudentIdentityCardHtml({
    id: 42, name: "ليان أحمد", grade: "الثامن", section: "ب",
    photo: "data:image/jpeg;base64,ZmFrZQ==",
    grades: [{ subject: "علوم", value: 9876 }],
  }, { school: "ثانوية الإمام الشافعي", year: "2026 - 2027" });
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /ليان أحمد/);
  assert.match(html, /الثامن — الشعبة ب/);
  assert.match(html, /data:image\/jpeg;base64,ZmFrZQ==/);
  assert.doesNotMatch(html, /9876/);
  assert.doesNotMatch(html, /العلامات/);
});

test("escapes text and rejects non-image data URLs for the student photo", () => {
  const html = buildStudentIdentityCardHtml({
    id: 7, name: "<script>alert(1)</script>", grade: "السابع", section: "أ",
    photo: "data:text/html;base64,PHNjcmlwdD4=",
  });
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /class="photo placeholder"/);
});

test("uses the student's roster number instead of exposing an internal UUID", () => {
  const html = buildStudentIdentityCardHtml({
    id: "274ef06c-ee06-45fe-9208-9f72832ba5f6",
    rosterNumber: 4,
    name: "أحمد محمد بدر",
    grade: "الثامن",
    section: "أولى",
  });
  assert.match(html, /رقم الطالب في الشعبة: 4/);
  assert.doesNotMatch(html, /274ef06c/);
});
