import test from "node:test";
import assert from "node:assert/strict";
import { autoColorHtml, mergeSubjectOptions } from "../src/preparation-format.js";
import { decodePdfBackupEntries } from "../src/backup-format.js";

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
