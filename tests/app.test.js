import test from "node:test";
import assert from "node:assert/strict";
import { autoColorHtml, mergeSubjectOptions } from "../src/preparation-format.js";
import { decodePdfBackupEntries } from "../src/backup-format.js";
import { getDailyWidgetStatus, parseStudentNames } from "../src/student-tools.js";

test("subject migration adds new options without removing or renaming legacy subjects", () => {
  const old = ["العلوم العامة", "الفيزياء", "الكيمياء", "العربية"];
  const migrated = mergeSubjectOptions(old, ["العلوم", "الفيزياء والكيمياء"]);
  assert.deepEqual(migrated.slice(0, old.length), old);
  assert.deepEqual(migrated.slice(old.length), ["العلوم", "الفيزياء والكيمياء"]);
  assert.deepEqual(mergeSubjectOptions(migrated, ["العلوم"]), migrated);
});

test("PDF restore payload round-trips bytes and rejects malformed entries before storage writes", async () => {
  const restored = decodePdfBackupEntries([{id:"book-1",data:"data:application/pdf;base64,JVBERi0xLjQK"}]);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].id, "book-1");
  assert.equal(await restored[0].blob.text(), "%PDF-1.4\n");
  assert.throws(() => decodePdfBackupEntries([{id:"bad",data:"data:text/plain;base64,QQ=="}]), /PDF غير صالح/);
  assert.throws(() => decodePdfBackupEntries([{id:"bad",data:"data:application/pdf;base64,%%%"}]), /PDF غير صالح/);
});

test("automatic preparation colors match categories and escape user text", () => {
  const html = autoColorHtml("عنوان الدرس: المجهر\nالأهداف التعليمية\nملاحظة: راجع الوقت\nشرح المفهوم <script>");
  assert.match(html, /color:#1769aa/);
  assert.match(html, /color:#16834a/);
  assert.match(html, /color:#d32f2f/);
  assert.match(html, /color:#111111/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("bulk student import takes names from the first spreadsheet or CSV column", () => {
  assert.deepEqual(parseStudentNames("اسم الطالب\nسارة أحمد\n\nعلي حسن\t10\nنور,11"), [
    "سارة أحمد", "علي حسن", "نور",
  ]);
  assert.deepEqual(parseStudentNames('"اسم الطالب",الرقم\n"ليلى، أحمد",22\nمها;خامس'), ["ليلى، أحمد", "مها"]);
  assert.deepEqual(parseStudentNames("محمد\nمحمد"), ["محمد", "محمد"]);
});

test("home widget status follows configured lesson times and school days", () => {
  const periods = [["08:00", "08:40"], ["08:40", "09:20"], ["09:20", "10:00"]];
  assert.equal(getDailyWidgetStatus(periods, new Date(2026, 9, 14, 9, 40)).status, "الحصة 3 الآن");
  assert.match(getDailyWidgetStatus(periods, new Date(2026, 9, 14, 11, 0)).status, /انتهت حصصك اليوم/);
  assert.equal(getDailyWidgetStatus(periods, new Date(2026, 9, 16, 9, 0)).state, "holiday");
  assert.equal(getDailyWidgetStatus([], new Date(2026, 9, 14, 7, 0)).state, "unconfigured");
});
